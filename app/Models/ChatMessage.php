<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property-read int $id
 * @property-read int $chat_conversation_id
 * @property-read int $sender_id
 * @property-read string|null $title
 * @property-read string|null $body
 * @property-read Carbon|null $created_at
 * @property-read User|null $sender
 * @property-read ChatConversation|null $conversation
 * @property-read Collection<int, ChatMessageReceipt> $receipts
 * @property-read Collection<int, ChatMessageAttachment> $attachments
 */
#[Fillable(['chat_conversation_id', 'sender_id', 'title', 'body'])]
class ChatMessage extends Model
{
    /** @return BelongsTo<ChatConversation, $this> */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(ChatConversation::class, 'chat_conversation_id');
    }

    /** @return BelongsTo<User, $this> */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /** @return HasMany<ChatMessageReceipt, $this> */
    public function receipts(): HasMany
    {
        return $this->hasMany(ChatMessageReceipt::class);
    }

    /** @return HasMany<ChatMessageAttachment, $this> */
    public function attachments(): HasMany
    {
        return $this->hasMany(ChatMessageAttachment::class);
    }
}
