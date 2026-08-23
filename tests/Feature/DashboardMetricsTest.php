<?php

use App\Enums\RoleEnum;
use App\Models\Candidate;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\University;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function dashboardUser(): User
{
    $user = User::query()->create([
        'name' => 'Dashboard Admin',
        'email' => 'dashboard-admin@example.com',
        'password' => Hash::make('password'),
    ]);
    $user->assignRole(RoleEnum::Administrator->value);

    return $user;
}

test('dashboard metrics summarize leads, candidates, programs, universities, and users', function () {
    $user = dashboardUser();

    Lead::query()->create(['name' => 'New Lead', 'status' => 'New', 'source' => 'Website']);
    $dueLead = Lead::query()->create(['name' => 'Due Lead', 'status' => 'Contacted', 'source' => 'Website']);
    $dueLead->followUps()->create(['type' => 'Call', 'notes' => 'Follow up', 'next_follow_up_date' => now()->subDay()]);
    $futureLead = Lead::query()->create(['name' => 'Future Lead', 'status' => 'Contacted', 'source' => 'Website']);
    $futureLead->followUps()->create(['type' => 'Call', 'notes' => 'Follow up', 'next_follow_up_date' => now()->addDays(5)]);
    $convertedLead = Lead::query()->create(['name' => 'Converted Lead', 'status' => 'Converted', 'source' => 'Website']);
    $convertedLead->followUps()->create(['type' => 'Call', 'notes' => 'Follow up', 'next_follow_up_date' => now()->subDay()]);

    Candidate::query()->create(['name' => 'Active Candidate', 'status' => 'Active']);
    Candidate::query()->create(['name' => 'Completed Candidate', 'status' => 'Completed']);

    $university = University::query()->create(['name' => 'Active University', 'country' => 'Canada', 'is_active' => true]);
    University::query()->create(['name' => 'Inactive University', 'country' => 'Canada', 'is_active' => false]);

    Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Open Program', 'status' => 'Open']);
    Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Closed Program', 'status' => 'Closed']);

    $response = $this->actingAs($user)->getJson('/api/dashboard/metrics')->assertOk();

    expect($response->json('data.total_leads'))->toBe(4)
        ->and($response->json('data.new_leads'))->toBe(1)
        ->and($response->json('data.followup_leads'))->toBe(1)
        ->and($response->json('data.total_candidates'))->toBe(2)
        ->and($response->json('data.completed_candidates'))->toBe(1)
        ->and($response->json('data.active_programs'))->toBe(1)
        ->and($response->json('data.active_universities'))->toBe(1)
        ->and($response->json('data.total_users'))->toBe(User::query()->count());
});

test('a user without dashboard permission cannot access the metrics endpoint', function () {
    $user = User::query()->create([
        'name' => 'No Access',
        'email' => 'no-access@example.com',
        'password' => Hash::make('password'),
    ]);

    $this->actingAs($user)->getJson('/api/dashboard/metrics')->assertForbidden();
});
