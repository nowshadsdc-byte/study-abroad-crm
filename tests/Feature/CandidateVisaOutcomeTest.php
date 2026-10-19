<?php

use App\Enums\RoleEnum;
use App\Models\Candidate;
use App\Models\CandidateProgress;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->candidate = Candidate::query()->create(['name' => 'Visa Client', 'status' => 'Active']);

    foreach (Candidate::WORKFLOW_STEPS as $step) {
        $this->candidate->progressRecords()->create(['step' => $step, 'status' => 'Pending']);
    }
});

function visaStep(Candidate $candidate, string $step = 'Visa'): CandidateProgress
{
    return $candidate->progressRecords()->where('step', $step)->sole();
}

test('recording a visa decision completes the visa step', function () {
    $visa = visaStep($this->candidate);

    $progress = $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->patchJson("/api/candidates/{$this->candidate->id}/progress/{$visa->id}", ['status' => 'In Progress', 'outcome' => 'Approved'])
        ->assertOk()
        ->json('data.progress');

    expect(collect($progress)->firstWhere('step', 'Visa'))->toMatchArray(['outcome' => 'Approved', 'status' => 'Completed'])
        ->and($visa->fresh()->completed_at)->not->toBeNull();
});

test('a visa decision is only accepted on the visa step and must be a known value', function () {
    $this->actingAs(taskStaff(RoleEnum::Counselor));
    $offer = visaStep($this->candidate, 'Offer');
    $visa = visaStep($this->candidate);

    $this->patchJson("/api/candidates/{$this->candidate->id}/progress/{$offer->id}", ['status' => 'Completed', 'outcome' => 'Approved'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['outcome']);

    $this->patchJson("/api/candidates/{$this->candidate->id}/progress/{$visa->id}", ['status' => 'Completed', 'outcome' => 'Granted'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['outcome']);
});

test('moving the visa step back clears its decision', function () {
    $visa = visaStep($this->candidate);
    $visa->update(['status' => 'Completed', 'outcome' => 'Refused', 'completed_at' => now()]);

    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->patchJson("/api/candidates/{$this->candidate->id}/progress/{$visa->id}", ['status' => 'In Progress'])
        ->assertOk();

    expect($visa->fresh())->outcome->toBeNull()->status->toBe('In Progress');
});

test('updating a decided visa step without an outcome keeps the decision', function () {
    $visa = visaStep($this->candidate);
    $visa->update(['status' => 'Completed', 'outcome' => 'Approved', 'completed_at' => now()]);

    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->patchJson("/api/candidates/{$this->candidate->id}/progress/{$visa->id}", ['status' => 'Completed', 'notes' => 'Visa stamped'])
        ->assertOk();

    expect($visa->fresh()->outcome)->toBe('Approved');
});
