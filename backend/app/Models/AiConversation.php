<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiConversation extends Model
{
    use HasFactory;

    protected $table = 'ai_conversations';

    protected $fillable = [
        'conversation_id',
        'user_email',
        'is_verified',
        'stage_user_verified',
        'stage_data_verified',
        'stage_security_verified',
        'verified_at',
        'ip_address',
        'user_agent',
        'metadata',
    ];

    protected $casts = [
        'is_verified'             => 'boolean',
        'stage_user_verified'     => 'boolean',
        'stage_data_verified'     => 'boolean',
        'stage_security_verified' => 'boolean',
        'verified_at'             => 'datetime',
        'metadata'                => 'array',
    ];
}
