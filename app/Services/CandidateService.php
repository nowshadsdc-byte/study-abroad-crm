<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Candidate;
use App\Models\CandidateApplication;
use App\Models\CandidateProgress;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CandidateService
{
    public function createCandidateWithProgress(array $attributes, User $actor): Candidate
    {
        return DB::transaction(function () use ($attributes, $actor): Candidate {
            $candidate = Candidate::create($this->normalize($attributes) + ['current_step' => 'Application']);
            foreach (Candidate::WORKFLOW_STEPS as $step) {
                $candidate->progressRecords()->create(['step' => $step, 'status' => $step === 'Application' ? 'In Progress' : 'Pending']);
            }
            $this->activity($candidate, $actor, 'created', "Candidate {$candidate->name} created");

            return $candidate;
        });
    }

    public function updateCandidate(Candidate $candidate, array $attributes, User $actor): Candidate
    {
        return DB::transaction(function () use ($candidate, $attributes, $actor): Candidate {
            $oldAssignee = $candidate->assigned_to_id;
            $candidate->fill($this->normalize($attributes));
            $changes = array_keys($candidate->getDirty());
            $candidate->save();
            if (in_array('assigned_to_id', $changes, true)) {
                $this->activity($candidate, $actor, 'assigned', 'Candidate assigned to '.($candidate->assignedTo?->name ?? 'Unassigned'));
            }
            if ($changes !== []) {
                $this->activity($candidate, $actor, 'updated', 'Candidate profile updated', ['changed' => $changes, 'previous_assigned_to_id' => $oldAssignee]);
            }

            return $candidate;
        });
    }

    public function updateProgressAndCurrentStep(Candidate $candidate, CandidateProgress $progress, array $attributes, User $actor): Candidate
    {
        return DB::transaction(function () use ($candidate, $progress, $attributes, $actor): Candidate {
            if ($progress->step === 'Application' && $attributes['status'] === 'Completed' && empty($attributes['opportunity_id'] ?? null)) {
                $attributes['status'] = 'Pending';
            }
            $previousOpportunityId = $progress->opportunity_id;
            $progress->update([...$attributes, 'completed_at' => $attributes['status'] === 'Completed' ? now() : null]);
            if ($progress->step === 'Application') {
                $this->syncApplicationFromProgress($candidate, $progress, $previousOpportunityId);
            }
            $this->recalculateCompletion($candidate);
            $this->activity($candidate, $actor, 'progress_updated', "{$progress->step} marked {$progress->status}");

            return $candidate->fresh(['progressRecords.opportunity.university', 'applications.opportunity.university']);
        });
    }

    /**
     * Keep the candidate's CandidateApplication records in sync with the Application
     * pipeline step's selected opportunity: link the newly chosen program, and unlink
     * the previously selected one if it changed.
     */
    private function syncApplicationFromProgress(Candidate $candidate, CandidateProgress $progress, ?int $previousOpportunityId): void
    {
        if ($previousOpportunityId !== null && $previousOpportunityId !== $progress->opportunity_id) {
            CandidateApplication::query()->where('candidate_id', $candidate->id)->where('opportunity_id', $previousOpportunityId)->delete();
        }

        if ($progress->opportunity_id === null) {
            return;
        }

        $application = CandidateApplication::query()->firstOrNew(['candidate_id' => $candidate->id, 'opportunity_id' => $progress->opportunity_id]);
        $application->notes = $progress->notes;
        if (! $application->exists) {
            $application->status = 'Draft';
        }
        $application->save();
    }

    public function recalculateCompletion(Candidate $candidate): void
    {
        $progress = $candidate->progressRecords()->get()->keyBy('step');
        $next = collect(Candidate::WORKFLOW_STEPS)->first(fn (string $step) => ! in_array($progress[$step]?->status, ['Completed', 'Skipped'], true));
        $candidate->current_step = $next ?? 'Enrollment';
        $allCompleted = $progress->count() === count(Candidate::WORKFLOW_STEPS) && $progress->every(fn (CandidateProgress $item) => $item->status === 'Completed');
        if ($allCompleted) {
            $candidate->status = 'Completed';
        } elseif ($candidate->status === 'Completed') {
            $candidate->status = 'Active';
        }
        $candidate->save();
    }

    public function archiveCandidate(Candidate $candidate, User $actor): void
    {
        DB::transaction(function () use ($candidate, $actor): void {
            $candidate->delete();
            $this->activity($candidate, $actor, 'archived', 'Candidate archived');
        });
    }

    private function normalize(array $attributes): array
    {
        return collect($attributes)->map(fn (mixed $value): mixed => is_string($value) && trim($value) === '' ? null : $value)->all();
    }

    private function activity(Candidate $candidate, User $actor, string $action, string $description, array $meta = []): void
    {
        Activity::create(['type' => 'Candidate', 'action' => $action, 'description' => $description, 'entity_id' => $candidate->id, 'user_id' => $actor->id, 'meta' => $meta ?: null]);
    }
}
