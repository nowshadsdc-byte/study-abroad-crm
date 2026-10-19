<?php

use App\Enums\RoleEnum;
use App\Models\Candidate;
use App\Models\Lead;
use App\Models\Opportunity;
use App\Models\University;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->university = University::query()->create(['name' => 'Test University', 'country' => 'Canada']);
});

function matchProgramme(University $university, string $title, array $criteria, string $status = 'Open'): Opportunity
{
    return Opportunity::query()->create([
        'university_id' => $university->id,
        'title' => $title,
        'status' => $status,
        'eligibility_criteria' => $criteria,
    ]);
}

function matchCandidate(array $attributes = []): Candidate
{
    return Candidate::query()->create(['name' => 'Raisa Chowdhury', 'status' => 'Active', 'ielts_score' => 7, 'gpa' => 3.5, 'education_level' => "Bachelor's Degree", ...$attributes]);
}

test('the match by student page renders for staff who can view programmes', function () {
    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->get(route('leads.match'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('leads/match'));
});

test('staff without programme access cannot use the matcher', function () {
    $receptionist = taskStaff(RoleEnum::Receptionist);
    $candidate = matchCandidate();

    $this->actingAs($receptionist)->get(route('leads.match'))->assertForbidden();
    $this->postJson('/api/eligibility/evaluate', ['student_type' => 'candidate', 'student_id' => $candidate->id])->assertForbidden();
});

test('the student profile endpoint returns academic credentials', function () {
    $candidate = matchCandidate();

    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->getJson("/api/eligibility/students/candidate/{$candidate->id}")
        ->assertOk()
        ->assertJsonPath('data.name', 'Raisa Chowdhury')
        ->assertJsonPath('data.credentials.ielts_score', 7)
        ->assertJsonPath('data.credentials.education_level', "Bachelor's Degree");
});

test('unknown student types and non-numeric ids are not found', function () {
    $this->actingAs(taskStaff(RoleEnum::Counselor));

    $this->getJson('/api/eligibility/students/user/1')->assertNotFound();
    $this->getJson('/api/eligibility/students/candidate/abc')->assertNotFound();
});

test('a lead profile falls back to its linked client credentials and interests', function () {
    $lead = Lead::query()->create(['name' => 'Kazi Nayeem', 'source' => 'Website', 'status' => 'New', 'priority' => 'High', 'interest_course' => 'Computer Science']);
    matchCandidate(['lead_id' => $lead->id, 'gpa' => 3.8]);

    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->getJson("/api/eligibility/students/lead/{$lead->id}")
        ->assertOk()
        ->assertJsonPath('data.credentials.gpa', 3.8)
        ->assertJsonPath('data.credentials.desired_course', 'Computer Science');
});

test('programmes are evaluated and ranked with eligible matches first', function () {
    $candidate = matchCandidate();
    $tooStrict = matchProgramme($this->university, 'Strict MSc', ['minimum_ielts_band' => 8]);
    $unconfigured = matchProgramme($this->university, 'Unconfigured MBA', []);
    $match = matchProgramme($this->university, 'MSc Data Science', ['minimum_ielts_band' => 6.5, 'minimum_gpa' => 3, 'minimum_education_level' => "Bachelor's Degree"]);
    matchProgramme($this->university, 'Closed programme', ['minimum_ielts_band' => 5], 'Closed');

    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->postJson('/api/eligibility/evaluate', ['student_type' => 'candidate', 'student_id' => $candidate->id])
        ->assertOk()
        ->assertJsonPath('matches_count', 1)
        ->assertJsonPath('status_counts', ['Eligible' => 1, 'Needs Review' => 1, 'Not Eligible' => 1])
        ->assertJsonPath('data.0.id', $match->id)
        ->assertJsonPath('data.0.status', 'Eligible')
        ->assertJsonPath('data.1.id', $unconfigured->id)
        ->assertJsonPath('data.2.id', $tooStrict->id)
        ->assertJsonPath('meta.total', 3);
});

test('credential overrides, including education level, change the result', function () {
    $candidate = matchCandidate(['education_level' => null]);
    matchProgramme($this->university, 'MSc', ['minimum_ielts_band' => 6.5, 'minimum_education_level' => "Bachelor's Degree"]);

    $this->actingAs(taskStaff(RoleEnum::Counselor));

    $this->postJson('/api/eligibility/evaluate', ['student_type' => 'candidate', 'student_id' => $candidate->id])
        ->assertJsonPath('data.0.status', 'Needs Review');

    $this->postJson('/api/eligibility/evaluate', ['student_type' => 'candidate', 'student_id' => $candidate->id, 'education_level' => "Master's Degree"])
        ->assertJsonPath('data.0.status', 'Eligible');

    $this->postJson('/api/eligibility/evaluate', ['student_type' => 'candidate', 'student_id' => $candidate->id, 'education_level' => "Master's Degree", 'ielts_score' => 6])
        ->assertJsonPath('data.0.status', 'Not Eligible');
});

test('the eligible count covers every page, not only the current one', function () {
    $candidate = matchCandidate();

    foreach (range(1, 3) as $index) {
        matchProgramme($this->university, "Eligible {$index}", ['minimum_ielts_band' => 6]);
        matchProgramme($this->university, "Too strict {$index}", ['minimum_ielts_band' => 9]);
    }

    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->postJson('/api/eligibility/evaluate', ['student_type' => 'candidate', 'student_id' => $candidate->id, 'per_page' => 2, 'page' => 3])
        ->assertOk()
        ->assertJsonPath('matches_count', 3)
        ->assertJsonPath('meta.current_page', 3)
        ->assertJsonPath('meta.last_page', 3)
        ->assertJsonPath('data.0.status', 'Not Eligible');
});
