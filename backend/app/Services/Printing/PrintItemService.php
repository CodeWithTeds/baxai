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

    public function update(PrintItem $item, array $data): bool
    {
        return $this->repository->update($item, $data);
    }

    public function activate(array $ids): int
    {
        $count = 0;
        foreach ($ids as $id) {
            $item = $this->repository->findById($id);
            if ($item && $this->repository->update($item, ['status' => 'active'])) {
                $count++;
            }
        }
        return $count;
    }

    public function archive(array $ids): int
    {
        $count = 0;
        foreach ($ids as $id) {
            $item = $this->repository->findById($id);
            if ($item && $this->repository->update($item, ['status' => 'archived'])) {
                $count++;
            }
        }
        return $count;
    }

    protected function generateItemCode(array $data): string
    {
        $prefix = 'PRT';
        if (!empty($data['category_id'])) {
            $category = $this->categoryRepository->findById((int) $data['category_id']);
            if ($category && !empty($category->code)) {
                $prefix = 'PRT-' . strtoupper(substr($category->code, 0, 4));
            }
        }

        $base = strtoupper(preg_replace('/[^A-Z0-9]/i', '', $data['name'] ?? 'ITEM'));
        $nameSlug = substr($base, 0, 4);
        $random = strtoupper(substr(md5(uniqid((string) rand(), true)), 0, 4));

        return "{$prefix}-{$nameSlug}-{$random}";
    }
}
