<?php

namespace App\Services;

use App\Jobs\PublishChatSocketEvent;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatMessageReceipt;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Throwable;

class ChatService
{
    /** @param array<string, mixed> $attributes */
    public function sendDirect(User $actor, User $recipient, array $attributes): ChatMessage
    {
        $participantIds = [$actor->id, $recipient->id];
        sort($participantIds);
        $conversationKey = implode(':', $participantIds);

        return $this->createMessage(
            ChatConversation::query()->firstOrCreate(
                ['direct_key' => $conversationKey],
                ['type' => 'direct', 'created_by_id' => $actor->id],
            ),
            $actor,
            $attributes,
            [$recipient->id],
            $participantIds,
        );
    }

    /** @param array<string, mixed> $attributes */
    public function publishAnnouncement(User $actor, array $attributes): ChatMessage
    {
        $title = $attributes['title'] ?? null;

        if (! is_string($title)) {
            throw new \InvalidArgumentException('An announcement title is required.');
        }

        $conversation = ChatConversation::query()->firstOrCreate(
            ['direct_key' => 'announcement'],
            ['type' => 'announcement', 'created_by_id' => $actor->id, 'title' => 'Organization announcements'],
        );
        $recipientIds = User::query()->orderBy('id')->pluck('id')->all();

        return $this->createMessage(
            $conversation,
            $actor,
            $attributes,
            $recipientIds,
            [],
            $title,
            $recipientIds,
        );
    }

    public function markRead(ChatConversation $conversation, User $reader): void
    {
        $receipts = ChatMessageReceipt::query()
            ->where('user_id', $reader->id)
            ->whereNull('read_at')
            ->whereHas('message', function ($query) use ($conversation, $reader): void {
                $query->where('chat_conversation_id', $conversation->id)
                    ->where('sender_id', '!=', $reader->id);
            })
            ->get(['id', 'chat_message_id']);

        if ($receipts->isEmpty()) {
            return;
        }

        $messageIds = $receipts->pluck('chat_message_id')->all();
        $readAt = now();

        DB::transaction(function () use ($receipts, $readAt): void {
            ChatMessageReceipt::query()
                ->whereKey($receipts->pluck('id'))
                ->whereNull('read_at')
                ->update(['read_at' => $readAt]);
        });

        $senderIds = ChatMessage::query()->whereKey($messageIds)->distinct()->pluck('sender_id')->all();
        PublishChatSocketEvent::dispatch('chat.message.read', $senderIds, [
            'conversation_id' => $conversation->id,
            'message_ids' => $messageIds,
            'reader_id' => $reader->id,
            'reader_name' => $reader->name,
            'read_at' => $readAt->toISOString(),
        ])->afterCommit();
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  array<int>  $receiptUserIds
     * @param  array<int>  $conversationUserIds
     * @param  array<int>|null  $socketUserIds
     */
    private function createMessage(
        ChatConversation $conversation,
        User $actor,
        array $attributes,
        array $receiptUserIds,
        array $conversationUserIds,
        ?string $title = null,
        ?array $socketUserIds = null,
    ): ChatMessage {
        $storedPath = null;

        try {
            return DB::transaction(function () use ($conversation, $actor, $attributes, $receiptUserIds, $conversationUserIds, $title, $socketUserIds, &$storedPath): ChatMessage {
                if ($conversationUserIds !== []) {
                    $conversation->users()->syncWithoutDetaching($conversationUserIds);
                }

                $body = $attributes['body'] ?? null;
                $message = $conversation->messages()->create([
                    'sender_id' => $actor->id,
                    'title' => $title,
                    'body' => is_string($body) ? trim($body) : null,
                ]);

                $attachment = $attributes['attachment'] ?? null;

                if ($attachment instanceof UploadedFile) {
                    $file = $attachment;
                    $storedPath = $file->store('chat-attachments', 'local');

                    if (! is_string($storedPath)) {
                        throw new \RuntimeException('The attachment could not be stored.');
                    }

                    $message->attachments()->create([
                        'disk' => 'local',
                        'path' => $storedPath,
                        'original_name' => $file->getClientOriginalName(),
                        'mime_type' => (string) $file->getMimeType(),
                        'size' => $file->getSize(),
                    ]);
                }

                foreach ($receiptUserIds as $userId) {
                    $message->receipts()->create([
                        'user_id' => $userId,
                        'read_at' => $userId === $actor->id ? now() : null,
                    ]);
                }

                $message->load(['sender:id,name,avatar', 'attachments']);
                $messagePayload = [
                    'id' => $message->id,
                    'conversation_id' => $conversation->id,
                    'sender' => [
                        'id' => $actor->id,
                        'name' => $actor->name,
                        'avatar' => $actor->avatar,
                    ],
                    'title' => $message->title,
                    'body' => $message->body,
                    'created_at' => $message->created_at?->toISOString(),
                    'read_count' => 0,
                    'readers' => [],
                    'attachments' => $message->attachments->map(fn ($attachment) => [
                        'id' => $attachment->id,
                        'name' => $attachment->original_name,
                        'mime_type' => $attachment->mime_type,
                        'size' => $attachment->size,
                        'download_url' => route('api.chat.attachments.download', $attachment),
                    ])->values()->all(),
                ];

                PublishChatSocketEvent::dispatch('chat.message.created', $socketUserIds ?? array_values(array_unique([...$conversationUserIds, $actor->id])), [
                    'conversation_id' => $conversation->id,
                    'message_id' => $message->id,
                    'message' => $messagePayload,
                ])->afterCommit();

                return $message;
            });
        } catch (Throwable $exception) {
            if (is_string($storedPath)) {
                Storage::disk('local')->delete($storedPath);
            }

            throw $exception;
        }
    }
}
