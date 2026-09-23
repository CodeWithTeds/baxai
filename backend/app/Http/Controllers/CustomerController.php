<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkCustomerRequest;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use App\Repositories\CustomerRepositoryInterface;
use App\Services\Customer\CustomerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function __construct(
        protected CustomerRepositoryInterface $customers,
        protected CustomerService $service,
    ) {}

    public function index(Request $request): Response
    {
        $paginated = $this->customers->paginated(
            $request->only('filter', 'sort'),
            (int) $request->get('per_page', 10)
        );

        return Inertia::render('customers/index', [
            'customers' => $paginated,
            'filters' => $request->only('filter', 'sort', 'per_page'),
            'stats' => $this->customers->getStats(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('customers/create');
    }

    public function store(StoreCustomerRequest $request): RedirectResponse
    {
        $this->service->create($request->validated());

        return redirect()->route('customers.index')->with('success', 'Customer created successfully.');
    }

    public function show(Customer $customer): Response
    {
        return Inertia::render('customers/show', ['customer' => $customer]);
    }

    public function edit(Customer $customer): Response
    {
        return Inertia::render('customers/edit', ['customer' => $customer]);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): RedirectResponse
    {
        $this->service->update($customer, $request->validated());

        return redirect()->route('customers.index')->with('success', 'Customer updated successfully.');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        $this->customers->delete($customer);

        return redirect()->route('customers.index')->with('success', 'Customer archived successfully.');
    }

    public function bulkActivate(BulkCustomerRequest $request): RedirectResponse
    {
        $count = $this->service->activate($request->validated()['ids']);

        return redirect()->route('customers.index')->with('success', "{$count} customers activated.");
    }

    public function bulkArchive(BulkCustomerRequest $request): RedirectResponse
    {
        $count = $this->service->archive($request->validated()['ids']);

        return redirect()->route('customers.index')->with('success', "{$count} customers archived.");
    }

    public function bulkDestroy(BulkCustomerRequest $request): RedirectResponse
    {
        $count = $this->customers->bulkDelete($request->validated()['ids']);

        return redirect()->route('customers.index')->with('success', "{$count} customers deleted.");
    }
}
