<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Schoolees\Psgc\Models\Barangay;
use Schoolees\Psgc\Models\City;
use Schoolees\Psgc\Models\Province;
use Schoolees\Psgc\Models\Region;

class PsgcController extends Controller
{
    /**
     * Get all Philippine regions.
     */
    public function regions(): JsonResponse
    {
        $regions = Region::orderBy('code')
            ->get(['code', 'name', 'short_name'])
            ->map(function ($r) {
                return [
                    'code' => (string) $r->code,
                    'name' => $r->name,
                    'short_name' => $r->short_name,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $regions,
        ]);
    }

    /**
     * Get provinces for a given region.
     */
    public function provinces(Request $request): JsonResponse
    {
        $regionCode = $request->query('region_code');

        if (! $regionCode) {
            return response()->json([
                'status' => 'error',
                'message' => 'Region code is required.',
            ], 422);
        }

        $regionCode = (string) $regionCode;

        $provinces = Province::where('region_code', $regionCode)
            ->orderBy('name')
            ->get(['code', 'name', 'region_code'])
            ->map(function ($p) {
                return [
                    'code' => (string) $p->code,
                    'name' => $p->name,
                    'region_code' => (string) $p->region_code,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $provinces,
        ]);
    }

    /**
     * Get cities/municipalities for a given province (or region).
     */
    public function cities(Request $request): JsonResponse
    {
        $provinceCode = $request->query('province_code');
        $regionCode = $request->query('region_code');

        if (! $provinceCode && ! $regionCode) {
            return response()->json([
                'status' => 'error',
                'message' => 'Province code or region code is required.',
            ], 422);
        }

        $query = City::query();

        if ($provinceCode) {
            $query->where('province_code', (string) $provinceCode);
        } elseif ($regionCode) {
            $query->where('region_code', (string) $regionCode);
        }

        $cities = $query->orderBy('name')
            ->get(['code', 'name', 'region_code', 'province_code', 'is_city', 'city_class'])
            ->map(function ($c) {
                return [
                    'code' => (string) $c->code,
                    'name' => $c->name,
                    'province_code' => (string) $c->province_code,
                    'region_code' => (string) $c->region_code,
                    'is_city' => (bool) $c->is_city,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $cities,
        ]);
    }

    /**
     * Get barangays for a given city/municipality.
     */
    public function barangays(Request $request): JsonResponse
    {
        $cityCode = $request->query('city_code');

        if (! $cityCode) {
            return response()->json([
                'status' => 'error',
                'message' => 'City/Municipality code is required.',
            ], 422);
        }

        $barangays = Barangay::where('city_code', (string) $cityCode)
            ->orderBy('name')
            ->get(['code', 'name', 'city_code'])
            ->map(function ($b) {
                return [
                    'code' => (string) $b->code,
                    'name' => $b->name,
                    'city_code' => (string) $b->city_code,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => $barangays,
        ]);
    }
}
