<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use Database\Seeders\PsgcEnhancementSeeder;
use Database\Seeders\PSGCSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Schoolees\Psgc\Models\Region;
use Tests\TestCase;

class PhilippineAddressOrderFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        if (Region::count() === 0) {
            $this->seed(PSGCSeeder::class);
            $this->seed(PsgcEnhancementSeeder::class);
        }
    }

    public function test_psgc_regions_endpoint_returns_data(): void
    {
        $response = $this->getJson('/api/v1/psgc/regions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['code', 'name'],
                ],
            ]);

        $this->assertGreaterThanOrEqual(17, count($response->json('data')));
    }

    public function test_psgc_provinces_endpoint_requires_region_code(): void
    {
        $response = $this->getJson('/api/v1/psgc/provinces');
        $response->assertStatus(422);

        // NCR
        $ncrResponse = $this->getJson('/api/v1/psgc/provinces?region_code=1300000000');
        $ncrResponse->assertStatus(200);
        $this->assertTrue(collect($ncrResponse->json('data'))->contains('name', 'Metro Manila'));

        // Region IV-A (CALABARZON)
        $calabarzonResponse = $this->getJson('/api/v1/psgc/provinces?region_code=0400000000');
        $calabarzonResponse->assertStatus(200);
        $this->assertTrue(collect($calabarzonResponse->json('data'))->contains('name', 'Cavite'));
    }

    public function test_psgc_cities_and_barangays_endpoints(): void
    {
        // Fetch cities in Metro Manila
        $citiesResponse = $this->getJson('/api/v1/psgc/cities?province_code=1300000000');
        $citiesResponse->assertStatus(200);
        $this->assertTrue(collect($citiesResponse->json('data'))->contains('name', 'City of Manila'));

        // Fetch barangays in City of Manila (code: 1380600000)
        $barangaysResponse = $this->getJson('/api/v1/psgc/barangays?city_code=1380600000');
        $barangaysResponse->assertStatus(200);
        $this->assertNotEmpty($barangaysResponse->json('data'));
    }

    public function test_order_creation_is_rejected_when_customer_has_no_address(): void
    {
        $customer = Customer::create([
            'name' => 'Maria Clara',
            'customer_code' => 'CUST-TEST01',
            'email' => 'maria.clara@example.com',
            'status' => 'active',
            'type' => 'retail',
        ]);

        $payload = [
            'customer_id' => $customer->id,
            'customer_email' => $customer->email,
            'customer_name' => $customer->name,
            'items' => [
                [
                    'name' => 'Classic Coffee Mug',
                    'unit_price' => 150.00,
                    'quantity' => 2,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/orders', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'error_code' => 'ADDRESS_REQUIRED',
                'action' => 'redirect_to_address_form',
            ]);
    }

    public function test_order_creation_is_rejected_when_address_is_incomplete(): void
    {
        $customer = Customer::create([
            'name' => 'Crisostomo Ibarra',
            'customer_code' => 'CUST-TEST02',
            'email' => 'ibarra@example.com',
            'status' => 'active',
            'type' => 'retail',
        ]);

        // Incomplete address: missing street and barangay
        CustomerAddress::create([
            'customer_id' => $customer->id,
            'is_default' => true,
            'recipient_name' => 'Crisostomo Ibarra',
            'phone_number' => '09171234567',
            'region_code' => '1300000000',
            'region_name' => 'National Capital Region (NCR)',
            'province_code' => '1300000000',
            'province_name' => 'Metro Manila',
            'city_code' => '1380600000',
            'city_name' => 'City of Manila',
            'barangay_code' => '', // Missing!
            'barangay_name' => '',
            'street_address' => '', // Missing!
        ]);

        $payload = [
            'customer_id' => $customer->id,
            'customer_email' => $customer->email,
            'items' => [
                [
                    'name' => 'Canvas Tote Bag',
                    'unit_price' => 250.00,
                    'quantity' => 1,
                ],
            ],
        ];

        $response = $this->postJson('/api/v1/orders', $payload);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'error_code' => 'ADDRESS_INCOMPLETE',
                'action' => 'redirect_to_address_form',
            ]);
    }

    public function test_customer_can_save_address_and_successfully_place_order(): void
    {
        $email = 'elias@example.com';

        // 1. Customer saves address via API
        $addressPayload = [
            'email' => $email,
            'recipient_name' => 'Elias Driver',
            'phone_number' => '09189876543',
            'region_code' => '0400000000',
            'region_name' => 'Region IV-A (CALABARZON)',
            'province_code' => '0402100000',
            'province_name' => 'Cavite',
            'city_code' => '0402103000',
            'city_name' => 'City of Bacoor',
            'barangay_code' => '0402103076',
            'barangay_name' => 'Aniban 1',
            'street_address' => 'Block 4 Lot 12 Dahlia St., Villa de Bacoor',
            'postal_code' => '4102',
            'delivery_instructions' => 'Near clubhouse guard house',
        ];

        $saveAddressResponse = $this->postJson('/api/v1/customer/address', $addressPayload);

        $saveAddressResponse->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'has_complete_address' => true,
            ]);

        $savedAddressId = $saveAddressResponse->json('address.id');
        $this->assertNotNull($savedAddressId);

        // 2. Fetch customer address
        $getAddressResponse = $this->getJson("/api/v1/customer/address?email={$email}");
        $getAddressResponse->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'has_complete_address' => true,
                'address' => [
                    'region_code' => '0400000000',
                    'province_code' => '0402100000',
                    'city_code' => '0402103000',
                    'barangay_code' => '0402103076',
                ],
            ]);

        // 3. Customer places order
        $orderPayload = [
            'customer_email' => $email,
            'customer_name' => 'Elias Driver',
            'payment_method' => 'Cash on Delivery',
            'items' => [
                [
                    'name' => 'Custom T-Shirt',
                    'unit_price' => 350.00,
                    'quantity' => 2,
                ],
            ],
        ];

        $orderResponse = $this->postJson('/api/v1/orders', $orderPayload);

        $orderResponse->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'order_number',
                    'customer_address_id',
                    'shipping_address' => [
                        'region_code',
                        'region_name',
                        'province_code',
                        'province_name',
                        'city_code',
                        'city_name',
                        'barangay_code',
                        'barangay_name',
                        'street_address',
                    ],
                ],
            ]);

        $this->assertEquals($savedAddressId, $orderResponse->json('data.customer_address_id'));
        $this->assertEquals('Aniban 1', $orderResponse->json('data.shipping_address.barangay_name'));
        $this->assertEquals('City of Bacoor', $orderResponse->json('data.shipping_address.city_name'));

        // 4. Verify order snapshot is preserved even if customer changes default address
        $customer = Customer::where('email', $email)->first();
        $this->postJson('/api/v1/customer/address', [
            'email' => $email,
            'recipient_name' => 'Elias New Address',
            'phone_number' => '09999999999',
            'region_code' => '1300000000',
            'region_name' => 'National Capital Region (NCR)',
            'province_code' => '1300000000',
            'province_name' => 'Metro Manila',
            'city_code' => '1380600000',
            'city_name' => 'City of Manila',
            'barangay_code' => '1380600001',
            'barangay_name' => 'Barangay 1',
            'street_address' => '999 Recto Ave',
        ]);

        $order = Order::find($orderResponse->json('data.id'));
        // Original order retains original Bacoor, Cavite snapshot!
        $this->assertEquals('City of Bacoor', $order->shipping_address['city_name']);
        $this->assertEquals('Aniban 1', $order->shipping_address['barangay_name']);
    }
}
