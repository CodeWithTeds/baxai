<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePrintItemRequest;
use App\Http\Requests\UpdatePrintItemRequest;
use App\Http\Resources\PrintItemResource;
use App\Models\PrintItem;
use App\Repositories\PrintItemRepositoryInterface;
use App\Services\Printing\PrintItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PrintItemController extends Controller
{
    public function __construct(
        protected PrintItemRepositoryInterface $items,
        protected PrintItemService $service,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return PrintItemResource::collection($this->items->paginated($request->only('filter', 'sort'), (int) $request->get('per_page', 15)));
    }
    
    public function store(StorePrintItemRequest $request): JsonResponse
    {
        $data = $request->validated();
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('print-items', 'public');
            $data['image_url'] = '/storage/'.$path;
        }

        return (new PrintItemResource($this->service->create($data)->load('category')))->response()->setStatusCode(201);
    }

    public function show(PrintItem $printItem): PrintItemResource
    {
        return new PrintItemResource($printItem->load('category'));
    }

    public function update(UpdatePrintItemRequest $request, PrintItem $printItem): PrintItemResource
    {
        $data = $request->validated();
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('print-items', 'public');
            $data['image_url'] = '/storage/'.$path;
        }

        $this->items->update($printItem, $data);

        return new PrintItemResource($printItem->fresh()->load('category'));
    }

    public function destroy(PrintItem $printItem): JsonResponse
    {
        $this->items->delete($printItem);

        return response()->json(['message' => 'Print item deleted successfully.']);
    }
}
