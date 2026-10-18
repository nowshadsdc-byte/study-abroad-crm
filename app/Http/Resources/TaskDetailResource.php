<?php

namespace App\Http\Resources;

use App\Models\Task;
use Illuminate\Http\Request;

/**
 * @mixin Task
 */
class TaskDetailResource extends TaskResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'lead_id' => $this->lead_id,
            'candidate_id' => $this->candidate_id,
            'assigned_to_id' => $this->assigned_to_id,
            'recurred_from_id' => $this->recurred_from_id,
            'next_occurrence_id' => $this->whenLoaded('nextOccurrence', fn () => $this->nextOccurrence?->id),
            'completed_by' => $this->whenLoaded('completedBy', fn () => $this->completedBy ? ['id' => $this->completedBy->id, 'name' => $this->completedBy->name] : null),
            'checklist_items' => TaskChecklistItemResource::collection($this->whenLoaded('checklistItems')),
            'notes' => TaskNoteResource::collection($this->whenLoaded('notes')),
        ];
    }
}
