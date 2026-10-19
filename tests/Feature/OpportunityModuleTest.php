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

test('opportunities store structured eligibility criteria', function () {
    $user = opportunityUser();
    $university = University::query()->create(['name' => 'Eligibility University', 'country' => 'Canada']);
    $criteria = [
        'minimum_ielts_band' => 6.5,
        'minimum_gpa' => 3,
        'maximum_study_gap_years' => 2,
        'minimum_education_level' => "Bachelor's Degree",
        'required_subjects' => ['Computer Science'],
        'minimum_work_experience_years' => 1,
        'accepted_qualification_countries' => ['Bangladesh'],
    ];

    $this->actingAs($user)->postJson('/api/opportunities', [
        'university_id' => $university->id,
        'title' => 'Structured Criteria Program',
        'status' => 'Open',
        'eligibility_criteria' => $criteria,
    ])->assertCreated()->assertJsonPath('data.eligibility_criteria.minimum_ielts_band', 6.5);

    expect(Opportunity::query()->where('title', 'Structured Criteria Program')->first()?->eligibility_criteria)
        ->toMatchArray($criteria);
});

test('eligibility evaluation returns supported decisions and explanations', function () {
    $user = opportunityUser();
    $university = University::query()->create(['name' => 'Matcher University', 'country' => 'Canada']);
    $candidate = Candidate::query()->create([
        'name' => 'Matcher Candidate',
        'education_level' => "Bachelor's Degree",
        'gpa' => 3.5,
        'ielts_score' => 7,
        'status' => 'Active',
    ]);
    Opportunity::query()->create([
        'university_id' => $university->id,
        'title' => 'Eligible Programme',
        'level' => 'Master',
        'status' => 'Open',
        'eligibility_criteria' => [
            'minimum_ielts_band' => 6.5,
            'minimum_gpa' => 3,
            'maximum_study_gap_years' => 2,
            'minimum_education_level' => "Bachelor's Degree",
        ],
    ]);
    Opportunity::query()->create([
        'university_id' => $university->id,
        'title' => 'Not Eligible Programme',
        'level' => 'Master',
        'status' => 'Open',
        'eligibility_criteria' => ['minimum_gpa' => 4.5],
    ]);
    Opportunity::query()->create([
        'university_id' => $university->id,
        'title' => 'Manual Review Programme',
        'level' => 'Master',
        'status' => 'Limited',
        'requirements' => 'Two recommendation letters',
        'eligibility_criteria' => ['required_subjects' => ['Calculus']],
    ]);
    Opportunity::query()->create([
        'university_id' => $university->id,
        'title' => 'Closed Programme',
        'status' => 'Closed',
        'eligibility_criteria' => ['minimum_gpa' => 0],
    ]);

    $this->actingAs($user)->getJson("/api/eligibility/students/candidate/{$candidate->id}")
        ->assertOk()
        ->assertJsonPath('data.credentials.ielts_score', 7)
        ->assertJsonPath('data.credentials.gpa', 3.5)
        ->assertJsonMissingPath('data.email');

    $response = $this->postJson('/api/eligibility/evaluate', [
        'student_type' => 'candidate',
        'student_id' => $candidate->id,
        'ielts_score' => 7,
        'gpa' => 3.5,
        'study_gap_years' => 1,
        'education_level' => "Bachelor's Degree",
    ])->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('matches_count', 1)
        ->assertJsonPath('data.0.status', 'Eligible')
        ->assertJsonPath('data.1.status', 'Needs Review')
        ->assertJsonPath('data.2.status', 'Not Eligible');

    expect($response->json('data.0.checks.0.detail'))->toContain('6.5')
        ->and($response->json('data.1.checks'))->toHaveCount(2);
});

test('eligibility evaluation requires opportunity and selected student permissions', function () {
    $receptionist = User::query()->create([
        'name' => 'Matcher Receptionist',
        'email' => 'matcher-receptionist@example.com',
        'password' => Hash::make('password'),
    ]);
    $receptionist->assignRole(RoleEnum::Receptionist->value);

    $candidate = Candidate::query()->create(['name' => 'Private Candidate', 'status' => 'Active']);

    $this->actingAs($receptionist)
        ->getJson("/api/eligibility/students/candidate/{$candidate->id}")
        ->assertForbidden();

    $this->postJson('/api/eligibility/evaluate', [
        'student_type' => 'candidate',
        'student_id' => $candidate->id,
        'ielts_score' => 7,
        'gpa' => 3.5,
        'study_gap_years' => 0,
    ])->assertForbidden();
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
