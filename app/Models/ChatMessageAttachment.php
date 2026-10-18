<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property-read int $id
 * @property-read int $chat_message_id
 * @property-read string $disk
 * @property-read string $path
 * @property-read string $original_name
 * @property-read string $mime_type
 * @property-read int $size
 * @property-read ChatMessage|null $message
 */
#[Fillable(['chat_message_id', 'disk', 'path', 'original_name', 'mime_type', 'size'])]
class ChatMessageAttachment extends Model
{
    /** @return BelongsTo<ChatMessage, $this> */
    public function message(): BelongsTo
    {
        return $this->belongsTo(ChatMessage::class, 'chat_message_id');
    }
}
