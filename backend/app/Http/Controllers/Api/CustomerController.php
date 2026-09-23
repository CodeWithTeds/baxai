<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkCustomerRequest;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Repositories\CustomerRepositoryInterface;
use App\Services\Customer\CustomerService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected CustomerRepositoryInterface $customers,
        protected CustomerService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = $this->customers->paginated(
            $request->only('filter', 'sort'),
            (int) $request->get('per_page', 10)
        );

        return $this->successResponse(
            CustomerResource::collection($paginated)->response()->getData(true),
            'Customers retrieved successfully'
        );
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = $this->service->create($request->validated());

        return $this->successResponse(
            new CustomerResource($customer),
            'Customer created successfully',
            201
        );
    }

    public function show(Customer $customer): JsonResponse
    {
        return $this->successResponse(
            new CustomerResource($customer),
            'Customer retrieved successfully'
        );
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $this->service->update($customer, $request->validated());
        $updated = $this->customers->find($customer->id);

        return $this->successResponse(
            new CustomerResource($updated),
            'Customer updated successfully'
        );
    }

    public function destroy(Customer $customer): JsonResponse
    {
        $this->customers->delete($customer);

        return $this->successResponse(null, 'Customer deleted successfully');
    }

    public function bulkActivate(BulkCustomerRequest $request): JsonResponse
    {
        $count = $this->service->activate($request->validated()['ids']);

        return $this->successResponse(['count' => $count], "{$count} customers activated.");
    }

    public function bulkArchive(BulkCustomerRequest $request): JsonResponse
    {
        $count = $this->service->archive($request->validated()['ids']);

        return $this->successResponse(['count' => $count], "{$count} customers archived.");
    }

    public function bulkDestroy(BulkCustomerRequest $request): JsonResponse
    {
        $count = $this->customers->bulkDelete($request->validated()['ids']);

        return $this->successResponse(['count' => $count], "{$count} customers deleted.");
    }
}
