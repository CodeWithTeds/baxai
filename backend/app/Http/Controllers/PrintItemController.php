<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkPrintItemRequest;
use App\Http\Requests\StorePrintItemRequest;
use App\Http\Requests\UpdatePrintItemRequest;
use App\Models\PrintItem;
use App\Repositories\PrintCategoryRepositoryInterface;
use App\Repositories\PrintItemRepositoryInterface;
use App\Services\Printing\PrintItemService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PrintItemController extends Controller
{
    public function __construct(
        protected PrintItemRepositoryInterface $items,
        protected PrintCategoryRepositoryInterface $categories,
        protected PrintItemService $service,
    ) {}

    public function index(Request $request): Response
    {
        $paginated = $this->items->paginated(
            $request->only('filter', 'sort'),
            (int) $request->get('per_page', 10)
        );

        return Inertia::render('printing/items/index', [
            'items' => $paginated,
            'categories' => $this->categories->all(),
            'filters' => $request->only('filter', 'sort', 'per_page'),
            'stats' => $this->items->getStats(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('printing/items/create', [
            'categories' => $this->categories->all(),
        ]);
    }

    public function store(StorePrintItemRequest $request): RedirectResponse
    {
        $this->service->create($request->validated());

        return redirect()->route('print-items.index');
    }

    public function show(PrintItem $printItem): Response
    {
        return Inertia::render('printing/items/show', [
            'item' => $printItem->load('category'),
        ]);
    }

    public function edit(PrintItem $printItem): Response
    {
        return Inertia::render('printing/items/edit', [
            'item' => $printItem->load('category'),
            'categories' => $this->categories->all(),
        ]);
    }

    public function update(UpdatePrintItemRequest $request, PrintItem $printItem): RedirectResponse
    {
        $this->service->update($printItem, $request->validated());

        return redirect()->route('print-items.index');
    }

    public function destroy(PrintItem $printItem): RedirectResponse
    {
        $this->items->delete($printItem);

        return redirect()->route('print-items.index');
    }

    public function bulkActivate(BulkPrintItemRequest $request): RedirectResponse
    {
        $this->service->activate($request->validated()['ids']);

        return redirect()->route('print-items.index');
    }

    public function bulkArchive(BulkPrintItemRequest $request): RedirectResponse
    {
        $this->service->archive($request->validated()['ids']);

        return redirect()->route('print-items.index');
    }

    public function bulkDestroy(BulkPrintItemRequest $request): RedirectResponse
    {
        $this->items->bulkDelete($request->validated()['ids']);

        return redirect()->route('print-items.index');
    }
}
