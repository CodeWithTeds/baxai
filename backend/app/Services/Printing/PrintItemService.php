<?php

namespace App\Services\Printing;

use App\Models\PrintItem;
use App\Repositories\PrintCategoryRepositoryInterface;
use App\Repositories\PrintItemRepositoryInterface;

class PrintItemService
{
    public function __construct(
        protected PrintItemRepositoryInterface $repository,
        protected PrintCategoryRepositoryInterface $categoryRepository
    ) {}

    public function create(array $data): PrintItem
    {
        if (empty($data['item_code'])) {
            $data['item_code'] = $this->generateItemCode($data);
        }

        return $this->repository->create($data);
    }

    protected function generateItemCode(array $data): string
    {
        $prefix = 'PRT';
        if (! empty($data['category_id'])) {
            $category = $this->categoryRepository->findById((int) $data['category_id']);
            if ($category && ! empty($category->code)) {
                $prefix = 'PRT-'.strtoupper(substr($category->code, 0, 4));
            }
        }

        $base = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $data['name'] ?? 'ITEM'));
        $nameSlug = substr($base, 0, 4);
        $random = strtoupper(substr(md5(uniqid((string) rand(), true)), 0, 4));

        return "{$prefix}-{$nameSlug}-{$random}";
    }
}
