<?php

use App\Http\Controllers\CustomerController;
use App\Http\Controllers\PrintCategoryController;
use App\Http\Controllers\PrintItemController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    // Web bulk actions (Inertia-compatible redirects — the /api/v1/* twins are
    // token-auth JSON endpoints and must not be called via Inertia).
    Route::post('products/bulk-activate', [ProductController::class, 'bulkActivate'])->name('products.bulk-activate');
    Route::post('products/bulk-archive', [ProductController::class, 'bulkArchive'])->name('products.bulk-archive');
    Route::post('products/bulk-destroy', [ProductController::class, 'bulkDestroy'])->name('products.bulk-destroy');
    Route::resource('products', ProductController::class);

    Route::post('customers/bulk-activate', [CustomerController::class, 'bulkActivate'])->name('customers.bulk-activate');
    Route::post('customers/bulk-archive', [CustomerController::class, 'bulkArchive'])->name('customers.bulk-archive');
    Route::post('customers/bulk-destroy', [CustomerController::class, 'bulkDestroy'])->name('customers.bulk-destroy');
    Route::resource('customers', CustomerController::class);

    Route::post('print-items/bulk-activate', [PrintItemController::class, 'bulkActivate'])->name('print-items.bulk-activate');
    Route::post('print-items/bulk-archive', [PrintItemController::class, 'bulkArchive'])->name('print-items.bulk-archive');
    Route::post('print-items/bulk-destroy', [PrintItemController::class, 'bulkDestroy'])->name('print-items.bulk-destroy');
    Route::resource('print-items', PrintItemController::class);
    Route::resource('print-categories', PrintCategoryController::class);

    Route::get('design-studio/{type?}', fn (string $type = 'mug') => Inertia::render('design-studio/show', [
        'initialType' => $type,
    ]))->name('design-studio');
});

require __DIR__.'/settings.php';
