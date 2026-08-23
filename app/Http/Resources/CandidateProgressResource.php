<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CandidateProgressResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'step' => $this->step, 'status' => $this->status, 'notes' => $this->notes, 'completed_at' => $this->completed_at,
            'opportunity_id' => $this->opportunity_id,
            'opportunity' => $this->whenLoaded('opportunity', fn () => $this->opportunity === null ? null : [
                'id' => $this->opportunity->id,
                'title' => $this->opportunity->title,
                'university' => $this->opportunity->university === null ? null : [
                    'id' => $this->opportunity->university->id,
                    'name' => $this->opportunity->university->name,
                    'country' => $this->opportunity->university->country,
                    'logo_url' => $this->opportunity->university->logo_url,
                ],
            ]),
        ];
    }
}
