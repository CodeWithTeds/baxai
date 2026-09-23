<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePrintCategoryRequest;
use App\Http\Requests\UpdatePrintCategoryRequest;
use App\Http\Resources\PrintCategoryResource;
use App\Models\PrintCategory;
use App\Repositories\PrintCategoryRepositoryInterface;
use App\Services\Printing\PrintCategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PrintCategoryController extends Controller
{
    public function __construct(
        protected PrintCategoryRepositoryInterface $categories,
        protected PrintCategoryService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $paginated = $this->categories->paginated(
            $request->only('filter', 'sort'),
            (int) $request->get('per_page', 15)
        );

        return PrintCategoryResource::collection($paginated);
    }

    public function store(StorePrintCategoryRequest $request): JsonResponse
    {
        $category = $this->service->create($request->validated());

        return (new PrintCategoryResource($category))
            ->response()
            ->setStatusCode(21);
    }

    public function show(PrintCategory $printCategory): PrintCategoryResource
    {
        return new PrintCategoryResource($printCategory->load('printItems'));
    }

    public function update(UpdatePrintCategoryRequest $request, PrintCategory $printCategory): PrintCategoryResource
    {
        $this->service->update($printCategory, $request->validated());

        return new PrintCategoryResource($printCategory->fresh());
    }

    public function destroy(PrintCategory $printCategory): JsonResponse
    {
        $this->categories->delete($printCategory);

        return response()->json(['message' => 'Print category deleted successfully.']);
    }
}
