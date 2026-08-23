<?php

use App\Enums\RoleEnum;
use App\Models\Candidate;
use App\Models\Invoice;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function financeUser(): User
{
    $user = User::query()->create([
        'name' => 'Finance Admin',
        'email' => 'finance-admin@example.com',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole(RoleEnum::Administrator->value);

    return $user;
}

function financeReceptionist(): User
{
    $user = User::query()->create([
        'name' => 'Front Desk',
        'email' => 'receptionist@example.com',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole(RoleEnum::Receptionist->value);

    return $user;
}

test('an invoice can be created for a manually entered client with computed totals', function () {
    $user = financeUser();

    $response = $this->actingAs($user)->postJson('/api/invoices', [
        'client_name' => 'Acme Corp',
        'client_email' => 'billing@acme.test',
        'issue_date' => now()->toDateString(),
        'due_date' => now()->addDays(14)->toDateString(),
        'discount_amount' => 50,
        'tax_rate' => 10,
        'items' => [
            ['description' => 'Consultation fee', 'quantity' => 2, 'unit_price' => 100],
            ['description' => 'Application fee', 'quantity' => 1, 'unit_price' => 300],
        ],
    ]);

    $response->assertCreated();
    $invoice = Invoice::query()->firstOrFail();
    expect($invoice->invoice_number)->toStartWith('INV-'.now()->year.'-')
        ->and((string) $invoice->subtotal)->toBe('500.00')
        ->and((string) $invoice->tax_amount)->toBe('45.00')
        ->and((string) $invoice->total)->toBe('495.00')
        ->and($invoice->status)->toBe('Unpaid')
        ->and($invoice->items()->count())->toBe(2);
});

test('an invoice linked to a candidate snapshots the candidate contact details', function () {
    $user = financeUser();
    $candidate = Candidate::query()->create(['name' => 'Arif Hossain', 'email' => 'arif@example.com', 'phone' => '+8801711000111', 'status' => 'Active']);

    $response = $this->actingAs($user)->postJson('/api/invoices', [
        'candidate_id' => $candidate->id,
        'issue_date' => now()->toDateString(),
        'items' => [['description' => 'Service fee', 'quantity' => 1, 'unit_price' => 1000]],
    ]);

    $response->assertCreated();
    $invoice = Invoice::query()->firstOrFail();
    expect($invoice->client_name)->toBe('Arif Hossain')
        ->and($invoice->client_email)->toBe('arif@example.com')
        ->and($invoice->client_phone)->toBe('+8801711000111');
});

test('creating an invoice without a candidate requires a client name', function () {
    $user = financeUser();

    $this->actingAs($user)->postJson('/api/invoices', [
        'issue_date' => now()->toDateString(),
        'items' => [['description' => 'Service fee', 'quantity' => 1, 'unit_price' => 1000]],
    ])->assertUnprocessable()->assertJsonValidationErrors(['client_name']);
});

test('creating an invoice requires at least one line item', function () {
    $user = financeUser();

    $this->actingAs($user)->postJson('/api/invoices', [
        'client_name' => 'Acme Corp',
        'issue_date' => now()->toDateString(),
        'items' => [],
    ])->assertUnprocessable()->assertJsonValidationErrors(['items']);
});

test('recording a partial payment updates the amount paid, balance due, and status', function () {
    $user = financeUser();
    $invoice = Invoice::query()->create([
        'client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(),
        'subtotal' => 1000, 'total' => 1000, 'amount_paid' => 0, 'status' => 'Unpaid',
    ]);

    $response = $this->actingAs($user)->postJson("/api/invoices/{$invoice->id}/payments", [
        'amount' => 400, 'method' => 'Bank Transfer',
    ]);

    $response->assertOk();
    $invoice->refresh();
    expect((string) $invoice->amount_paid)->toBe('400.00')
        ->and((float) $invoice->balance_due)->toBe(600.0)
        ->and($invoice->status)->toBe('Partial')
        ->and($invoice->payments()->count())->toBe(1);
});

test('a payment cannot exceed the remaining balance due', function () {
    $user = financeUser();
    $invoice = Invoice::query()->create([
        'client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(),
        'subtotal' => 1000, 'total' => 1000, 'amount_paid' => 0, 'status' => 'Unpaid',
    ]);

    $this->actingAs($user)->postJson("/api/invoices/{$invoice->id}/payments", [
        'amount' => 1500, 'method' => 'Cash',
    ])->assertUnprocessable()->assertJsonValidationErrors(['amount']);
});

test('quick pay settles the full remaining balance and marks the invoice paid', function () {
    $user = financeUser();
    $invoice = Invoice::query()->create([
        'client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(),
        'subtotal' => 1000, 'total' => 1000, 'amount_paid' => 250, 'status' => 'Partial',
    ]);
    $invoice->payments()->create(['amount' => 250, 'method' => 'Cash', 'paid_at' => now()]);

    $response = $this->actingAs($user)->postJson("/api/invoices/{$invoice->id}/mark-paid");

    $response->assertOk();
    $invoice->refresh();
    expect((string) $invoice->amount_paid)->toBe('1000.00')
        ->and($invoice->status)->toBe('Paid')
        ->and((float) $invoice->balance_due)->toBe(0.0)
        ->and($invoice->payments()->count())->toBe(2);
});

test('quick pay on an already fully paid invoice is rejected', function () {
    $user = financeUser();
    $invoice = Invoice::query()->create([
        'client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(),
        'subtotal' => 1000, 'total' => 1000, 'amount_paid' => 1000, 'status' => 'Paid',
    ]);

    $this->actingAs($user)->postJson("/api/invoices/{$invoice->id}/mark-paid")->assertUnprocessable();
});

test('cancelling an invoice sets its status and further recalculation does not override it', function () {
    $user = financeUser();
    $invoice = Invoice::query()->create([
        'client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(), 'due_date' => now()->subDays(30)->toDateString(),
        'subtotal' => 1000, 'total' => 1000, 'amount_paid' => 0, 'status' => 'Unpaid',
    ]);

    $this->actingAs($user)->postJson("/api/invoices/{$invoice->id}/cancel")->assertOk();
    expect($invoice->fresh()->status)->toBe('Cancelled');

    // Overdue refresh (triggered by listing invoices) must not resurrect a cancelled invoice.
    $this->actingAs($user)->getJson('/api/invoices')->assertOk();
    expect($invoice->fresh()->status)->toBe('Cancelled');
});

test('invoices past their due date are surfaced as overdue when the list is loaded', function () {
    $user = financeUser();
    $invoice = Invoice::query()->create([
        'client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->subDays(60)->toDateString(), 'due_date' => now()->subDays(30)->toDateString(),
        'subtotal' => 1000, 'total' => 1000, 'amount_paid' => 0, 'status' => 'Unpaid',
    ]);

    $this->actingAs($user)->getJson('/api/invoices')->assertOk();
    expect($invoice->fresh()->status)->toBe('Overdue');
});

test('the finance dashboard metrics reflect revenue, outstanding, overdue, and total invoiced amounts', function () {
    $user = financeUser();
    Invoice::query()->create(['client_name' => 'Paid Co', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(), 'subtotal' => 500, 'total' => 500, 'amount_paid' => 500, 'status' => 'Paid']);
    Invoice::query()->create(['client_name' => 'Partial Co', 'invoice_number' => 'INV-2026-0002', 'issue_date' => now()->toDateString(), 'subtotal' => 300, 'total' => 300, 'amount_paid' => 100, 'status' => 'Partial']);
    Invoice::query()->create(['client_name' => 'Overdue Co', 'invoice_number' => 'INV-2026-0003', 'issue_date' => now()->subDays(60)->toDateString(), 'due_date' => now()->subDays(30)->toDateString(), 'subtotal' => 200, 'total' => 200, 'amount_paid' => 0, 'status' => 'Unpaid']);
    Invoice::query()->create(['client_name' => 'Cancelled Co', 'invoice_number' => 'INV-2026-0004', 'issue_date' => now()->toDateString(), 'subtotal' => 999, 'total' => 999, 'amount_paid' => 0, 'status' => 'Cancelled']);

    $response = $this->actingAs($user)->getJson('/api/invoices')->assertOk();

    expect((float) $response->json('metrics.total_revenue'))->toEqual(500.0)
        ->and((float) $response->json('metrics.outstanding'))->toEqual(400.0)
        ->and((float) $response->json('metrics.overdue'))->toEqual(200.0)
        ->and((float) $response->json('metrics.total_invoiced'))->toEqual(1000.0);
});

test('invoices can be searched by number and filtered by status', function () {
    $user = financeUser();
    Invoice::query()->create(['client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(), 'total' => 100, 'status' => 'Paid']);
    Invoice::query()->create(['client_name' => 'Beta LLC', 'invoice_number' => 'INV-2026-0002', 'issue_date' => now()->toDateString(), 'total' => 200, 'status' => 'Unpaid']);

    $this->actingAs($user)->getJson('/api/invoices?search=Beta')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.client_name', 'Beta LLC');
    $this->actingAs($user)->getJson('/api/invoices?status=Paid')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.invoice_number', 'INV-2026-0001');
});

test('updating an invoice recalculates totals from the new line items and preserves amount paid', function () {
    $user = financeUser();
    $invoice = Invoice::query()->create([
        'client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(),
        'subtotal' => 1000, 'total' => 1000, 'amount_paid' => 300, 'status' => 'Partial',
    ]);

    $response = $this->actingAs($user)->putJson("/api/invoices/{$invoice->id}", [
        'client_name' => 'Acme Corp',
        'issue_date' => now()->toDateString(),
        'items' => [['description' => 'Revised service fee', 'quantity' => 1, 'unit_price' => 800]],
    ]);

    $response->assertOk();
    $invoice->refresh();
    expect((string) $invoice->total)->toBe('800.00')
        ->and((string) $invoice->amount_paid)->toBe('300.00')
        ->and($invoice->status)->toBe('Partial')
        ->and($invoice->items()->count())->toBe(1);
});

test('deleting an invoice removes its items and payments', function () {
    $user = financeUser();
    $invoice = Invoice::query()->create([
        'client_name' => 'Acme Corp', 'invoice_number' => 'INV-2026-0001', 'issue_date' => now()->toDateString(), 'total' => 500, 'status' => 'Unpaid',
    ]);
    $invoice->items()->create(['description' => 'Fee', 'quantity' => 1, 'unit_price' => 500, 'total' => 500]);
    $invoice->payments()->create(['amount' => 100, 'method' => 'Cash', 'paid_at' => now()]);

    $this->actingAs($user)->deleteJson("/api/invoices/{$invoice->id}")->assertNoContent();

    expect(Invoice::query()->count())->toBe(0)
        ->and(DB::table('invoice_items')->count())->toBe(0)
        ->and(DB::table('invoice_payments')->count())->toBe(0);
});

test('a user without finance permissions cannot access invoices', function () {
    $user = financeReceptionist();

    $this->actingAs($user)->getJson('/api/invoices')->assertForbidden();
    $this->actingAs($user)->postJson('/api/invoices', [])->assertForbidden();
});
