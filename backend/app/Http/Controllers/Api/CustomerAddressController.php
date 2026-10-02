<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerAddress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Schoolees\Psgc\Models\Barangay;
use Schoolees\Psgc\Models\City;
use Schoolees\Psgc\Models\Province;
use Schoolees\Psgc\Models\Region;

class CustomerAddressController extends Controller
{
    /**
     * Get saved delivery address for a customer.
     */
    public function getAddress(Request $request): JsonResponse
    {
        $email = $request->query('email') ?: ($request->user()?->email ?? null);
        $customerId = $request->query('customer_id');

        $customer = null;
        if ($customerId) {
            $customer = Customer::find($customerId);
        } elseif ($email) {
            $cleanEmail = strtolower(trim($email));
            $customer = Customer::whereRaw('LOWER(email) = ?', [$cleanEmail])->first();
        }

        if (! $customer) {
            return response()->json([
                'status' => 'success',
                'has_complete_address' => false,
                'address' => null,
                'customer' => null,
            ]);
        }

        $address = $customer->defaultAddress ?? $customer->addresses()->latest()->first();

        return response()->json([
            'status' => 'success',
            'has_complete_address' => $address ? $address->isComplete() : false,
            'address' => $address,
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
            ],
        ]);
    }

    /**
     * Store or update customer's Philippine delivery address.
     */
    public function saveAddress(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required_without:customer_id|nullable|email|max:255',
            'customer_id' => 'nullable|integer',
            'recipient_name' => 'required|string|max:255',
            'phone_number' => 'required|string|max:50',
            'region_code' => 'required|string|max:20',
            'region_name' => 'required|string|max:255',
            'province_code' => 'nullable|string|max:20',
            'province_name' => 'nullable|string|max:255',
            'city_code' => 'required|string|max:20',
            'city_name' => 'required|string|max:255',
            'barangay_code' => 'required|string|max:20',
            'barangay_name' => 'required|string|max:255',
            'street_address' => 'required|string|max:500',
            'postal_code' => 'nullable|string|max:20',
            'delivery_instructions' => 'nullable|string|max:500',
        ], [
            'recipient_name.required' => 'Recipient name is required.',
            'phone_number.required' => 'Contact phone number is required.',
            'region_code.required' => 'Please select a Region from the dropdown.',
            'region_name.required' => 'Region name is required.',
            'city_code.required' => 'Please select a City/Municipality from the dropdown.',
            'city_name.required' => 'City/Municipality name is required.',
            'barangay_code.required' => 'Please select a Barangay from the dropdown.',
            'barangay_name.required' => 'Barangay name is required.',
            'street_address.required' => 'Street / House / Building details are required.',
        ]);

        // Validate PSGC codes against database
        $regionExists = Region::where('code', (string) $validated['region_code'])->exists();
        if (! $regionExists) {
            return response()->json([
                'status' => 'error',
                'message' => 'The selected Region PSGC code is invalid in the database.',
                'errors' => ['region_code' => ['Invalid Region code']],
            ], 422);
        }

        $regionHasProvinces = Province::where('region_code', (string) $validated['region_code'])->exists();
        if ($regionHasProvinces) {
            if (empty($validated['province_code'])) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Please select a Province from the dropdown.',
                    'errors' => ['province_code' => ['Province code is required for this region.']],
                ], 422);
            }
            $provinceExists = Province::where('code', (string) $validated['province_code'])->exists();
            if (! $provinceExists) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'The selected Province PSGC code is invalid in the database.',
                    'errors' => ['province_code' => ['Invalid Province code']],
                ], 422);
            }
        }

        $cityExists = City::where('code', (string) $validated['city_code'])->exists();
        if (! $cityExists) {
            return response()->json([
                'status' => 'error',
                'message' => 'The selected City/Municipality PSGC code is invalid in the database.',
                'errors' => ['city_code' => ['Invalid City/Municipality code']],
            ], 422);
        }

        $barangayExists = Barangay::where('code', (string) $validated['barangay_code'])->exists();
        if (! $barangayExists) {
            return response()->json([
                'status' => 'error',
                'message' => 'The selected Barangay PSGC code is invalid in the database.',
                'errors' => ['barangay_code' => ['Invalid Barangay code']],
            ], 422);
        }

        // Locate or create customer
        $customer = null;
        if (! empty($validated['customer_id'])) {
            $customer = Customer::find($validated['customer_id']);
        }
        if (! $customer && ! empty($validated['email'])) {
            $cleanEmail = strtolower(trim($validated['email']));
            $customer = Customer::firstOrCreate(
                ['email' => $cleanEmail],
                [
                    'name' => trim($validated['recipient_name']),
                    'customer_code' => 'CUST-'.strtoupper(substr(md5($cleanEmail), 0, 6)),
                    'phone' => trim($validated['phone_number']),
                    'status' => 'active',
                    'type' => 'retail',
                    'loyalty_points' => 100,
                    'vip_tier' => 'Bronze',
                ]
            );
        }

        if (! $customer) {
            return response()->json([
                'status' => 'error',
                'message' => 'Customer could not be resolved from provided email or ID.',
            ], 422);
        }

        // Save or update address
        $address = CustomerAddress::updateOrCreate(
            [
                'customer_id' => $customer->id,
                'is_default' => true,
            ],
            [
                'recipient_name' => trim($validated['recipient_name']),
                'phone_number' => trim($validated['phone_number']),
                'region_code' => (string) $validated['region_code'],
                'region_name' => trim($validated['region_name']),
                'province_code' => (string) $validated['province_code'],
                'province_name' => trim($validated['province_name']),
                'city_code' => (string) $validated['city_code'],
                'city_name' => trim($validated['city_name']),
                'barangay_code' => (string) $validated['barangay_code'],
                'barangay_name' => trim($validated['barangay_name']),
                'street_address' => trim($validated['street_address']),
                'postal_code' => ! empty($validated['postal_code']) ? trim($validated['postal_code']) : null,
                'delivery_instructions' => ! empty($validated['delivery_instructions']) ? trim($validated['delivery_instructions']) : null,
            ]
        );

        // Synchronize customer profile
        $customer->update([
            'name' => $customer->name ?: trim($validated['recipient_name']),
            'phone' => trim($validated['phone_number']),
            'address' => trim($validated['street_address']).', Brgy. '.trim($validated['barangay_name']),
            'city' => trim($validated['city_name']),
            'state' => trim($validated['province_name']),
            'postal_code' => ! empty($validated['postal_code']) ? trim($validated['postal_code']) : null,
            'country' => 'Philippines',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Philippine delivery address saved successfully.',
            'has_complete_address' => true,
            'address' => $address,
        ]);
    }
}
