<?php

namespace Database\Seeders;

use App\Models\PrintCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class PrintCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Paper & Stock',
                'code' => 'STOCK',
                'description' => 'Different types of paper and printing stock, such as bond paper, photo paper, cardstock, specialty paper, and available materials.',
                'icon' => 'Layers',
                'status' => 'active',
                'sort_order' => 1,
            ],
            [
                'name' => 'Equipment & Inks',
                'code' => 'EQUIPMENT',
                'description' => 'Printing equipment, commercial printers, ink cartridges, toner, and essential printing supplies.',
                'icon' => 'Printer',
                'status' => 'active',
                'sort_order' => 2,
            ],
            [
                'name' => 'Standard Documents & Office',
                'code' => 'DOCS',
                'description' => 'General document printing, reports, resumes, contracts, worksheets, and office collateral.',
                'icon' => 'FileText',
                'status' => 'active',
                'sort_order' => 3,
            ],
            [
                'name' => 'Marketing & Promotional',
                'code' => 'MKTG',
                'description' => 'Flyers, brochures, posters, banners, and promotional print media.',
                'icon' => 'Megaphone',
                'status' => 'active',
                'sort_order' => 4,
            ],
            [
                'name' => 'Photo & Fine Art',
                'code' => 'PHOTO',
                'description' => 'High-resolution photo prints, portraits, canvas gallery wraps, and art reproductions.',
                'icon' => 'Image',
                'status' => 'active',
                'sort_order' => 5,
            ],
            [
                'name' => 'Stationery & Cards',
                'code' => 'STAT',
                'description' => 'Business cards, invitation cards, greeting cards, certificates, and official receipts.',
                'icon' => 'CreditCard',
                'status' => 'active',
                'sort_order' => 6,
            ],
            [
                'name' => 'Labels & Packaging',
                'code' => 'LABEL',
                'description' => 'Custom vinyl stickers, product labels, roll stickers, and custom die-cut tags.',
                'icon' => 'Tag',
                'status' => 'active',
                'sort_order' => 7,
            ],
            [
                'name' => 'Publications & Media',
                'code' => 'PUB',
                'description' => 'Bound books, magazines, newsletters, newspapers, calendars, and booklets.',
                'icon' => 'BookOpen',
                'status' => 'active',
                'sort_order' => 8,
            ],
            [
                'name' => 'Hospitality & Dining',
                'code' => 'MENU',
                'description' => 'Restaurant menus, laminated table cards, takeaway menus, and place cards.',
                'icon' => 'Utensils',
                'status' => 'active',
                'sort_order' => 9,
            ],
        ];

        foreach ($categories as $cat) {
            $cat['slug'] = Str::slug($cat['name']);
            PrintCategory::updateOrCreate(['code' => $cat['code']], $cat);
        }
    }
}
