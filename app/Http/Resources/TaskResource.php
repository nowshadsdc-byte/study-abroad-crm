<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status->value,
            'priority' => $this->priority->value,
            'due_date' => $this->due_date?->toDateString(),
            'due_time' => $this->due_time !== null ? substr($this->due_time, 0, 5) : null,
            'due_state' => $this->dueState(),
            'recurrence' => $this->recurrence?->value,
            'recurrence_until' => $this->recurrence_until?->toDateString(),
            'completed_at' => $this->completed_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'creator' => $this->whenLoaded('creator', fn () => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null),
            'assignee' => $this->whenLoaded('assignee', fn () => $this->assignee ? ['id' => $this->assignee->id, 'name' => $this->assignee->name, 'avatar' => $this->assignee->avatar] : null),
            'student' => $this->student($request),
            'checklist' => [
                'total' => $this->checklist_items_count ?? $this->whenLoaded('checklistItems', fn () => $this->checklistItems->count(), 0),
                'completed' => $this->completed_checklist_items_count ?? $this->whenLoaded('checklistItems', fn () => $this->checklistItems->where('is_completed', true)->count(), 0),
            ],
            'notes_count' => $this->whenCounted('notes'),
            'can' => [
                'update' => $user?->can('update', $this->resource) ?? false,
                'delete' => $user?->can('delete', $this->resource) ?? false,
            ],
        ];
    }

    /**
     * The linked lead or client, only when the viewer may see that record.
     *
     * @return array{type: 'lead'|'client', id: int, name: string}|null
     */
    private function student(Request $request): ?array
    {
        $user = $request->user();

        if ($this->lead_id !== null && $this->relationLoaded('lead') && $this->lead && $user?->can('lead.view')) {
            return ['type' => 'lead', 'id' => $this->lead->id, 'name' => $this->lead->name];
        }

        if ($this->candidate_id !== null && $this->relationLoaded('candidate') && $this->candidate && $user?->can('candidate.view')) {
            return ['type' => 'client', 'id' => $this->candidate->id, 'name' => $this->candidate->name];
        }

        return null;
    }
}
