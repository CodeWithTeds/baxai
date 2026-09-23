<?php

namespace App\Services\Printing;

use App\Models\PrintCategory;
use App\Repositories\PrintCategoryRepositoryInterface;
use Illuminate\Support\Str;

class PrintCategoryService
{
    public function __construct(
        protected PrintCategoryRepositoryInterface $repository
    ) {}

    public function create(array $data): PrintCategory
    {
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        if (empty($data['code'])) {
            $data['code'] = strtoupper(Str::slug($data['name'], '_'));
        }

        return $this->repository->create($data);
    }

    public function update(PrintCategory $category, array $data): bool
    {
        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        return $this->repository->update($category, $data);
    }

    public function activate(array $ids): int
    {
        $count = 0;
        foreach ($ids as $id) {
            $category = $this->repository->findById($id);
            if ($category && $this->repository->update($category, ['status' => 'active'])) {
                $count++;
            }
        }
        return $count;
    }

    public function deactivate(array $ids): int
    {
        $count = 0;
        foreach ($ids as $id) {
            $category = $this->repository->findById($id);
            if ($category && $this->repository->update($category, ['status' => 'inactive'])) {
                $count++;
            }
        }
        return $count;
    }
}
