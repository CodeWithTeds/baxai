<?php

namespace Database\Seeders;

use App\Models\Customer;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $customers = [
            [
                'name' => 'Maria Santos',
                'customer_code' => 'CUST-MARIA-8A12',
                'email' => 'maria.santos@example.com',
                'phone' => '09171234567',
                'company' => 'Santos Cafe & Bakery',
                'status' => 'active',
                'type' => 'business',
                'notes' => 'Frequent bulk buyer of printed ceramic mugs and custom coasters.',
                'address' => '123 Rizal Avenue, Brgy. Poblacion',
                'city' => 'Makati City',
                'state' => 'Metro Manila',
                'postal_code' => '1200',
                'country' => 'Philippines',
                'total_orders' => 14,
                'total_spent' => 24850.00,
                'sort_order' => 1,
            ],
            [
                'name' => 'Juan Dela Cruz',
                'customer_code' => 'VIP-JUAN-33F9',
                'email' => 'juan.delacruz@example.com',
                'phone' => '09189876543',
                'company' => 'Dela Cruz Tech Solutions',
                'status' => 'active',
                'type' => 'vip',
                'notes' => 'VIP corporate client with custom t-shirt uniform orders every quarter.',
                'address' => '456 Ortigas Center, Julia Vargas Ave',
                'city' => 'Pasig City',
                'state' => 'Metro Manila',
                'postal_code' => '1605',
                'country' => 'Philippines',
                'total_orders' => 28,
                'total_spent' => 89400.00,
                'sort_order' => 2,
            ],
            [
                'name' => 'Angela Reyes',
                'customer_code' => 'CUST-ANGELA-1B90',
                'email' => 'angela.reyes@example.com',
                'phone' => '09205551234',
                'company' => null,
                'status' => 'active',
                'type' => 'individual',
                'notes' => 'Personal order client for personalized mugs and tote bags.',
                'address' => '789 Katipunan Ave, Diliman',
                'city' => 'Quezon City',
                'state' => 'Metro Manila',
                'postal_code' => '1108',
                'country' => 'Philippines',
                'total_orders' => 3,
                'total_spent' => 3200.00,
                'sort_order' => 3,
            ],
            [
                'name' => 'Apex Wholesale Corp.',
                'customer_code' => 'WHL-APEX-77D2',
                'email' => 'procurement@apexwholesale.ph',
                'phone' => '09288881234',
                'company' => 'Apex Wholesale Corp.',
                'status' => 'active',
                'type' => 'wholesale',
                'notes' => 'Wholesale distributor for custom promotional pins and stickers.',
                'address' => '101 Industrial Zone, South Superhighway',
                'city' => 'Biñan City',
                'state' => 'Laguna',
                'postal_code' => '4024',
                'country' => 'Philippines',
                'total_orders' => 42,
                'total_spent' => 175000.00,
                'sort_order' => 4,
            ],
            [
                'name' => 'Gabriel Tan',
                'customer_code' => 'CUST-GABRIEL-99C1',
                'email' => 'gabriel.tan@example.com',
                'phone' => '09194448899',
                'company' => 'Studio 9 Design',
                'status' => 'lead',
                'type' => 'individual',
                'notes' => 'Inquired about bulk custom printing for upcoming design exhibition.',
                'address' => '32 Bonifacio High Street',
                'city' => 'Taguig City',
                'state' => 'Metro Manila',
                'postal_code' => '1634',
                'country' => 'Philippines',
                'total_orders' => 0,
                'total_spent' => 0.00,
                'sort_order' => 5,
            ],
            [
                'name' => 'Patricia Lim',
                'customer_code' => 'BIZ-PATRICIA-44E8',
                'email' => 'patricia@limmerch.com',
                'phone' => '09178882233',
                'company' => 'Lim Merchandise Co.',
                'status' => 'inactive',
                'type' => 'business',
                'notes' => 'Account inactive since last year.',
                'address' => '55 Session Road',
                'city' => 'Baguio City',
                'state' => 'Benguet',
                'postal_code' => '2600',
                'country' => 'Philippines',
                'total_orders' => 5,
                'total_spent' => 12500.00,
                'sort_order' => 6,
            ],
        ];

        foreach ($customers as $data) {
            Customer::updateOrCreate(
                ['email' => $data['email']],
                $data
            );
        }
    }
}
