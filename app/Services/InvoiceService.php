<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Candidate;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class InvoiceService
{
    public const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Mobile Banking', 'Other'];

    /**
     * @param  array<int, array{description: string, quantity: float|string, unit_price: float|string}>  $items
     */
    public function create(array $attributes, array $items, User $actor): Invoice
    {
        return DB::transaction(function () use ($attributes, $items, $actor): Invoice {
            $attributes = $this->withClientSnapshot($attributes);
            $totals = $this->calculateTotals($items, (float) ($attributes['discount_amount'] ?? 0), (float) ($attributes['tax_rate'] ?? 0));

            $invoice = Invoice::create([
                ...Arr::except($attributes, ['items']),
                'invoice_number' => $this->generateInvoiceNumber(),
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
                'amount_paid' => 0,
                'status' => 'Unpaid',
                'created_by_id' => $actor->id,
            ]);

            $this->syncItems($invoice, $items);
            $this->recalculateStatus($invoice);
            $this->activity($invoice, $actor, 'created', "Invoice {$invoice->invoice_number} created");

            return $invoice->fresh(['items', 'candidate']);
        });
    }

    /**
     * @param  array<int, array{description: string, quantity: float|string, unit_price: float|string}>  $items
     */
    public function update(Invoice $invoice, array $attributes, array $items, User $actor): Invoice
    {
        return DB::transaction(function () use ($invoice, $attributes, $items, $actor): Invoice {
            $attributes = $this->withClientSnapshot($attributes);
            $totals = $this->calculateTotals($items, (float) ($attributes['discount_amount'] ?? 0), (float) ($attributes['tax_rate'] ?? 0));

            $invoice->update([
                ...Arr::except($attributes, ['items']),
                'subtotal' => $totals['subtotal'],
                'tax_amount' => $totals['tax_amount'],
                'total' => $totals['total'],
            ]);

            $this->syncItems($invoice, $items);
            $this->recalculateStatus($invoice);
            $this->activity($invoice, $actor, 'updated', "Invoice {$invoice->invoice_number} updated");

            return $invoice->fresh(['items', 'candidate']);
        });
    }

    /**
     * @param  array{amount: float|string, method: string, paid_at?: string|null, note?: string|null}  $data
     */
    public function recordPayment(Invoice $invoice, array $data, User $actor): Invoice
    {
        return DB::transaction(function () use ($invoice, $data, $actor): Invoice {
            InvoicePayment::create([
                'invoice_id' => $invoice->id,
                'amount' => $data['amount'],
                'method' => $data['method'],
                'paid_at' => $data['paid_at'] ?? now()->toDateString(),
                'note' => $data['note'] ?? null,
                'recorded_by_id' => $actor->id,
            ]);

            $invoice->update(['amount_paid' => $invoice->payments()->sum('amount')]);
            $this->recalculateStatus($invoice);
            $this->activity($invoice, $actor, 'payment_recorded', "Payment of {$data['amount']} recorded for {$invoice->invoice_number}");

            return $invoice->fresh(['items', 'candidate', 'payments']);
        });
    }

    public function markAsPaid(Invoice $invoice, User $actor): Invoice
    {
        $balance = (float) $invoice->balance_due;
        if ($balance <= 0) {
            abort(422, 'This invoice is already fully paid.');
        }

        return $this->recordPayment($invoice, ['amount' => $balance, 'method' => 'Cash', 'note' => 'Marked as paid in full'], $actor);
    }

    public function cancel(Invoice $invoice, User $actor): Invoice
    {
        $invoice->update(['status' => 'Cancelled']);
        $this->activity($invoice, $actor, 'cancelled', "Invoice {$invoice->invoice_number} cancelled");

        return $invoice->fresh(['items', 'candidate']);
    }

    public function delete(Invoice $invoice): void
    {
        DB::transaction(fn () => $invoice->delete());
    }

    /**
     * Recompute the status of any unpaid/partial invoice whose due date has passed.
     */
    public function refreshOverdueStatuses(): void
    {
        Invoice::query()
            ->whereIn('status', ['Unpaid', 'Partial'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', now()->toDateString())
            ->update(['status' => 'Overdue']);
    }

    /**
     * @param  array<int, array{description: string, quantity: float|string, unit_price: float|string}>  $items
     * @return array{subtotal: float, tax_amount: float, total: float}
     */
    private function calculateTotals(array $items, float $discountAmount, float $taxRate): array
    {
        $subtotal = round(collect($items)->sum(fn (array $item): float => (float) $item['quantity'] * (float) $item['unit_price']), 2);
        $taxable = max($subtotal - $discountAmount, 0);
        $taxAmount = round($taxable * $taxRate / 100, 2);
        $total = round($taxable + $taxAmount, 2);

        return ['subtotal' => $subtotal, 'tax_amount' => $taxAmount, 'total' => $total];
    }

    /**
     * @param  array<int, array{description: string, quantity: float|string, unit_price: float|string}>  $items
     */
    private function syncItems(Invoice $invoice, array $items): void
    {
        $invoice->items()->delete();
        foreach ($items as $item) {
            $invoice->items()->create([
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'total' => round((float) $item['quantity'] * (float) $item['unit_price'], 2),
            ]);
        }
    }

    /**
     * Snapshot the candidate's contact details onto the invoice so billing
     * history survives the candidate later being edited or removed.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function withClientSnapshot(array $attributes): array
    {
        if (empty($attributes['candidate_id'])) {
            return $attributes;
        }

        $candidate = Candidate::query()->find($attributes['candidate_id']);
        if ($candidate === null) {
            return $attributes;
        }

        $attributes['client_name'] = $attributes['client_name'] ?? $candidate->name;
        $attributes['client_email'] = $attributes['client_email'] ?? $candidate->email;
        $attributes['client_phone'] = $attributes['client_phone'] ?? $candidate->phone;
        $attributes['client_address'] = $attributes['client_address'] ?? $candidate->address;

        return $attributes;
    }

    private function generateInvoiceNumber(): string
    {
        $year = (int) now()->year;
        $count = Invoice::query()->whereYear('created_at', $year)->lockForUpdate()->count();

        return sprintf('INV-%d-%04d', $year, $count + 1);
    }

    private function recalculateStatus(Invoice $invoice): void
    {
        if ($invoice->status === 'Cancelled') {
            return;
        }

        $status = match (true) {
            (float) $invoice->amount_paid > 0 && (float) $invoice->amount_paid >= (float) $invoice->total => 'Paid',
            $invoice->due_date !== null && $invoice->due_date->isPast() => 'Overdue',
            (float) $invoice->amount_paid > 0 => 'Partial',
            default => 'Unpaid',
        };

        if ($status !== $invoice->status) {
            $invoice->update(['status' => $status]);
        }
    }

    private function activity(Invoice $invoice, User $actor, string $action, string $description, array $meta = []): void
    {
        Activity::create(['type' => 'Invoice', 'action' => $action, 'description' => $description, 'entity_id' => $invoice->id, 'user_id' => $actor->id, 'meta' => $meta ?: null]);
    }
}
