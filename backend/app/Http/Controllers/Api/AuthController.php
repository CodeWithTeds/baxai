<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Mail\VerificationCodeMail;
use App\Models\Customer;
use App\Models\EmailVerificationCode;
use App\Models\User;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Register a new user and dispatch a 4-digit verification code.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => trim($validated['name']),
            'username' => trim($validated['username']),
            'email' => strtolower(trim($validated['email'])),
            'password' => Hash::make($validated['password']),
            'email_verified_at' => null,
        ]);

        // Generate 4-digit verification code (valid for 10 minutes)
        $codeRecord = EmailVerificationCode::generate($user->email, 'email_verification', 10);

        // Send email with 4-digit code
        try {
            Mail::to($user->email)->send(new VerificationCodeMail($codeRecord->code, 'email_verification', $user->name));
        } catch (\Throwable $e) {
            Log::error('Failed to send verification email during registration: '.$e->getMessage());
        }

        return $this->successResponse([
            'needs_verification' => true,
            'email' => $user->email,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
            ],
        ], 'Registration successful! Please check your email for the 4-digit verification code.', 201);
    }

    /**
     * Verify email with 4-digit code and issue access token.
     */
    public function verifyEmail(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:4',
        ], [
            'code.required' => 'Please enter the 4-digit verification code.',
            'code.size' => 'Verification code must be exactly 4 digits.',
        ]);

        $email = strtolower(trim($validated['email']));
        $code = trim($validated['code']);

        $user = User::where('email', $email)->first();
        if (! $user) {
            return $this->errorResponse('Account not found for this email address.', 404);
        }

        // Verify the 4-digit code
        $result = EmailVerificationCode::verify($email, $code, 'email_verification');
        if (! $result['valid']) {
            return $this->errorResponse($result['message'], 422, [
                'reason' => $result['reason'] ?? 'invalid',
            ]);
        }

        // Mark user as verified
        $user->forceFill([
            'email_verified_at' => Carbon::now(),
        ])->save();

        // Consume (delete) the verification code
        if (isset($result['record'])) {
            $result['record']->delete();
        }

        // Automatically sync to customers table
        Customer::firstOrCreate(
            ['email' => $user->email],
            [
                'name' => $user->name ?? explode('@', $user->email)[0],
                'customer_code' => 'CUST-'.strtoupper(substr(md5($user->email), 0, 6)),
                'status' => 'active',
                'type' => 'retail',
                'loyalty_points' => 100,
                'vip_tier' => 'Bronze',
            ]
        );

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->successResponse([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 'Email verified successfully! Welcome to NUYDA.');
    }

    /**
     * Resend verification or reset code with rate limiting cooldown.
     */
    public function resendCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'type' => 'required|string|in:email_verification,password_reset',
        ]);

        $email = strtolower(trim($validated['email']));
        $type = $validated['type'];

        $user = User::where('email', $email)->first();
        if (! $user) {
            return $this->errorResponse('Account not found for this email address.', 404);
        }

        // Cooldown check: 60 seconds
        $lastCode = EmailVerificationCode::where('email', $email)
            ->where('type', $type)
            ->latest('id')
            ->first();

        if ($lastCode && $lastCode->created_at->diffInSeconds(Carbon::now()) < 60) {
            $remaining = 60 - $lastCode->created_at->diffInSeconds(Carbon::now());

            return $this->errorResponse("Please wait {$remaining} seconds before requesting a new code.", 429, [
                'cooldown_remaining' => $remaining,
            ]);
        }

        // Generate a new 4-digit code
        $newCode = EmailVerificationCode::generate($email, $type, 10);

        try {
            Mail::to($email)->send(new VerificationCodeMail($newCode->code, $type, $user->name));
        } catch (\Throwable $e) {
            Log::error("Failed to resend code to {$email}: ".$e->getMessage());

            return $this->errorResponse('Failed to send verification email. Please try again.', 500);
        }

        return $this->successResponse(null, 'A fresh 4-digit verification code has been sent to your email.');
    }

    /**
     * User Login supporting both Username & Email.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $identifier = trim($request->input('identifier') ?? $request->input('username') ?? $request->input('email') ?? '');
        $password = $request->input('password');

        // Look up by username or email
        $user = User::where('username', $identifier)
            ->orWhere('email', strtolower($identifier))
            ->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'username' => 'Invalid email/username or password. Please try again.',
            ]);
        }

        // Check if email is verified
        if (is_null($user->email_verified_at)) {
            // Automatically generate and dispatch a fresh verification code
            $codeRecord = EmailVerificationCode::generate($user->email, 'email_verification', 10);

            try {
                Mail::to($user->email)->send(new VerificationCodeMail($codeRecord->code, 'email_verification', $user->name));
            } catch (\Throwable $e) {
                Log::error('Failed to send verification email during login: '.$e->getMessage());
            }

            return response()->json([
                'status' => 'unverified',
                'message' => 'Your email address is not yet verified. A 4-digit verification code has been sent to your email.',
                'needs_verification' => true,
                'email' => $user->email,
            ], 403);
        }

        // Sync to customers table
        if ($user->email) {
            Customer::firstOrCreate(
                ['email' => $user->email],
                [
                    'name' => $user->name ?? $user->username,
                    'customer_code' => 'CUST-'.strtoupper(substr(md5($user->email), 0, 6)),
                    'status' => 'active',
                    'type' => 'retail',
                    'loyalty_points' => 100,
                    'vip_tier' => 'Bronze',
                ]
            );
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->successResponse([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 'Welcome back! Logged in successfully.');
    }

    /**
     * Send password reset 4-digit code.
     */
    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
        ], [
            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
        ]);

        $email = strtolower(trim($validated['email']));

        $user = User::where('email', $email)->first();
        if (! $user) {
            return $this->errorResponse('No account registered with this email address.', 404);
        }

        // Cooldown check: 60 seconds
        $lastCode = EmailVerificationCode::where('email', $email)
            ->where('type', 'password_reset')
            ->latest('id')
            ->first();

        if ($lastCode && $lastCode->created_at->diffInSeconds(Carbon::now()) < 60) {
            $remaining = 60 - $lastCode->created_at->diffInSeconds(Carbon::now());

            return $this->errorResponse("Please wait {$remaining} seconds before requesting another reset code.", 429, [
                'cooldown_remaining' => $remaining,
            ]);
        }

        $codeRecord = EmailVerificationCode::generate($email, 'password_reset', 10);

        try {
            Mail::to($email)->send(new VerificationCodeMail($codeRecord->code, 'password_reset', $user->name));
        } catch (\Throwable $e) {
            Log::error('Failed to send password reset email: '.$e->getMessage());

            return $this->errorResponse('Failed to send password reset email. Please try again.', 500);
        }

        return $this->successResponse([
            'email' => $email,
        ], 'A 4-digit password reset code has been sent to your email.');
    }

    /**
     * Verify password reset code before allowing new password input.
     */
    public function verifyResetCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:4',
        ], [
            'code.required' => 'Please enter the 4-digit code.',
            'code.size' => 'Verification code must be exactly 4 digits.',
        ]);

        $email = strtolower(trim($validated['email']));
        $code = trim($validated['code']);

        $result = EmailVerificationCode::verify($email, $code, 'password_reset');
        if (! $result['valid']) {
            return $this->errorResponse($result['message'], 422, [
                'reason' => $result['reason'] ?? 'invalid',
            ]);
        }

        return $this->successResponse([
            'valid' => true,
        ], 'Reset code verified successfully.');
    }

    /**
     * Reset password using the verified 4-digit code.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'code' => 'required|string|size:4',
            'password' => 'required|string|min:8|confirmed',
        ], [
            'password.required' => 'Please enter a new password.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
        ]);

        $email = strtolower(trim($validated['email']));
        $code = trim($validated['code']);
        $password = $validated['password'];

        $user = User::where('email', $email)->first();
        if (! $user) {
            return $this->errorResponse('Account not found.', 404);
        }

        // Verify the code
        $result = EmailVerificationCode::verify($email, $code, 'password_reset');
        if (! $result['valid']) {
            return $this->errorResponse($result['message'], 422, [
                'reason' => $result['reason'] ?? 'invalid',
            ]);
        }

        // Update password and ensure email is marked verified
        $user->forceFill([
            'password' => Hash::make($password),
            'email_verified_at' => $user->email_verified_at ?? Carbon::now(),
        ])->save();

        // Consume the code
        if (isset($result['record'])) {
            $result['record']->delete();
        }

        // Revoke all previous tokens for security
        $user->tokens()->delete();

        return $this->successResponse(null, 'Password reset successfully! You can now log in with your new password.');
    }

    /**
     * Sync customer info.
     */
    public function syncCustomer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string',
            'name' => 'nullable|string',
            'avatar' => 'nullable|string',
        ]);

        $email = trim($validated['email']);
        $name = $validated['name'] ?? explode('@', $email)[0];
        $avatar = $validated['avatar'] ?? null;

        $customer = Customer::firstOrCreate(
            ['email' => $email],
            [
                'name' => ucwords($name),
                'customer_code' => 'CUST-'.strtoupper(substr(md5($email), 0, 6)),
                'status' => 'active',
                'type' => 'retail',
                'avatar' => $avatar,
                'loyalty_points' => 100,
                'vip_tier' => 'Bronze',
            ]
        );

        if ($avatar && ! $customer->avatar) {
            $customer->update(['avatar' => $avatar]);
        }

        return $this->successResponse([
            'customer' => $customer,
        ], 'Customer synced successfully to database');
    }

    /**
     * Logout and revoke current token.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return $this->successResponse(null, 'Successfully logged out');
    }
}
