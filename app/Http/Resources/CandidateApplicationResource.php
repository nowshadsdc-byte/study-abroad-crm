<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CandidateApplicationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'status' => $this->status, 'notes' => $this->notes, 'applied_at' => $this->applied_at, 'opportunity' => $this->whenLoaded('opportunity', fn () => ['id' => $this->opportunity?->id, 'title' => $this->opportunity?->title, 'program' => $this->opportunity?->program, 'country' => $this->opportunity?->university?->country ?? $this->opportunity?->country, 'university' => $this->opportunity?->university?->name])];
    }
}
