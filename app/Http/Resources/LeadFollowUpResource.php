<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadFollowUpResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'lead_id' => $this->lead_id, 'type' => $this->type, 'notes' => $this->notes,
            'outcome' => $this->outcome, 'follow_up_date' => $this->follow_up_date, 'next_follow_up_date' => $this->next_follow_up_date,
            'created_at' => $this->created_at,
            'created_by' => $this->whenLoaded('createdBy', fn () => ['id' => $this->createdBy?->id, 'name' => $this->createdBy?->name, 'avatar' => $this->createdBy?->avatar]),
        ];
    }
}
