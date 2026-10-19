<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpportunityResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'title' => $this->title, 'program' => $this->program, 'level' => $this->level,
            'intake' => $this->intake, 'deadline' => $this->deadline, 'tuition_fee' => $this->tuition_fee, 'currency' => $this->currency,
            'scholarship' => $this->scholarship, 'requirements' => $this->requirements, 'eligibility_criteria' => $this->eligibility_criteria, 'status' => $this->status,
            'created_at' => $this->created_at, 'updated_at' => $this->updated_at,
            'university_id' => $this->university_id,
            'university' => $this->whenLoaded('university', fn () => ['id' => $this->university?->id, 'name' => $this->university?->name, 'country' => $this->university?->country, 'city' => $this->university?->city, 'logo_url' => $this->university?->logo_url]),
            'applications_count' => $this->whenCounted('applications'),
        ];
    }
}
