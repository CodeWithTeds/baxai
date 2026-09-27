<?php

namespace App\Repositories;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

abstract class BaseRepository implements BaseRepositoryInterface
{
    public function __construct(protected Model $model) {}

    public function all(): array|Collection
    {
        return $this->model->all();
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->model->paginate($perPage);
    }

    public function find(mixed $id): Model
    {
        return $this->model->find($id);
    }

    public function create(array $attributes): Model
    {
        return DB::transaction(fn () => $this->model->create($attributes));
    }

    public function update(Model $model, array $attributes): bool
    {
        return DB::transaction(fn () => $model->update($attributes));
    }

    public function delete(Model $model): bool
    {
        return DB::transaction(fn () => $model->delete());
    }
}
