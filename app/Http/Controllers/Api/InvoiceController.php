<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreInvoicePaymentRequest;
use App\Http\Requests\StoreInvoiceRequest;
use App\Http\Requests\UpdateInvoiceRequest;
use App\Http\Resources\InvoiceDetailResource;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\InvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class InvoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, InvoiceService $invoiceService)
    {
        Gate::authorize('viewAny', Invoice::class);
        $invoiceService->refreshOverdueStatuses();

        $filters = $request->validate([
            'search' => ['nullable', 'string'],
            'status' => ['nullable', 'in:Unpaid,Partial,Paid,Overdue,Cancelled'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ]);

        $invoices = Invoice::query()->with('candidate:id,name,email')
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($query) => $query
                ->where('invoice_number', 'like', "%{$search}%")
                ->orWhere('client_name', 'like', "%{$search}%")
                ->orWhere('client_email', 'like', "%{$search}%")))
            ->when($filters['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->latest()->paginate($filters['per_page'] ?? 20)->withQueryString();

        $totals = Invoice::query()->where('status', '!=', 'Cancelled')->selectRaw(<<<'SQL'
            SUM(CASE WHEN status = 'Paid' THEN total ELSE 0 END) as total_revenue,
            SUM(CASE WHEN status IN ('Unpaid', 'Partial', 'Overdue') THEN total - amount_paid ELSE 0 END) as outstanding,
            SUM(CASE WHEN status = 'Overdue' THEN total - amount_paid ELSE 0 END) as overdue,
            SUM(total) as total_invoiced
        SQL)->first();

        return InvoiceResource::collection($invoices)->additional([
            'metrics' => [
                'total_revenue' => (float) ($totals->total_revenue ?? 0),
                'outstanding' => (float) ($totals->outstanding ?? 0),
                'overdue' => (float) ($totals->overdue ?? 0),
                'total_invoiced' => (float) ($totals->total_invoiced ?? 0),
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreInvoiceRequest $request, InvoiceService $invoiceService): JsonResponse
    {
        $validated = $request->validated();
        $invoice = $invoiceService->create($validated, $validated['items'], $request->user());

        return InvoiceDetailResource::make($invoice->load(['items', 'candidate', 'payments.recordedBy', 'createdBy']))->response()->setStatusCode(201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Invoice $invoice): InvoiceDetailResource
    {
        Gate::authorize('view', $invoice);

        return InvoiceDetailResource::make($invoice->load(['items', 'candidate', 'payments.recordedBy', 'createdBy']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateInvoiceRequest $request, Invoice $invoice, InvoiceService $invoiceService): InvoiceDetailResource
    {
        $validated = $request->validated();
        $invoice = $invoiceService->update($invoice, $validated, $validated['items'], $request->user());

        return InvoiceDetailResource::make($invoice->load(['items', 'candidate', 'payments.recordedBy', 'createdBy']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Invoice $invoice, InvoiceService $invoiceService): JsonResponse
    {
        Gate::authorize('delete', $invoice);
        $invoiceService->delete($invoice);

        return response()->json(status: 204);
    }

    /**
     * Record a payment (partial or full) against the invoice.
     */
    public function recordPayment(StoreInvoicePaymentRequest $request, Invoice $invoice, InvoiceService $invoiceService): InvoiceDetailResource
    {
        $invoice = $invoiceService->recordPayment($invoice, $request->validated(), $request->user());

        return InvoiceDetailResource::make($invoice->load(['items', 'candidate', 'payments.recordedBy', 'createdBy']));
    }

    /**
     * Quick-pay: settle the invoice in full.
     */
    public function markAsPaid(Request $request, Invoice $invoice, InvoiceService $invoiceService): InvoiceDetailResource
    {
        Gate::authorize('update', $invoice);
        $invoice = $invoiceService->markAsPaid($invoice, $request->user());

        return InvoiceDetailResource::make($invoice->load(['items', 'candidate', 'payments.recordedBy', 'createdBy']));
    }

    /**
     * Cancel the invoice.
     */
    public function cancel(Request $request, Invoice $invoice, InvoiceService $invoiceService): InvoiceDetailResource
    {
        Gate::authorize('update', $invoice);
        $invoice = $invoiceService->cancel($invoice, $request->user());

        return InvoiceDetailResource::make($invoice->load(['items', 'candidate', 'payments.recordedBy', 'createdBy']));
    }
}
