<?php

namespace App\Providers;

use App\Repositories\AuditLogRepository;
use App\Repositories\AuditLogRepositoryInterface;
use App\Repositories\CustomerRepository;
use App\Repositories\CustomerRepositoryInterface;
use App\Repositories\PrintCategoryRepository;
use App\Repositories\PrintCategoryRepositoryInterface;
use App\Repositories\PrintItemRepository;
use App\Repositories\PrintItemRepositoryInterface;
use App\Repositories\ProductRepository;
use App\Repositories\ProductRepositoryInterface;
use App\Repositories\StaffPortalRepository;
use App\Repositories\StaffPortalRepositoryInterface;
use App\Repositories\StaffRepository;
use App\Repositories\StaffRepositoryInterface;
use App\Repositories\TaskRepository;
use App\Repositories\TaskRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(StaffPortalRepositoryInterface::class, StaffPortalRepository::class);
        $this->app->singleton(AuditLogRepositoryInterface::class, AuditLogRepository::class);
        $this->app->singleton(StaffRepositoryInterface::class, StaffRepository::class);
        $this->app->singleton(TaskRepositoryInterface::class, TaskRepository::class);
        $this->app->singleton(ProductRepositoryInterface::class, ProductRepository::class);
        $this->app->singleton(CustomerRepositoryInterface::class, CustomerRepository::class);
        $this->app->singleton(PrintCategoryRepositoryInterface::class, PrintCategoryRepository::class);
        $this->app->singleton(PrintItemRepositoryInterface::class, PrintItemRepository::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void {}
}
