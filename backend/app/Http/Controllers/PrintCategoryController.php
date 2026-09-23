<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePrintCategoryRequest;
use App\Http\Requests\UpdatePrintCategoryRequest;
use App\Models\PrintCategory;
use App\Repositories\PrintCategoryRepositoryInterface;
use App\Services\Printing\PrintCategoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrintCategoryController extends Controller
{
    public function __construct(
        protected PrintCategoryRepositoryInterface $categories,
        protected PrintCategoryService $service,
    ) {}

    public function index(Request $request): Response
    {
        $paginated = $this->categories->paginated(
            $request->only('filter', 'sort'),
            (int) $request->get('per_page', 10)
        );

        return Inertia::render('printing/categories/index', [
            'categories' => $paginated,
            'filters' => $request->only('filter', 'sort', 'per_page'),
            'stats' => $this->categories->getStats(),
        ]);
    }

    public function store(StorePrintCategoryRequest $request): RedirectResponse
    {
        $this->service->create($request->validated());

        return redirect()->back();
    }

    public function update(UpdatePrintCategoryRequest $request, PrintCategory $printCategory): RedirectResponse
    {
        $this->service->update($printCategory, $request->validated());

        return redirect()->back();
    }

    public function destroy(PrintCategory $printCategory): RedirectResponse
    {
        $this->categories->delete($printCategory);

        return redirect()->back();
    }
}
