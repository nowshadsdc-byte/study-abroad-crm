<?php

use App\Enums\RoleEnum;
use App\Models\Candidate;
use App\Models\Lead;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function leadUser(): User
{
    $user = User::query()->create([
        'name' => 'Lead Admin',
        'email' => 'lead-admin@example.com',
        'password' => Hash::make('password'),
    ]);

    $user->assignRole(RoleEnum::Administrator->value);

    return $user;
}

test('an authorized user creates and filters leads', function () {
    $user = leadUser();

    $this->actingAs($user)->postJson('/api/leads', [
        'name' => 'Ariana Rahman', 'email' => 'ariana@example.com', 'address' => 'Dhanmondi, Dhaka', 'source' => 'Website', 'status' => 'New', 'priority' => 'High',
    ])->assertCreated()->assertJsonPath('data.name', 'Ariana Rahman')->assertJsonPath('data.address', 'Dhanmondi, Dhaka');

    Lead::query()->create(['name' => 'Other Lead', 'source' => 'Facebook', 'status' => 'Lost', 'priority' => 'Low']);

    $this->getJson('/api/leads?search=Dhaka&status=New&source=Website')->assertOk()->assertJsonCount(1, 'data');
});

test('leads can be filtered by interested country and return filter options', function () {
    $user = leadUser();
    Lead::query()->create([
        'name' => 'Canada Lead',
        'source' => 'Website',
        'interest_country' => 'Canada',
        'status' => 'New',
        'priority' => 'Medium',
    ]);
    Lead::query()->create([
        'name' => 'UK Lead',
        'source' => 'Referral',
        'interest_country' => 'United Kingdom',
        'status' => 'Contacted',
        'priority' => 'High',
    ]);

    $response = $this->actingAs($user)
        ->getJson('/api/leads?interest_country=Canada')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Canada Lead');

    expect($response->json('filter_options.countries'))->toBe(['Canada', 'United Kingdom'])
        ->and($response->json('filter_options.sources'))->toBe(['Referral', 'Website']);
});

test('invalid lead payload returns validation errors', function () {
    $user = leadUser();

    $this->actingAs($user)->postJson('/api/leads', ['name' => '', 'source' => 'Invalid', 'status' => 'Invalid', 'priority' => 'Invalid'])
        ->assertUnprocessable()->assertJsonValidationErrors(['name', 'source', 'status', 'priority']);

    $this->actingAs($user)->postJson('/api/leads', [
        'name' => 'Address Validation', 'address' => str_repeat('a', 501), 'source' => 'Website', 'status' => 'New', 'priority' => 'Medium',
    ])->assertUnprocessable()->assertJsonValidationErrors(['address']);
});

test('lead contact details must be unique and phone numbers must be valid', function () {
    $user = leadUser();

    foreach ([
        '+8801711000111' => '+8801711000111',
        '8801711000112' => '+8801711000112',
        '01711000113' => '+8801711000113',
    ] as $phone => $expectedPhone) {
        $this->actingAs($user)->postJson('/api/leads', [
            'name' => "Valid Phone Lead {$phone}",
            'email' => "valid-phone-{$phone}@example.com",
            'phone' => $phone,
            'source' => 'Website',
            'status' => 'New',
            'priority' => 'Medium',
        ])->assertCreated()->assertJsonPath('data.phone', $expectedPhone);
    }

    $this->actingAs($user)->postJson('/api/leads', [
        'name' => 'Duplicate Lead',
        'phone' => '01711000111',
        'source' => 'Website',
        'status' => 'New',
        'priority' => 'Medium',
    ])->assertUnprocessable()->assertJsonValidationErrors(['phone']);

    foreach (['phone-number', '+8801211000111', '0171100011', '017110001111', '01801711000111'] as $phone) {
        $this->actingAs($user)->postJson('/api/leads', [
            'name' => 'Invalid Phone Lead',
            'phone' => $phone,
            'source' => 'Website',
            'status' => 'New',
            'priority' => 'Medium',
        ])->assertUnprocessable()->assertJsonValidationErrors(['phone']);
    }
});

