<?php

namespace App\Http\Resources;

use App\Models\ChatMessage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ChatMessage */
class ChatMessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'conversation_id' => $this->chat_conversation_id,
            'sender' => [
                'id' => $this->sender?->id,
                'name' => $this->sender?->name,
                'avatar' => $this->sender?->avatar,
            ],
            'title' => $this->title,
            'body' => $this->body,
            'created_at' => $this->created_at?->toISOString(),
            'read_count' => $this->receipts->whereNotNull('read_at')->reject(fn ($receipt) => $receipt->user_id === $this->sender_id)->count(),
            'readers' => $this->whenLoaded('receipts', fn () => $this->receipts
                ->whereNotNull('read_at')
                ->reject(fn ($receipt) => $receipt->user_id === $this->sender_id)
                ->map(fn ($receipt) => ['id' => $receipt->user?->id, 'name' => $receipt->user?->name, 'read_at' => $receipt->read_at?->toISOString()])
                ->values()),
            'attachments' => $this->whenLoaded('attachments', fn () => $this->attachments->map(fn ($attachment) => [
                'id' => $attachment->id,
                'name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size' => $attachment->size,
                'download_url' => route('api.chat.attachments.download', $attachment),
            ])),
        ];
    }
}
