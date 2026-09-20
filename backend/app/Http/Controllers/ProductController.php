<?php

namespace App\Http\Controllers;

use App\Http\Requests\Api\BulkProductRequest;
use App\Http\Requests\Api\StoreProductRequest;
use App\Http\Requests\Api\UpdateProductRequest;
use App\Models\Product;
use App\Repositories\ProductRepositoryInterface;
use App\Services\Product\ProductService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        protected ProductRepositoryInterface $products,
        protected ProductService $service,
    ) {}

    public function index(Request $request): Response
    {
        $paginated = $this->products->paginated(
            $request->only('filter', 'sort'),
            (int) $request->get('per_page', 10)
        );

        return Inertia::render('products/index', [
            'products' => $paginated,
            'filters' => $request->only('filter', 'sort', 'per_page'),
            'stats' => [
                'total' => Product::count(),
                'active' => Product::where('status', 'active')->count(),
                'customizable' => Product::where('is_customizable', true)->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('products/create');
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $this->service->create($request->validated());

        return redirect()->route('products.index')->with('success', 'Product created successfully.');
    }

    public function show(Product $product): Response
    {
        return Inertia::render('products/show', ['product' => $product]);
    }

    public function edit(Product $product): Response
    {
        return Inertia::render('products/edit', ['product' => $product]);
    }

    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $this->service->update($product, $request->validated());

        return redirect()->route('products.index')->with('success', 'Product updated successfully.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return redirect()->route('products.index')->with('success', 'Product archived successfully.');
    }

    public function bulkActivate(BulkProductRequest $request): RedirectResponse
    {
        $count = $this->service->activate($request->validated()['ids']);

        return redirect()->route('products.index')->with('success', "{$count} products activated.");
    }

    public function bulkArchive(BulkProductRequest $request): RedirectResponse
    {
        $count = $this->service->archive($request->validated()['ids']);

        return redirect()->route('products.index')->with('success', "{$count} products archived.");
    }

    public function bulkDestroy(BulkProductRequest $request): RedirectResponse
    {
        $count = $this->products->bulkDelete($request->validated()['ids']);

        return redirect()->route('products.index')->with('success', "{$count} products deleted.");
    }
}
