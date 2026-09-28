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

    public function __construct(
        protected ProductRepositoryInterface $products,
        protected ProductService $service,
    ) {}

    public function index(Request $request): JsonResponse { return $this->successResponse(ProductResource::collection($this->products->paginated($request->only('filter', 'sort'), (int) $request->get('per_page', 20))), 'Products retrieved successfully'); }

    public function store(StoreProductRequest $request): JsonResponse { Gate::authorize('create', Product::class); return $this->successResponse(new ProductResource($this->service->create($request->validated())), 'Product created successfully', 201); }

    public function show(Product $product): JsonResponse { return $this->successResponse(new ProductResource($product), 'Product retrieved successfully'); }

    public function update(UpdateProductRequest $request, Product $product): JsonResponse { Gate::authorize('update', $product); $this->service->update($product, $request->validated()); return $this->successResponse(new ProductResource($product->refresh()), 'Product updated successfully'); }

    public function destroy(Product $product): JsonResponse { Gate::authorize('delete', $product); $this->products->delete($product); return $this->successResponse(null, 'Product archived successfully'); }

    public function bulkActivate(BulkProductRequest $request): JsonResponse { Gate::authorize('viewAny', Product::class); return $this->successResponse(['count' => $this->products->bulkUpdateStatus($request->validated()['ids'], 'active')], 'Products activated successfully'); }

    public function bulkArchive(BulkProductRequest $request): JsonResponse { Gate::authorize('viewAny', Product::class); return $this->successResponse(['count' => $this->products->bulkUpdateStatus($request->validated()['ids'], 'archived')], 'Products archived successfully'); }

    public function bulkDestroy(BulkProductRequest $request): JsonResponse { Gate::authorize('viewAny', Product::class); return $this->successResponse(['count' => $this->products->bulkDelete($request->validated()['ids'])], 'Products deleted successfully'); }
}
