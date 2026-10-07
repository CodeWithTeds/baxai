<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePrintServiceRequest;
use App\Http\Requests\UpdatePrintServiceRequest;
use App\Http\Resources\PrintServiceResource;
use App\Models\PrintService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class PrintServiceController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PrintService::with('specifications')->orderBy('sort_order');

        if ($request->boolean('active_only', true)) {
            $query->active();
        }

        return PrintServiceResource::collection($query->get());
    }

    public function show(string $slug): PrintServiceResource
    {
        $service = PrintService::with('specifications')->where('slug', $slug)->firstOrFail();

        return new PrintServiceResource($service);
    }

    public function store(StorePrintServiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['slug'] = $data['slug'] ?? Str::slug($data['name']);

        $service = PrintService::create($data);

        return (new PrintServiceResource($service->load('specifications')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdatePrintServiceRequest $request, PrintService $service): PrintServiceResource
    {
        $data = $request->validated();

        if (isset($data['name']) && ! isset($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $service->update($data);

        return new PrintServiceResource($service->fresh()->load('specifications'));
    }

    public function destroy(PrintService $service): JsonResponse
    {
        $service->delete();

        return response()->json(['message' => 'Print service deleted successfully.']);
    }
}
