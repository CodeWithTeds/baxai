<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkStaffRequest;
use App\Http\Requests\StoreStaffRequest;
use App\Http\Requests\UpdateStaffRequest;
use App\Models\User;
use App\Repositories\StaffRepositoryInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    public const ROLES = [
        ['value' => 'admin', 'label' => 'Administrator', 'badge' => 'Admin', 'description' => 'Full administrative access to governance, settings, catalog, and finances.'],
        ['value' => 'manager', 'label' => 'Store Manager', 'badge' => 'Manager', 'description' => 'Supervises orders, inventory replenishment, catalog, and customer support.'],
        ['value' => 'staff', 'label' => 'Staff (Cannot delete)', 'badge' => 'Staff', 'description' => 'Order fulfillment, packing, and support staff (deletion restricted).'],
        ['value' => 'prepress_designer', 'label' => 'Graphic Designer', 'badge' => 'Designer', 'description' => 'Handles custom artwork, proofing, and digital media assets.'],
        ['value' => 'operator', 'label' => 'Fulfillment Operator', 'badge' => 'Operator', 'description' => 'Processes packaging, shipping, and order dispatching.'],
        ['value' => 'qc_lead', 'label' => 'Quality Inspector', 'badge' => 'QC Lead', 'description' => 'Performs order quality checks and packaging standards.'],
    ];

    public const DEPARTMENTS = [
        'Management',
        'Sales & E-Commerce',
        'Order Fulfillment & Packing',
        'Inventory & Logistics',
        'Customer Support',
        'Graphic Design & Media',
        'Production & Printing',
        'Quality Assurance',
    ];

    public const SHIFTS = [
        'Regular (8:00 AM - 5:00 PM)',
        'Morning (6:00 AM - 2:00 PM)',
        'Afternoon (2:00 PM - 10:00 PM)',
        'Night (10:00 PM - 6:00 AM)',
        'Flexible',
    ];

    public const WORKSTATIONS = [
        'HQ Admin Console',
        'Order Processing Desk',
        'Packing Station #1',
        'Packing Station #2',
        'Dispatch Depot',
        'Inventory Counter',
        'Customer Service Bench',
        'Design Workstation',
    ];

    public function __construct(
        protected StaffRepositoryInterface $staff
    ) {}

    public function index(Request $request): Response
    {
        return Inertia::render('staff/index', [
            'staff' => $this->staff->paginated(
                $request->only('filter', 'sort'),
                (int) $request->get('per_page', 10)
            ),
            'filters' => (object) $request->only('filter', 'sort', 'per_page'),
            'stats' => $this->staff->getStats(),
            'departments' => self::DEPARTMENTS,
            'roles' => self::ROLES,
            'shifts' => self::SHIFTS,
            'workstations' => self::WORKSTATIONS,
            'nextEmployeeId' => $this->staff->generateNextEmployeeId(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('staff/create', [
            'departments' => self::DEPARTMENTS,
            'roles' => self::ROLES,
            'shifts' => self::SHIFTS,
            'workstations' => self::WORKSTATIONS,
            'nextEmployeeId' => $this->staff->generateNextEmployeeId(),
        ]);
    }

    public function store(StoreStaffRequest $request): RedirectResponse
    {
        $this->staff->createStaff($request->validated());

        return redirect()->route('staff.index')->with('success', 'Staff member created successfully.');
    }

    public function show(User $staff): Response
    {
        $staff->load(['staffProfile', 'tasks']);

        return Inertia::render('staff/show', [
            'staff' => $staff,
            'roles' => self::ROLES,
        ]);
    }

    public function edit(User $staff): Response
    {
        $staff->load('staffProfile');

        return Inertia::render('staff/edit', [
            'staff' => $staff,
            'departments' => self::DEPARTMENTS,
            'roles' => self::ROLES,
            'shifts' => self::SHIFTS,
            'workstations' => self::WORKSTATIONS,
        ]);
    }

    public function update(UpdateStaffRequest $request, User $staff): RedirectResponse
    {
        $this->staff->updateStaff($staff, $request->validated());

        return redirect()->route('staff.index')->with('success', 'Staff profile updated successfully.');
    }

    public function destroy(User $staff): RedirectResponse
    {
        if ($staff->id === auth()->id()) {
            return redirect()->route('staff.index')->with('error', 'You cannot delete your own account.');
        }

        if (auth()->user()?->role === 'staff') {
            return redirect()->route('staff.index')->with('error', 'Staff members are not authorized to delete records.');
        }

        $this->staff->deleteStaff($staff);

        return redirect()->route('staff.index')->with('success', 'Staff member removed successfully.');
    }

    public function toggleStatus(User $staff): RedirectResponse
    {
        if ($staff->id === auth()->id()) {
            return redirect()->route('staff.index')->with('error', 'You cannot deactivate your own account.');
        }

        $this->staff->toggleStatus($staff);

        $statusText = $staff->is_active ? 'activated' : 'deactivated';

        return redirect()->route('staff.index')->with('success', "Staff member {$statusText}.");
    }

    public function bulkActivate(BulkStaffRequest $request): RedirectResponse
    {
        $count = $this->staff->bulkUpdateStatus($request->validated()['ids'], true);

        return redirect()->route('staff.index')->with('success', "{$count} staff members activated.");
    }

    public function bulkDeactivate(BulkStaffRequest $request): RedirectResponse
    {
        $ids = array_diff($request->validated()['ids'], [auth()->id()]);
        $count = $this->staff->bulkUpdateStatus($ids, false);

        return redirect()->route('staff.index')->with('success', "{$count} staff members deactivated.");
    }

    public function bulkDestroy(BulkStaffRequest $request): RedirectResponse
    {
        if (auth()->user()?->role === 'staff') {
            return redirect()->route('staff.index')->with('error', 'Staff members are not authorized to delete records.');
        }

        $count = $this->staff->bulkDelete($request->validated()['ids']);

        return redirect()->route('staff.index')->with('success', "{$count} staff members deleted.");
    }
}
