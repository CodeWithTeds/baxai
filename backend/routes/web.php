<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DiscountController;
use App\Http\Controllers\PrintCategoryController;
use App\Http\Controllers\PrintItemController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\RewardController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PrintItemAiController;
use Inertia\Inertia;

use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::get('models/{file}', function ($file) {
    $path = public_path('models/' . $file);
    if (!file_exists($path)) {
        abort(404);
    }
    return response()->file($path, [
        'Access-Control-Allow-Origin' => '*',
        'Access-Control-Allow-Methods' => 'GET, OPTIONS',
        'Access-Control-Allow-Headers' => 'Origin, X-Requested-With, Content-Type, Accept',
        'Content-Type' => 'model/gltf-binary',
    ]);
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Web bulk actions
    Route::post('products/bulk-activate', [ProductController::class, 'bulkActivate'])->name('products.bulk-activate');
    Route::post('products/bulk-archive', [ProductController::class, 'bulkArchive'])->name('products.bulk-archive');
    Route::post('products/bulk-destroy', [ProductController::class, 'bulkDestroy'])->name('products.bulk-destroy');
    Route::resource('products', ProductController::class);

    Route::post('customers/bulk-activate', [CustomerController::class, 'bulkActivate'])->name('customers.bulk-activate');
    Route::post('customers/bulk-archive', [CustomerController::class, 'bulkArchive'])->name('customers.bulk-archive');
    Route::post('customers/bulk-destroy', [CustomerController::class, 'bulkDestroy'])->name('customers.bulk-destroy');
    Route::resource('customers', CustomerController::class);

    Route::post('print-items/ai-recognize', [PrintItemAiController::class, 'recognize'])->name('print-items.ai-recognize');
    Route::post('print-items/bulk-activate', [PrintItemController::class, 'bulkActivate'])->name('print-items.bulk-activate');
    Route::post('print-items/bulk-archive', [PrintItemController::class, 'bulkArchive'])->name('print-items.bulk-archive');
    Route::post('print-items/bulk-destroy', [PrintItemController::class, 'bulkDestroy'])->name('print-items.bulk-destroy');
    Route::resource('print-items', PrintItemController::class);
    Route::resource('print-categories', PrintCategoryController::class);

    // Discounts & Coupons
    Route::post('discounts/calculate', [DiscountController::class, 'calculate'])->name('discounts.calculate');
    Route::post('discounts/bulk-activate', [DiscountController::class, 'bulkActivate'])->name('discounts.bulk-activate');
    Route::post('discounts/bulk-archive', [DiscountController::class, 'bulkArchive'])->name('discounts.bulk-archive');
    Route::post('discounts/bulk-destroy', [DiscountController::class, 'bulkDestroy'])->name('discounts.bulk-destroy');
    Route::resource('discounts', DiscountController::class);

    // VIP & Rewards
    Route::get('rewards', [RewardController::class, 'index'])->name('rewards.index');
    Route::post('rewards/perks', [RewardController::class, 'storeReward'])->name('rewards.store-perk');
    Route::put('rewards/perks/{reward}', [RewardController::class, 'updateReward'])->name('rewards.update-perk');
    Route::delete('rewards/perks/{reward}', [RewardController::class, 'destroyReward'])->name('rewards.destroy-perk');
    Route::post('rewards/adjust-points', [RewardController::class, 'adjustPoints'])->name('rewards.adjust-points');
    Route::post('rewards/issue', [RewardController::class, 'issueReward'])->name('rewards.issue');
    Route::put('rewards/vip-tiers/{vipTier}', [RewardController::class, 'updateVipTier'])->name('rewards.update-vip-tier');

    Route::get('design-studio/{type?}', fn (string $type = 'mug') => Inertia::render('design-studio/show', [
        'initialType' => $type,
    ]))->name('design-studio');
});

require __DIR__.'/settings.php';
