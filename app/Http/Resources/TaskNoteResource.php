<?php

namespace App\Http\Resources;

use App\Models\TaskNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TaskNote
 */
class TaskNoteResource extends JsonResource
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
            'user' => $this->whenLoaded('user', fn () => $this->user ? ['id' => $this->user->id, 'name' => $this->user->name, 'avatar' => $this->user->avatar] : null),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'is_edited' => $this->isEdited(),
            'can' => [
                'manage' => $request->user()?->can('manageNote', [$this->task, $this->resource]) ?? false,
            ],
        ];
    }
}
