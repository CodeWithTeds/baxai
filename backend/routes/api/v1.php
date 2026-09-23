<?php

/**
 * API versioning -> for scalable future changes 
 */

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\GroqController;
use App\Http\Controllers\Api\ProductAiController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
        return $request->user();
    });
});

Route::apiResource('tasks', TaskController::class);

Route::post('products/ai-assist', [ProductAiController::class, 'assist']);
Route::apiResource('products', ProductController::class);
Route::post('products/bulk-activate', [ProductController::class, 'bulkActivate']);
Route::post('products/bulk-archive', [ProductController::class, 'bulkArchive']);
Route::post('products/bulk-destroy', [ProductController::class, 'bulkDestroy']);

Route::apiResource('customers', CustomerController::class);
Route::post('customers/bulk-activate', [CustomerController::class, 'bulkActivate']);
Route::post('customers/bulk-archive', [CustomerController::class, 'bulkArchive']);
Route::post('customers/bulk-destroy', [CustomerController::class, 'bulkDestroy']);

// ─── Groq AI proxy (no auth required — key is server-side only) ───────────────
Route::prefix('groq')->group(function () {
    Route::post('/transcribe', [GroqController::class, 'transcribe']);
    Route::post('/chat',       [GroqController::class, 'chat']);
    Route::post('/tts',        [GroqController::class, 'tts']);
});
