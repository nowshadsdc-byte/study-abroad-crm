<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeadDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...LeadResource::make($this)->resolve(),
            'candidate' => $this->whenLoaded('candidate', fn () => ['id' => $this->candidate?->id, 'name' => $this->candidate?->name]),
            'follow_ups' => LeadFollowUpResource::collection($this->whenLoaded('followUps')),
            'follow_up_count' => $this->whenCounted('followUps'),
            'next_follow_up_date' => $this->whenLoaded('followUps', fn () => $this->followUps->first()?->next_follow_up_date),
        ];
    }
}
