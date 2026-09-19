<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\BulkProductRequest;
use App\Http\Requests\Api\StoreProductRequest;
use App\Http\Requests\Api\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Repositories\ProductRepositoryInterface;
use App\Services\Product\ProductService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ProductController extends Controller
{
    use ApiResponse;

    public function __construct(protected ProductService $service) {}

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Product::class);
        $products = app(ProductRepositoryInterface::class)
            ->paginated($request->only('filter', 'sort'), (int) $request->get('per_page', 10));

        return $this->successResponse(ProductResource::collection($products), 'Products retrieved successfully');
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        Gate::authorize('create', Product::class);
        $product = $this->service->create($request->validated());

        return $this->successResponse(new ProductResource($product), 'Product created successfully', 201);
    }

    public function show(Product $product): JsonResponse
    {
        Gate::authorize('view', $product);

        return $this->successResponse(new ProductResource($product), 'Product retrieved successfully');
    }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        Gate::authorize('update', $product);
        $this->service->update($product, $request->validated());

        return $this->successResponse(new ProductResource($product->refresh()), 'Product updated successfully');
    }

    public function destroy(Product $product): JsonResponse
    {
        Gate::authorize('delete', $product);
        $product->delete();

        return $this->successResponse(null, 'Product archived successfully');
    }

    public function bulkActivate(BulkProductRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Product::class);
        $count = $this->service->activate($request->validated()['ids']);

        return $this->successResponse(['count' => $count], "{$count} products activated");
    }

    public function bulkArchive(BulkProductRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Product::class);
        $count = $this->service->archive($request->validated()['ids']);

        return $this->successResponse(['count' => $count], "{$count} products archived");
    }

    public function bulkDestroy(BulkProductRequest $request): JsonResponse
    {
        Gate::authorize('viewAny', Product::class);
        $count = app(ProductRepositoryInterface::class)->bulkDelete($request->validated()['ids']);

        return $this->successResponse(['count' => $count], "{$count} products deleted");
    }
}
