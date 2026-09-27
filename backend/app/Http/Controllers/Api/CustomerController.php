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

    public function index(Request $request): JsonResponse { 
        return $this->successResponse(CustomerResource::collection($this->customers->paginated($request->only('filter', 'sort'), (int) $request->get('per_page', 10)))->response()->getData(true), 'Customers retrieved successfully'); }

    public function store(StoreCustomerRequest $request): JsonResponse { return $this->successResponse(new CustomerResource($this->service->create($request->validated())), 'Customer created successfully', 201); }

    public function show(Customer $customer): JsonResponse { return $this->successResponse(new CustomerResource($customer), 'Customer retrieved successfully'); }

    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse { $this->service->update($customer, $request->validated()); return $this->successResponse(new CustomerResource($this->customers->find($customer->id)), 'Customer updated successfully'); }

    public function destroy(Customer $customer): JsonResponse { $this->customers->delete($customer); return $this->successResponse(null, 'Customer deleted successfully'); }

    public function bulkActivate(BulkCustomerRequest $request): JsonResponse { return $this->successResponse(['count' => $this->customers->bulkUpdateStatus($request->validated()['ids'], 'active')], 'Customers activated successfully'); }

    public function bulkArchive(BulkCustomerRequest $request): JsonResponse { return $this->successResponse(['count' => $this->customers->bulkUpdateStatus($request->validated()['ids'], 'archived')], 'Customers archived successfully'); }

    public function bulkDestroy(BulkCustomerRequest $request): JsonResponse { return $this->successResponse(['count' => $this->customers->bulkDelete($request->validated()['ids'])], 'Customers deleted successfully'); }
}
