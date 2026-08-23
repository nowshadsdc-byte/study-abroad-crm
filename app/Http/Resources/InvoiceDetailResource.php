<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceDetailResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...InvoiceResource::make($this)->resolve(),
            'client_address' => $this->client_address,
            'notes' => $this->notes,
            'candidate' => $this->whenLoaded('candidate', fn () => $this->candidate === null ? null : [
                'id' => $this->candidate->id,
                'name' => $this->candidate->name,
                'email' => $this->candidate->email,
                'phone' => $this->candidate->phone,
                'address' => $this->candidate->address,
            ]),
            'created_by' => $this->whenLoaded('createdBy', fn () => $this->createdBy === null ? null : [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ]),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => $item->total,
            ])),
            'payments' => $this->whenLoaded('payments', fn () => $this->payments->sortByDesc('paid_at')->values()->map(fn ($payment) => [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'method' => $payment->method,
                'paid_at' => $payment->paid_at,
                'note' => $payment->note,
                'recorded_by' => $payment->relationLoaded('recordedBy') && $payment->recordedBy !== null
                    ? ['id' => $payment->recordedBy->id, 'name' => $payment->recordedBy->name]
                    : null,
            ])),
        ];
    }
}
