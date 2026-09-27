<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Test User',
            'username' => 'testuser',
            'email' => 'test@example.com',
        ]);

        // Default admin login: username `admin`, password `admin`.
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Admin',
                'email' => 'admin@nuyda.local',
                'password' => 'admin',
                'email_verified_at' => now(),
            ],
        );

        $this->call([
            CustomerSeeder::class,
            PrintCategorySeeder::class,
            PrintItemSeeder::class,
            PromotionsSeeder::class,
        ]);
    }
}
