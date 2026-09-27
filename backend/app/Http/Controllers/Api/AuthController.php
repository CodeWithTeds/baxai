<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Customer;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        // Automatically sync to customers table
        Customer::firstOrCreate(
            ['email' => $user->email],
            [
                'name' => $user->name ?? explode('@', $user->email)[0],
                'customer_code' => 'CUST-' . strtoupper(substr(md5($user->email), 0, 6)),
                'status' => 'active',
                'type' => 'retail',
                'loyalty_points' => 100,
                'vip_tier' => 'Bronze',
            ]
        );

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->successResponse('User Registered Successfully', [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->validated())) {
            throw ValidationException::withMessages([
                'username' => 'Invalid credentials',
            ]);
        }

        try {
            $user = User::where('username', $request->username)->firstOrFail();
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'message' => 'User not found',
            ], 404);
        }

        // Sync to customers table
        if ($user->email) {
            Customer::firstOrCreate(
                ['email' => $user->email],
                [
                    'name' => $user->name ?? $user->username,
                    'customer_code' => 'CUST-' . strtoupper(substr(md5($user->email), 0, 6)),
                    'status' => 'active',
                    'type' => 'retail',
                    'loyalty_points' => 100,
                    'vip_tier' => 'Bronze',
                ]
            );
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->successResponse('User Logged In Successfully', [
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ]);
    }

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
                'customer_code' => 'CUST-' . strtoupper(substr(md5($email), 0, 6)),
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

        return $this->successResponse('Customer synced successfully to database', [
            'customer' => $customer,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return $this->successResponse('Successfully logged out', null);
    }
}
