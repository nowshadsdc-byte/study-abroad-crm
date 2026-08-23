<?php

use App\Enums\RoleEnum;
use App\Models\Candidate;
use App\Models\CandidateApplication;
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

function opportunityUser(): User
{
    $user = User::query()->create([
        'name' => 'Opportunity Admin',
        'email' => 'opportunity-admin@example.com',
        'password' => Hash::make('password'),
    ]);

    $user->assignRole(RoleEnum::Administrator->value);

    return $user;
}

test('an authorized user creates a university and filters it', function () {
    $user = opportunityUser();

    $this->actingAs($user)->postJson('/api/universities', [
        'name' => 'University of Toronto', 'country' => 'Canada', 'city' => 'Toronto', 'programs' => 'Computer Science, Business, Engineering',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'University of Toronto')
        ->assertJsonPath('data.programs', ['Computer Science', 'Business', 'Engineering']);

    University::query()->create(['name' => 'Other University', 'country' => 'Germany']);

    $this->getJson('/api/universities?search=Toronto')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/universities?country=Germany')->assertOk()->assertJsonCount(1, 'data');
});

test('universities can be filtered by active status and default to active on create', function () {
    $user = opportunityUser();

    $this->actingAs($user)->postJson('/api/universities', [
        'name' => 'University of Toronto', 'country' => 'Canada',
    ])->assertCreated()->assertJsonPath('data.is_active', true);

    University::query()->create(['name' => 'Inactive University', 'country' => 'Germany', 'is_active' => false]);

    $this->getJson('/api/universities?is_active=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'University of Toronto');
    $this->getJson('/api/universities?is_active=0')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Inactive University');
});

test('university name must be unique and country is required', function () {
    $user = opportunityUser();
    University::query()->create(['name' => 'Existing University', 'country' => 'Canada']);

    $this->actingAs($user)->postJson('/api/universities', ['name' => 'Existing University', 'country' => 'Canada'])
        ->assertUnprocessable()->assertJsonValidationErrors(['name']);

    $this->postJson('/api/universities', ['name' => ''])
        ->assertUnprocessable()->assertJsonValidationErrors(['name', 'country']);
});

test('an authorized user creates and filters opportunities', function () {
    $user = opportunityUser();
    $university = University::query()->create(['name' => 'McGill University', 'country' => 'Canada']);

    $this->actingAs($user)->postJson('/api/opportunities', [
        'university_id' => $university->id, 'title' => 'Bachelor of Computer Science', 'program' => 'Computer Science',
        'level' => 'Bachelor', 'status' => 'Open', 'intake' => 'Fall 2025', 'tuition_fee' => 25000, 'currency' => 'cad',
    ])->assertCreated()
        ->assertJsonPath('data.title', 'Bachelor of Computer Science')
        ->assertJsonPath('data.currency', 'CAD');

    Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Diploma in Business', 'status' => 'Closed', 'level' => 'Diploma']);

    $this->getJson('/api/opportunities?status=Open')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/opportunities?level=Diploma')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/opportunities?university_id={$university->id}")->assertOk()->assertJsonCount(2, 'data');
    $this->getJson('/api/opportunities?search=Bachelor')->assertOk()->assertJsonCount(1, 'data');
});

test('invalid opportunity payload returns validation errors', function () {
    $user = opportunityUser();

    $this->actingAs($user)->postJson('/api/opportunities', ['title' => '', 'university_id' => 999, 'level' => 'Invalid', 'status' => 'Invalid'])
        ->assertUnprocessable()->assertJsonValidationErrors(['title', 'university_id', 'level', 'status']);
});

test('an authorized user can update an opportunity', function () {
    $user = opportunityUser();
    $university = University::query()->create(['name' => 'York University', 'country' => 'Canada']);
    $opportunity = Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Original Title', 'status' => 'Open']);

    $this->actingAs($user)->putJson("/api/opportunities/{$opportunity->id}", [
        'university_id' => $university->id, 'title' => 'Updated Title', 'status' => 'Limited',
    ])->assertOk()->assertJsonPath('data.title', 'Updated Title')->assertJsonPath('data.status', 'Limited');
});

test('deleting an opportunity cascades to its candidate applications', function () {
    $user = opportunityUser();
    $university = University::query()->create(['name' => 'Simon Fraser University', 'country' => 'Canada']);
    $opportunity = Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Master of Data Science', 'status' => 'Open']);
    $candidate = Candidate::query()->create(['name' => 'Test Candidate', 'status' => 'Active']);
    $application = CandidateApplication::query()->create(['candidate_id' => $candidate->id, 'opportunity_id' => $opportunity->id, 'status' => 'Draft']);

    $this->actingAs($user)->deleteJson("/api/opportunities/{$opportunity->id}")->assertNoContent();

    expect(Opportunity::query()->find($opportunity->id))->toBeNull()
        ->and(CandidateApplication::query()->find($application->id))->toBeNull();
});

test('deleting a university cascades to its opportunities and their candidate applications', function () {
    $user = opportunityUser();
    $university = University::query()->create(['name' => 'University of Waterloo', 'country' => 'Canada']);
    $opportunity = Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Bachelor of Engineering', 'status' => 'Open']);
    $candidate = Candidate::query()->create(['name' => 'Cascade Candidate', 'status' => 'Active']);
    $application = CandidateApplication::query()->create(['candidate_id' => $candidate->id, 'opportunity_id' => $opportunity->id, 'status' => 'Draft']);

    $this->actingAs($user)->deleteJson("/api/universities/{$university->id}")->assertNoContent();

    expect(University::query()->find($university->id))->toBeNull()
        ->and(Opportunity::query()->find($opportunity->id))->toBeNull()
        ->and(CandidateApplication::query()->find($application->id))->toBeNull();
});
