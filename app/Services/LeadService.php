<?php

namespace App\Services;

use App\Events\FollowUpCreated;
use App\Events\LeadAssigned;
use App\Events\LeadConverted;
use App\Events\LeadCreated;
use App\Events\LeadUpdated;
use App\Models\Activity;
use App\Models\Candidate;
use App\Models\Lead;
use App\Models\LeadFollowUp;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class LeadService
{
    public function create(array $attributes, User $actor): Lead
    {
        return DB::transaction(function () use ($attributes, $actor): Lead {
            $lead = Lead::create($this->normalize($attributes));
            $this->activity($lead, $actor, 'created', "New lead {$lead->name} created");
            LeadCreated::dispatch($lead, $actor);

            return $lead;
        });
    }

    public function update(Lead $lead, array $attributes, User $actor): Lead
    {
        return DB::transaction(function () use ($lead, $attributes, $actor): Lead {
            $attributes = $this->normalize($attributes);
            $lead->fill($attributes);
            $changes = $lead->getDirty();
            if ($changes === []) {
                return $lead->fresh(['assignedTo', 'candidate']);
            }
            $previousAssignee = $lead->getOriginal('assigned_to_id');
            $lead->save();
            if (array_key_exists('assigned_to_id', $changes)) {
                $name = $lead->assignedTo?->name ?? 'Unassigned';
                $this->activity($lead, $actor, 'assigned', "Lead assigned to {$name}", ['previous_assigned_to_id' => $previousAssignee]);
                LeadAssigned::dispatch($lead, $actor, $previousAssignee);
            }
            $this->activity($lead, $actor, 'updated', 'Lead updated', ['changed' => array_keys($changes)]);
            LeadUpdated::dispatch($lead, $actor, array_keys($changes));

            return $lead->fresh(['assignedTo', 'candidate']);
        });
    }

    public function addFollowUp(Lead $lead, array $attributes, User $actor): LeadFollowUp
    {
        return DB::transaction(function () use ($lead, $attributes, $actor): LeadFollowUp {
            $followUp = $lead->followUps()->create([...$attributes, 'follow_up_date' => $attributes['follow_up_date'] ?? now(), 'created_by_id' => $actor->id]);
            $status = match ($followUp->outcome) {
                'Converted' => 'Converted', 'Not Interested' => 'Lost', 'Interested' => in_array($lead->status, ['New', 'Contacted'], true) ? 'Qualified' : $lead->status, default => $lead->status
            };
            if ($status !== $lead->status) {
                $lead->update(['status' => $status]);
            }
            $this->activity($lead, $actor, 'follow_up', "{$followUp->type} follow-up added for {$lead->name}");
            FollowUpCreated::dispatch($followUp, $actor);

            return $followUp->load('createdBy');
        });
    }

    public function convert(Lead $lead, User $actor): Candidate
    {
        return DB::transaction(function () use ($lead, $actor): Candidate {
            $lead = Lead::query()->lockForUpdate()->findOrFail($lead->id);
            if ($lead->trashed()) {
                abort(422, 'Archived leads cannot be converted.');
            }
            $candidate = Candidate::query()->where('lead_id', $lead->id)->first();
            if ($candidate) {
                return $candidate;
            }
            $lead->update(['status' => 'Converted']);
            $candidate = Candidate::create(Arr::only([
                'lead_id' => $lead->id, 'name' => $lead->name, 'email' => $lead->email, 'phone' => $lead->phone, 'address' => $lead->address,
                'desired_country' => $lead->interest_country, 'desired_course' => $lead->interest_course, 'desired_intake' => $lead->interest_intake, 'assigned_to_id' => $lead->assigned_to_id,
            ], ['lead_id', 'name', 'email', 'phone', 'address', 'desired_country', 'desired_course', 'desired_intake', 'assigned_to_id']));
            foreach (['Application', 'Documents', 'Submission', 'Offer', 'Visa', 'Enrollment'] as $step) {
                $candidate->progressRecords()->create(['step' => $step, 'status' => $step === 'Application' ? 'In Progress' : 'Pending']);
            }
            $this->activity($lead, $actor, 'converted', "Lead {$lead->name} converted to candidate");
            LeadConverted::dispatch($lead, $candidate, $actor);

            return $candidate;
        });
    }

    public function archive(Lead $lead, User $actor): void
    {
        DB::transaction(function () use ($lead, $actor): void {
            $lead->delete();
            $this->activity($lead, $actor, 'archived', 'Lead archived');
        });
    }

    private function normalize(array $attributes): array
    {
        return collect($attributes)->map(fn (mixed $value): mixed => is_string($value) && trim($value) === '' ? null : $value)->all();
    }

    private function activity(Lead $lead, User $actor, string $action, string $description, array $meta = []): void
    {
        Activity::create(['type' => 'Lead', 'action' => $action, 'description' => $description, 'entity_id' => $lead->id, 'user_id' => $actor->id, 'meta' => $meta ?: null]);
    }
}
