<?php

namespace App\Http\Resources;

use App\Models\TaskChecklistItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TaskChecklistItem
 */
class TaskChecklistItemResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'is_completed' => $this->is_completed,
            'completed_at' => $this->completed_at,
            'completed_by' => $this->whenLoaded('completedBy', fn () => $this->completedBy ? ['id' => $this->completedBy->id, 'name' => $this->completedBy->name] : null),
            'position' => $this->position,
        ];
    }
}
