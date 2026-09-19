<?php

use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::resource('products', ProductController::class);
    Route::get('design-studio/{type?}', fn (string $type = 'mug') => Inertia::render('design-studio/show', [
        'initialType' => $type,
    ]))->name('design-studio');
});

require __DIR__ . '/settings.php';
