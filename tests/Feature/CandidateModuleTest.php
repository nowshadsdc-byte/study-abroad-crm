<?php

use App\Models\Candidate;
use App\Models\CandidateApplication;
use App\Models\Opportunity;
use App\Models\University;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

function candidateUser(): User
{
    $permissions = ['candidates.view', 'candidates.create', 'candidates.update', 'candidates.delete', 'candidates.progress.update'];
    foreach ($permissions as $permission) {
        Permission::findOrCreate($permission, 'web');
    }
    $role = Role::findOrCreate('Administrator', 'web');
    $role->syncPermissions($permissions);
    $user = User::query()->create([
        'name' => 'Candidate Administrator',
        'email' => 'candidate-admin@example.test',
        'password' => bcrypt('password'),
    ]);
    $user->assignRole($role);

    return $user;
}

test('authorized staff create candidates with the fixed six-step workflow', function () {
    $user = candidateUser();
    $this->actingAs($user)->postJson('/api/candidates', ['name' => 'Raisa Chowdhury', 'status' => 'Active', 'email' => 'raisa@example.com'])->assertCreated()->assertJsonPath('data.name', 'Raisa Chowdhury');
    expect(Candidate::query()->first()->progressRecords()->count())->toBe(6);
});

test('candidate input and progress transitions are validated and persisted', function () {
    $user = candidateUser();
    $this->actingAs($user)->postJson('/api/candidates', ['name' => '', 'status' => 'Unknown'])->assertUnprocessable()->assertJsonValidationErrors(['name', 'status']);
    $candidate = Candidate::query()->create(['name' => 'Test', 'status' => 'Active']);
    foreach (Candidate::WORKFLOW_STEPS as $step) {
        $candidate->progressRecords()->create(['step' => $step, 'status' => $step === 'Application' ? 'In Progress' : 'Pending']);
    }
    $progress = $candidate->progressRecords()->where('step', 'Application')->first();

    // Completing the Application step without a university/program selection must not complete it.
    $this->actingAs($user)->patchJson("/api/candidates/{$candidate->id}/progress/{$progress->id}", ['status' => 'Completed'])->assertOk();
    expect($candidate->fresh()->current_step)->toBe('Application');

    $university = University::query()->create(['name' => 'Test University', 'country' => 'Canada']);
    $opportunity = Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Bachelor of Science', 'status' => 'Open']);

    // Selecting both a university (via its program) and saving completes the step.
    $this->actingAs($user)->patchJson("/api/candidates/{$candidate->id}/progress/{$progress->id}", [
        'status' => 'Completed', 'opportunity_id' => $opportunity->id,
    ])->assertOk()->assertJsonPath('data.progress.0.opportunity.title', 'Bachelor of Science');
    expect($candidate->fresh()->current_step)->toBe('Documents');
});

test('saving the application step syncs the linked candidate application', function () {
    $user = candidateUser();
    $candidate = Candidate::query()->create(['name' => 'Applicant', 'status' => 'Active']);
    foreach (Candidate::WORKFLOW_STEPS as $step) {
        $candidate->progressRecords()->create(['step' => $step, 'status' => $step === 'Application' ? 'In Progress' : 'Pending']);
    }
    $progress = $candidate->progressRecords()->where('step', 'Application')->first();
    $university = University::query()->create(['name' => 'First University', 'country' => 'Canada']);
    $firstOpportunity = Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Bachelor of Science', 'status' => 'Open']);
    $secondOpportunity = Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Master of Science', 'status' => 'Open']);

    // Selecting a program creates a linked candidate application.
    $response = $this->actingAs($user)->patchJson("/api/candidates/{$candidate->id}/progress/{$progress->id}", [
        'status' => 'Completed', 'opportunity_id' => $firstOpportunity->id, 'notes' => 'Applying with strong grades',
    ])->assertOk();
    expect($response->json('data.applications'))->toHaveCount(1)
        ->and(CandidateApplication::query()->where('candidate_id', $candidate->id)->where('opportunity_id', $firstOpportunity->id)->exists())->toBeTrue();

    // Switching the program removes the old link and creates the new one.
    $this->actingAs($user)->patchJson("/api/candidates/{$candidate->id}/progress/{$progress->id}", [
        'status' => 'Completed', 'opportunity_id' => $secondOpportunity->id,
    ])->assertOk();
    expect(CandidateApplication::query()->where('candidate_id', $candidate->id)->where('opportunity_id', $firstOpportunity->id)->exists())->toBeFalse()
        ->and(CandidateApplication::query()->where('candidate_id', $candidate->id)->where('opportunity_id', $secondOpportunity->id)->exists())->toBeTrue();

    // Clearing the selection removes the link entirely.
    $this->actingAs($user)->patchJson("/api/candidates/{$candidate->id}/progress/{$progress->id}", [
        'status' => 'Pending', 'opportunity_id' => null,
    ])->assertOk();
    expect(CandidateApplication::query()->where('candidate_id', $candidate->id)->count())->toBe(0);
});