test('follow ups update workflow status and conversion is idempotent', function () {
    $user = leadUser();
    $lead = Lead::query()->create(['name' => 'Convert Me', 'address' => 'Banani, Dhaka', 'source' => 'Website', 'status' => 'New', 'priority' => 'Medium']);

    $this->actingAs($user)->postJson("/api/leads/{$lead->id}/follow-ups", ['type' => 'Call', 'notes' => 'Ready to proceed', 'outcome' => 'Interested'])
        ->assertCreated();
    expect($lead->fresh()->status)->toBe('Qualified');

    $this->postJson("/api/leads/{$lead->id}/convert")->assertOk();
    $this->postJson("/api/leads/{$lead->id}/convert")->assertOk();

    expect(Candidate::query()->where('lead_id', $lead->id)->count())->toBe(1)
        ->and(Candidate::query()->first()->address)->toBe('Banani, Dhaka')
        ->and(Candidate::query()->first()->progressRecords()->count())->toBe(6);
});

test('an authorized user can update a lead and reassign it', function () {
    $user = leadUser();
    $assignee = User::query()->create([
        'name' => 'Sales Agent',
        'email' => 'sales-agent@example.com',
        'password' => Hash::make('password'),
    ]);
    $lead = Lead::query()->create(['name' => 'Update Me', 'source' => 'Website', 'status' => 'New', 'priority' => 'Medium']);

    $this->actingAs($user)->putJson("/api/leads/{$lead->id}", [
        'name' => 'Updated Name', 'email' => 'updated@example.com', 'phone' => '01711000222',
        'address' => 'Uttara, Dhaka', 'source' => 'Referral', 'status' => 'Contacted', 'priority' => 'High',
        'interest_country' => 'Canada', 'assigned_to_id' => $assignee->id,
    ])->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.phone', '+8801711000222')->assertJsonPath('data.address', 'Uttara, Dhaka')->assertJsonPath('data.assigned_to.id', $assignee->id);

    $this->getJson('/api/leads/assignable-users')->assertOk()->assertJsonFragment(['name' => 'Sales Agent']);
});

test('leads can be filtered to only those needing follow-up', function () {
    $user = leadUser();
    $dueLead = Lead::query()->create(['name' => 'Due Lead', 'source' => 'Website', 'status' => 'Contacted', 'priority' => 'Medium']);
    $dueLead->followUps()->create(['type' => 'Call', 'notes' => 'Follow up', 'next_follow_up_date' => now()->subDay()]);
    $futureLead = Lead::query()->create(['name' => 'Future Lead', 'source' => 'Website', 'status' => 'Contacted', 'priority' => 'Medium']);
    $futureLead->followUps()->create(['type' => 'Call', 'notes' => 'Follow up', 'next_follow_up_date' => now()->addDays(5)]);
    $convertedLead = Lead::query()->create(['name' => 'Converted Lead', 'source' => 'Website', 'status' => 'Converted', 'priority' => 'Medium']);
    $convertedLead->followUps()->create(['type' => 'Call', 'notes' => 'Follow up', 'next_follow_up_date' => now()->subDay()]);

    $this->actingAs($user)->getJson('/api/leads?needs_follow_up=1')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Due Lead');
});

test('archiving soft deletes a lead and removes it from the index', function () {
    $user = leadUser();
    $lead = Lead::query()->create(['name' => 'Archive Me', 'source' => 'Website', 'status' => 'New', 'priority' => 'Medium']);

    $this->actingAs($user)->deleteJson("/api/leads/{$lead->id}")->assertNoContent();

    $this->assertSoftDeleted('leads', ['id' => $lead->id]);
    $this->getJson('/api/leads')->assertOk()->assertJsonCount(0, 'data');
});
