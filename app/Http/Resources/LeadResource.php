<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'email' => $this->email, 'phone' => $this->phone, 'address' => $this->address,
            'source' => $this->source, 'interest_country' => $this->interest_country, 'interest_course' => $this->interest_course,
            'interest_intake' => $this->interest_intake, 'status' => $this->status, 'priority' => $this->priority, 'budget' => $this->budget,
            'notes' => $this->notes, 'created_at' => $this->created_at, 'updated_at' => $this->updated_at,
            'assigned_to' => $this->whenLoaded('assignedTo', fn () => ['id' => $this->assignedTo?->id, 'name' => $this->assignedTo?->name, 'avatar' => $this->assignedTo?->avatar]),
            'has_candidate' => $this->whenLoaded('candidate', fn () => $this->candidate !== null),
        ];
    }
}
