<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStaffTaskRequest;
use App\Http\Requests\UpdateStaffOrderStatusRequest;
use App\Services\StaffPortal\StaffPortalService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffPortalController extends Controller
{
    public function __construct(
        protected StaffPortalService $portalService
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('staff/portal', $this->portalService->getWorkspace($request->user()));
    }

    public function updateOrderStatus(UpdateStaffOrderStatusRequest $request, int $order): RedirectResponse
    {
        $this->portalService->updateOrderStatus($order, $request->validated()['status']);

        return back()->with('success', 'Order status updated.');
    }

    public function toggleTask(Request $request, int $task): RedirectResponse
    {
        $this->portalService->toggleTask($task, $request->user());

        return back()->with('success', 'Task status updated.');
    }

    public function storeTask(StoreStaffTaskRequest $request): RedirectResponse
    {
        $this->portalService->createTask($request->user(), $request->validated());

        return back()->with('success', 'Task added to shift checklist.');
    }
}
