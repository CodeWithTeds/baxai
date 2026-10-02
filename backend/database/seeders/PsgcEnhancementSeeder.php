<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Schoolees\Psgc\Models\City;
use Schoolees\Psgc\Models\Province;

class PsgcEnhancementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure National Capital Region (NCR) has Metro Manila as its Province entry
        // so the Region -> Province -> City -> Barangay hierarchy is consistent across all 18 regions.
        Province::firstOrCreate(
            ['code' => '1300000000'],
            [
                'name' => 'Metro Manila',
                'region_code' => '1300000000',
            ]
        );

        // Assign NCR cities to Metro Manila province
        City::where('region_code', '1300000000')->update([
            'province_code' => '1300000000',
        ]);

        // 2. Map Highly Urbanized Cities (HUC) / Independent Component Cities (ICC)
        // to their respective geographical provinces so they appear under the province dropdown
        $hucMap = [
            '0105518000' => '0105500000', // City of Dagupan -> Pangasinan
            '0203135000' => '0203100000', // City of Santiago -> Isabela
            '0330100000' => '0305400000', // City of Angeles -> Pampanga
            '0331400000' => '0307100000', // City of Olongapo -> Zambales
            '0431200000' => '0405600000', // City of Lucena -> Quezon
            '0501724000' => '0501700000', // City of Naga -> Camarines Sur
            '0631000000' => '0603000000', // City of Iloilo -> Iloilo
            '0730600000' => '0702200000', // City of Cebu -> Cebu
            '0731100000' => '0702200000', // City of Lapu-Lapu -> Cebu
            '0731300000' => '0702200000', // City of Mandaue -> Cebu
            '0803738000' => '0803700000', // Ormoc City -> Leyte
            '0831600000' => '0803700000', // City of Tacloban -> Leyte
            '0931700000' => '0907300000', // City of Zamboanga -> Zamboanga del Sur
            '1030500000' => '1004300000', // City of Cagayan De Oro -> Misamis Oriental
            '1030900000' => '1003500000', // City of Iligan -> Lanao del Norte
            '1130700000' => '1102400000', // City of Davao -> Davao del Sur
            '1230800000' => '1206300000', // City of General Santos -> South Cotabato
            '1430300000' => '1401100000', // City of Baguio -> Benguet
            '1630400000' => '1600200000', // City of Butuan -> Agusan del Norte
            '1731500000' => '1705300000', // City of Puerto Princesa -> Palawan
            '1830200000' => '1804500000', // City of Bacolod -> Negros Occidental
            '1908703000' => '1908700000', // City of Cotabato -> Maguindanao del Norte
        ];

        foreach ($hucMap as $cityCode => $provCode) {
            City::where('code', $cityCode)->update(['province_code' => $provCode]);
        }
    }
}
