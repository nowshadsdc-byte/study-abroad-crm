<?php

namespace App\Http\Resources;

use App\Models\ChatConversation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin ChatConversation */
class ChatConversationResource extends JsonResource
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
            'type' => $this->type,
            'title' => $this->type === 'announcement' ? 'Announcements' : ($this->other_user->name ?? 'Conversation'),
            'other_user' => $this->other_user ? [
                'id' => $this->other_user->id,
                'name' => $this->other_user->name,
                'avatar' => $this->other_user->avatar,
            ] : null,
            'latest_message' => $this->whenLoaded('latestMessage', fn () => ChatMessageResource::make($this->latestMessage)),
            'unread_count' => $this->unread_count ?? 0,
        ];
    }
}
