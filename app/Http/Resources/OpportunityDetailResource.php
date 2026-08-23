<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OpportunityDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...OpportunityResource::make($this)->resolve(),
            'applications' => $this->whenLoaded('applications', fn () => $this->applications->map(fn ($application) => [
                'id' => $application->id,
                'candidate' => ['id' => $application->candidate?->id, 'name' => $application->candidate?->name],
                'status' => $application->status,
                'applied_at' => $application->applied_at,
            ])),
        ];
    }
}
