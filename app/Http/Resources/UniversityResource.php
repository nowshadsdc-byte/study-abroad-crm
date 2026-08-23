<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UniversityResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'country' => $this->country, 'city' => $this->city,
            'website' => $this->website, 'ranking' => $this->ranking, 'logo_url' => $this->logo_url,
            'description' => $this->description, 'programs' => $this->programs ?? [], 'is_active' => $this->is_active,
            'created_at' => $this->created_at, 'updated_at' => $this->updated_at,
            'opportunities_count' => $this->whenCounted('opportunities'),
        ];
    }
}
