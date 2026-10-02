<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class EmailVerificationCode extends Model
{
    protected $fillable = [
        'email',
        'code',
        'type',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    /**
     * Generate a new 4-digit verification code.
     */
    public static function generate(string $email, string $type = 'email_verification', int $expiryMinutes = 10): self
    {
        $cleanEmail = strtolower(trim($email));

        // Delete any existing codes of this type for this email
        static::where('email', $cleanEmail)
            ->where('type', $type)
            ->delete();

        // 4-digit random number (1000 - 9999)
        $code = (string) random_int(1000, 9999);

        return static::create([
            'email' => $cleanEmail,
            'code' => $code,
            'type' => $type,
            'expires_at' => Carbon::now()->addMinutes($expiryMinutes),
        ]);
    }

    /**
     * Verify a code for given email and type.
     *
     * @return array{valid: bool, reason?: string, message: string, record?: self}
     */
    public static function verify(string $email, string $code, string $type = 'email_verification'): array
    {
        $cleanEmail = strtolower(trim($email));
        $cleanCode = trim((string) $code);

        $record = static::where('email', $cleanEmail)
            ->where('type', $type)
            ->latest('id')
            ->first();

        if (! $record) {
            return [
                'valid' => false,
                'reason' => 'invalid',
                'message' => 'No verification code found. Please request a new code.',
            ];
        }

        if ($record->expires_at->isPast()) {
            $record->delete();

            return [
                'valid' => false,
                'reason' => 'expired',
                'message' => 'Verification code has expired. Please request a new code.',
            ];
        }

        if ($record->code !== $cleanCode) {
            return [
                'valid' => false,
                'reason' => 'invalid',
                'message' => 'Incorrect 4-digit code. Please check and try again.',
            ];
        }

        return [
            'valid' => true,
            'message' => 'Code verified successfully.',
            'record' => $record,
        ];
    }
}
