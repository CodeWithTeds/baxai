<?php

/**
 * API versioning -> for scalable future changes
 */

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CustomerAddressController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\DiscountController as ApiDiscountController;
use App\Http\Controllers\Api\GroqController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PrintCategoryController;
use App\Http\Controllers\Api\PrintItemAiController;
use App\Http\Controllers\Api\PrintItemController;
use App\Http\Controllers\Api\ProductAiController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PsgcController;
use App\Http\Controllers\Api\RewardController as ApiRewardController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);
Route::post('/sync-customer', [AuthController::class, 'syncCustomer']);

// Email verification & password reset endpoints
Route::prefix('auth')->group(function () {
    Route::post('/verify-email', [AuthController::class, 'verifyEmail']);
    Route::post('/resend-code', [AuthController::class, 'resendCode']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/verify-reset-code', [AuthController::class, 'verifyResetCode']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::get('/models/{file}', function ($file) {
    $path = public_path('models/'.$file);
    if (! file_exists($path)) {
        abort(404);
    }

    return response()->file($path, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, OPTIONS',
        'Access-Control-Allow-Headers' => 'Origin, X-Requested-With, Content-Type, Accept',
        'Content-Type' => 'model/gltf-binary',
    ]);
});

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

Route::post('print-items/ai-recognize', [PrintItemAiController::class, 'recognize']);
Route::apiResource('print-items', PrintItemController::class);
Route::apiResource('print-categories', PrintCategoryController::class);

// PSGC Geographic Data API (Philippine Hierarchy: Region -> Province -> City -> Barangay)
Route::prefix('psgc')->group(function () {
    Route::get('regions', [PsgcController::class, 'regions']);
    Route::get('provinces', [PsgcController::class, 'provinces']);
    Route::get('cities', [PsgcController::class, 'cities']);
    Route::get('barangays', [PsgcController::class, 'barangays']);
});

// Customer Delivery Address API
Route::get('customer/address', [CustomerAddressController::class, 'getAddress']);
Route::post('customer/address', [CustomerAddressController::class, 'saveAddress']);

// Orders API
Route::apiResource('orders', OrderController::class);
Route::post('orders/{id}/status', [OrderController::class, 'updateStatus']);

// Discounts & Coupons API
Route::get('discounts', [ApiDiscountController::class, 'index']);
Route::post('discounts/validate', [ApiDiscountController::class, 'validateCode']);

// VIP & Rewards API
Route::get('rewards/catalog', [ApiRewardController::class, 'catalog']);
Route::get('rewards/vip-tiers', [ApiRewardController::class, 'vipTiers']);
Route::get('rewards/customer/{customerId}', [ApiRewardController::class, 'customerPoints']);

// ─── Groq AI proxy (no auth required — key is server-side only) ───────────────
Route::prefix('groq')->group(function () {
    Route::post('/transcribe', [GroqController::class, 'transcribe']);
    Route::post('/chat', [GroqController::class, 'chat']);
    Route::post('/tts', [GroqController::class, 'tts']);
    Route::post('/conversation/verify-stage', [GroqController::class, 'verifyStage']);
    Route::get('/conversation/{conversation_id}/status', [GroqController::class, 'conversationStatus']);
});
