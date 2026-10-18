<?php

use App\Models\Candidate;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\LeadFollowUp;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns summary metrics that match the underlying data', function (): void {
    $this->seed(RolePermissionSeeder::class);

    $user = User::factory()->create(['name' => 'Joy Ahmed']);
    $user->assignRole('Administrator');
    $this->actingAs($user);

    $now = now()->setTimezone('Asia/Dhaka');

    Lead::query()->create([
        'name' => 'Amina Rahman',
        'email' => 'amina@example.com',
        'status' => 'New',
        'created_at' => $now->subDays(12),
        'updated_at' => $now->subDays(12),
    ]);

    Lead::query()->create([
        'name' => 'Nabil Islam',
        'email' => 'nabil@example.com',
        'status' => 'Qualified',
        'created_at' => $now->subDays(21),
        'updated_at' => $now->subDays(21),
    ]);

    $convertedLead = Lead::query()->create([
        'name' => 'Rafiq Hasan',
        'email' => 'rafiq@example.com',
        'status' => 'Converted',
        'created_at' => $now->subDays(5),
        'updated_at' => $now->subDays(5),
    ]);

    LeadFollowUp::query()->create([
        'lead_id' => $convertedLead->id,
        'type' => 'Call',
        'notes' => 'Follow up today',
        'outcome' => 'Interested',
        'follow_up_date' => $now->subDays(1),
        'next_follow_up_date' => $now->addHours(2),
        'created_by_id' => $user->id,
    ]);

    LeadFollowUp::query()->create([
        'lead_id' => $convertedLead->id,
        'type' => 'Meeting',
        'notes' => 'Follow up later today',
        'outcome' => 'Interested',
        'follow_up_date' => $now->subDays(2),
        'next_follow_up_date' => $now->addHours(5),
        'created_by_id' => $user->id,
    ]);

    Candidate::query()->create([
        'name' => 'Sadia Karim',
        'email' => 'sadia@example.com',
        'status' => 'Offer',
        'assigned_to_id' => $user->id,
        'created_at' => $now->subDays(7),
        'updated_at' => $now->subDays(7),
    ]);

    Candidate::query()->create([
        'name' => 'Mahmud Ali',
        'email' => 'mahmud@example.com',
        'status' => 'Visa Approved',
        'assigned_to_id' => $user->id,
        'created_at' => $now->subDays(4),
        'updated_at' => $now->subDays(4),
    ]);

    Invoice::query()->create([
        'candidate_id' => null,
        'invoice_number' => 'INV-1001',
        'client_name' => 'Sample client',
        'client_email' => 'client@example.com',
        'client_phone' => '01800000000',
        'client_address' => 'Dhaka',
        'issue_date' => $now->subDays(10)->toDateString(),
        'due_date' => $now->addDays(15)->toDateString(),
        'subtotal' => 100000,
        'discount_amount' => 0,
        'tax_rate' => 0,
        'tax_amount' => 0,
        'total' => 100000,
        'amount_paid' => 90000,
        'status' => 'Paid',
        'created_by_id' => $user->id,
    ]);

    Invoice::query()->create([
        'candidate_id' => null,
        'invoice_number' => 'INV-1002',
        'client_name' => 'Sample client 2',
        'client_email' => 'client2@example.com',
        'client_phone' => '01700000000',
        'client_address' => 'Chattogram',
        'issue_date' => $now->subDays(5)->toDateString(),
        'due_date' => $now->addDays(5)->toDateString(),
        'subtotal' => 50000,
        'discount_amount' => 0,
        'tax_rate' => 0,
        'tax_amount' => 0,
        'total' => 50000,
        'amount_paid' => 30000,
        'status' => 'Partial',
        'created_by_id' => $user->id,
    ]);

    $response = $this->actingAs($user)->getJson('/api/dashboard/summary');

    $response->assertOk();
    expect($response->json('greeting_name'))->toBe('Joy');
    expect($response->json('today.followups_due'))->toBeGreaterThanOrEqual(1);
    expect($response->json('kpis.new_leads.value'))->toBeGreaterThanOrEqual(2);
    expect($response->json('kpis.followups_today.value'))->toBeGreaterThanOrEqual(1);
    expect($response->json('kpis.conversions.value'))->toBeGreaterThanOrEqual(1);
    expect($response->json('kpis.offers'))->toBe(1);
    expect($response->json('kpis.visas_approved.value'))->toBe(1);
    expect($response->json('kpis.collections_bdt'))->toBe(120000);
    expect($response->json('kpis.outstanding_bdt'))->toBe(30000);
});
