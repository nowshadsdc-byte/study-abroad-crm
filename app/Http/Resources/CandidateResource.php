<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CandidateResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'lead_id' => $this->lead_id, 'name' => $this->name, 'email' => $this->email, 'phone' => $this->phone, 'desired_country' => $this->desired_country, 'desired_course' => $this->desired_course, 'desired_intake' => $this->desired_intake, 'current_step' => $this->current_step, 'status' => $this->status, 'created_at' => $this->created_at, 'updated_at' => $this->updated_at, 'assigned_to' => $this->whenLoaded('assignedTo', fn () => ['id' => $this->assignedTo?->id, 'name' => $this->assignedTo?->name, 'email' => $this->assignedTo?->email, 'phone' => $this->assignedTo?->phone, 'job_title' => $this->assignedTo?->job_title, 'avatar' => $this->assignedTo?->avatar]), 'invoices_count' => $this->whenCounted('invoices')];
    }
}
