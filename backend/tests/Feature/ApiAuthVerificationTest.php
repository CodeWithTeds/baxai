<?php

namespace Tests\Feature;

use App\Mail\VerificationCodeMail;
use App\Models\EmailVerificationCode;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ApiAuthVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_validation_fails_with_invalid_inputs(): void
    {
        // Missing all required fields
        $response = $this->postJson('/api/v1/register', []);
        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonStructure([
                'data' => ['username', 'email', 'password'],
            ]);

        // Password confirmation mismatch & short password & short username
        $response = $this->postJson('/api/v1/register', [
            'username' => 'ab',
            'email' => 'invalid-email',
            'password' => '123',
            'password_confirmation' => '456',
        ]);
        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonStructure([
                'data' => ['username', 'email', 'password'],
            ]);
    }

    public function test_registration_without_name_defaults_to_username(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/register', [
            'username' => 'mariadelacruz',
            'email' => 'maria@example.com',
            'password' => 'SecretPassword123',
            'password_confirmation' => 'SecretPassword123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'needs_verification' => true,
                    'email' => 'maria@example.com',
                ],
            ]);

        $user = User::where('email', 'maria@example.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('mariadelacruz', $user->name);
        $this->assertEquals('mariadelacruz', $user->username);
    }

    public function test_successful_registration_creates_unverified_user_and_sends_4_digit_code(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/v1/register', [
            'name' => 'Juan Dela Cruz',
            'username' => 'juandc',
            'email' => 'juan@example.com',
            'password' => 'SecretPassword123',
            'password_confirmation' => 'SecretPassword123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'needs_verification' => true,
                    'email' => 'juan@example.com',
                ],
            ]);

        $user = User::where('email', 'juan@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNull($user->email_verified_at);

        // Check 4-digit code in DB
        $code = EmailVerificationCode::where('email', 'juan@example.com')
            ->where('type', 'email_verification')
            ->first();
        $this->assertNotNull($code);
        $this->assertEquals(4, strlen($code->code));

        // Assert mail was sent
        Mail::assertSent(VerificationCodeMail::class, function ($mail) use ($code) {
            return $mail->hasTo('juan@example.com') && $mail->code === $code->code;
        });
    }

    public function test_login_with_unverified_email_returns_403_and_needs_verification(): void
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Unverified User',
            'username' => 'unverified1',
            'email' => 'unverified@example.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => null,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'identifier' => 'unverified@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'needs_verification' => true,
                'email' => 'unverified@example.com',
            ]);

        Mail::assertSent(VerificationCodeMail::class);
    }

    public function test_verify_email_with_invalid_code_fails(): void
    {
        User::create([
            'name' => 'Test User',
            'username' => 'testuser',
            'email' => 'test@example.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => null,
        ]);

        EmailVerificationCode::create([
            'email' => 'test@example.com',
            'code' => '1234',
            'type' => 'email_verification',
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        $response = $this->postJson('/api/v1/auth/verify-email', [
            'email' => 'test@example.com',
            'code' => '9999', // wrong code
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    public function test_verify_email_with_expired_code_fails(): void
    {
        User::create([
            'name' => 'Test User',
            'username' => 'testuser2',
            'email' => 'test2@example.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => null,
        ]);

        EmailVerificationCode::create([
            'email' => 'test2@example.com',
            'code' => '1234',
            'type' => 'email_verification',
            'expires_at' => Carbon::now()->subMinutes(5), // expired
        ]);

        $response = $this->postJson('/api/v1/auth/verify-email', [
            'email' => 'test2@example.com',
            'code' => '1234',
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'reason' => 'expired',
            ]);
    }

    public function test_verify_email_with_correct_code_succeeds_and_issues_token(): void
    {
        $user = User::create([
            'name' => 'Test User',
            'username' => 'testuser3',
            'email' => 'test3@example.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => null,
        ]);

        EmailVerificationCode::create([
            'email' => 'test3@example.com',
            'code' => '4829',
            'type' => 'email_verification',
            'expires_at' => Carbon::now()->addMinutes(10),
        ]);

        $response = $this->postJson('/api/v1/auth/verify-email', [
            'email' => 'test3@example.com',
            'code' => '4829',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'access_token',
                    'token_type',
                    'user',
                ],
            ]);

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);

        // Verification code consumed
        $this->assertDatabaseMissing('email_verification_codes', [
            'email' => 'test3@example.com',
            'code' => '4829',
        ]);
    }

    public function test_login_with_verified_user_succeeds_with_both_username_and_email(): void
    {
        User::create([
            'name' => 'Verified User',
            'username' => 'verifieduser',
            'email' => 'verified@example.com',
            'password' => Hash::make('mypassword123'),
            'email_verified_at' => Carbon::now(),
        ]);

        // Login with username
        $res1 = $this->postJson('/api/v1/login', [
            'identifier' => 'verifieduser',
            'password' => 'mypassword123',
        ]);
        $res1->assertStatus(200)
            ->assertJsonStructure(['data' => ['access_token', 'user']]);

        // Login with email
        $res2 = $this->postJson('/api/v1/login', [
            'identifier' => 'verified@example.com',
            'password' => 'mypassword123',
        ]);
        $res2->assertStatus(200)
            ->assertJsonStructure(['data' => ['access_token', 'user']]);
    }

    public function test_resend_code_enforces_cooldown(): void
    {
        Mail::fake();

        User::create([
            'name' => 'Cooldown User',
            'username' => 'cooluser',
            'email' => 'cooldown@example.com',
            'password' => Hash::make('password123'),
            'email_verified_at' => null,
        ]);

        // Initial send
        $res1 = $this->postJson('/api/v1/auth/resend-code', [
            'email' => 'cooldown@example.com',
            'type' => 'email_verification',
        ]);
        $res1->assertStatus(200);

        // Immediate second attempt triggers 429
        $res2 = $this->postJson('/api/v1/auth/resend-code', [
            'email' => 'cooldown@example.com',
            'type' => 'email_verification',
        ]);
        $res2->assertStatus(429);
    }

    public function test_forgot_password_flow_and_reset(): void
    {
        Mail::fake();

        $user = User::create([
            'name' => 'Reset User',
            'username' => 'resetuser',
            'email' => 'reset@example.com',
            'password' => Hash::make('oldpassword123'),
            'email_verified_at' => Carbon::now(),
        ]);

        // 1. Request reset code
        $resForgot = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'reset@example.com',
        ]);
        $resForgot->assertStatus(200);

        $codeRecord = EmailVerificationCode::where('email', 'reset@example.com')
            ->where('type', 'password_reset')
            ->first();
        $this->assertNotNull($codeRecord);

        // 2. Verify code
        $resVerify = $this->postJson('/api/v1/auth/verify-reset-code', [
            'email' => 'reset@example.com',
            'code' => $codeRecord->code,
        ]);
        $resVerify->assertStatus(200)
            ->assertJsonFragment(['valid' => true]);

        // 3. Reset password
        $resReset = $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'reset@example.com',
            'code' => $codeRecord->code,
            'password' => 'NewStrongPassword123',
            'password_confirmation' => 'NewStrongPassword123',
        ]);
        $resReset->assertStatus(200);

        // 4. Verify user can log in with new password
        $resLogin = $this->postJson('/api/v1/login', [
            'identifier' => 'reset@example.com',
            'password' => 'NewStrongPassword123',
        ]);
        $resLogin->assertStatus(200)
            ->assertJsonStructure(['data' => ['access_token']]);
    }
}
