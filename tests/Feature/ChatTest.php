<?php

use App\Enums\RoleEnum;
use App\Jobs\PublishChatSocketEvent;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\ChatMessageReceipt;
use App\Models\User;
use App\Services\ChatService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->seed(RolePermissionSeeder::class);
});

function makeChatUser(RoleEnum $role, array $attributes = []): User
{
    $user = User::factory()->create(['is_active' => true, ...$attributes]);
    $user->assignRole($role->value);

    return $user;
}

test('staff can send direct messages and only conversation members can read them', function () {
    Queue::fake();
    $sender = makeChatUser(RoleEnum::Counselor);
    $recipient = makeChatUser(RoleEnum::Receptionist);
    $outsider = makeChatUser(RoleEnum::FinanceOfficer);

    $response = $this->actingAs($sender)->postJson('/api/chat/messages', [
        'recipient_id' => $recipient->id,
        'body' => 'Please review the application.',
    ])->assertCreated();

    $messageId = $response->json('data.id');
    $conversationId = $response->json('data.conversation_id');

    expect(ChatMessage::findOrFail($messageId)->body)->toBe('Please review the application.')
        ->and(ChatMessageReceipt::query()->where('chat_message_id', $messageId)->where('user_id', $recipient->id)->value('read_at'))->toBeNull();

    Queue::assertPushed(PublishChatSocketEvent::class, fn (PublishChatSocketEvent $job): bool => $job->event === 'chat.message.created'
        && in_array($sender->id, $job->userIds, true)
        && in_array($recipient->id, $job->userIds, true)
        && $job->payload['message']['body'] === 'Please review the application.');

    $this->actingAs($outsider)->getJson("/api/chat/conversations/{$conversationId}/messages")->assertForbidden();
    $this->actingAs($recipient)->getJson("/api/chat/conversations/{$conversationId}/messages")->assertOk();
});

test('opening a conversation records read receipts and notifies the sender over sockets', function () {
    Queue::fake();
    $sender = makeChatUser(RoleEnum::Counselor);
    $recipient = makeChatUser(RoleEnum::Receptionist);
    $message = app(ChatService::class)->sendDirect($sender, $recipient, ['body' => 'Hello']);

    $this->actingAs($recipient)->getJson('/api/chat/unread-count')->assertJsonPath('data.count', 1);
    $this->actingAs($recipient)->postJson("/api/chat/conversations/{$message->chat_conversation_id}/read")->assertOk();
    $this->getJson('/api/chat/unread-count')->assertJsonPath('data.count', 0);

    expect(ChatMessageReceipt::query()->where('chat_message_id', $message->id)->where('user_id', $recipient->id)->value('read_at'))->not->toBeNull();
    Queue::assertPushed(PublishChatSocketEvent::class, fn (PublishChatSocketEvent $job): bool => $job->event === 'chat.message.read'
        && $job->userIds === [$sender->id]
        && $job->payload['message_ids'] === [$message->id]);
});

test('only administrators publish announcements and receipts include inactive staff', function () {
    Queue::fake();
    $administrator = makeChatUser(RoleEnum::Administrator);
    $staff = makeChatUser(RoleEnum::Manager);
    $inactive = makeChatUser(RoleEnum::Receptionist, ['is_active' => false]);

    $this->actingAs($inactive)->postJson('/api/chat/socket-token')->assertForbidden();

    $this->actingAs($staff)->postJson('/api/chat/announcements', ['title' => 'Office update', 'body' => 'The office will close early.'])->assertForbidden();

    $response = $this->actingAs($administrator)->postJson('/api/chat/announcements', [
        'title' => 'Office update',
        'body' => 'The office will close early.',
    ])->assertCreated();

    $messageId = $response->json('data.id');
    expect(ChatMessageReceipt::query()->where('chat_message_id', $messageId)->count())->toBe(3)
        ->and(ChatMessageReceipt::query()->where('chat_message_id', $messageId)->where('user_id', $inactive->id)->exists())->toBeTrue()
        ->and(ChatMessageReceipt::query()->where('chat_message_id', $messageId)->where('user_id', $administrator->id)->value('read_at'))->not->toBeNull();

    $conversation = ChatMessage::findOrFail($messageId)->conversation;
    $this->actingAs($staff)->postJson("/api/chat/conversations/{$conversation->id}/read")->assertOk();
    $this->getJson("/api/chat/conversations/{$conversation->id}/messages")
        ->assertJsonPath('data.0.read_count', 1)
        ->assertJsonPath('data.0.readers.0.name', $staff->name);
});

test('new staff accounts only receive announcements published after they are added', function () {
    Queue::fake();
    $administrator = makeChatUser(RoleEnum::Administrator);
    $this->actingAs($administrator)->postJson('/api/chat/announcements', ['title' => 'Earlier', 'body' => 'Before they joined.'])->assertCreated();

    $newStaff = makeChatUser(RoleEnum::Counselor);
    $this->actingAs($administrator)->postJson('/api/chat/announcements', ['title' => 'Welcome', 'body' => 'Published after joining.'])->assertCreated();

    $conversation = ChatConversation::query()->where('direct_key', 'announcement')->firstOrFail();
    $this->actingAs($newStaff)->getJson("/api/chat/conversations/{$conversation->id}/messages")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.body', 'Published after joining.');
    $this->getJson('/api/chat/conversations')->assertJsonPath('data.0.latest_message.body', 'Published after joining.');
});

test('message attachments are private to conversation members', function () {
    Queue::fake();
    Storage::fake('local');
    $sender = makeChatUser(RoleEnum::Counselor);
    $recipient = makeChatUser(RoleEnum::Receptionist);
    $outsider = makeChatUser(RoleEnum::FinanceOfficer);

    $response = $this->actingAs($sender)->post('/api/chat/messages', [
        'recipient_id' => $recipient->id,
        'attachment' => UploadedFile::fake()->create('application.pdf', 100, 'application/pdf'),
    ], ['Accept' => 'application/json'])->assertCreated();

    $attachmentId = $response->json('data.attachments.0.id');
    $this->actingAs($recipient)->getJson("/api/chat/attachments/{$attachmentId}/download")->assertOk();
    $this->actingAs($outsider)->getJson("/api/chat/attachments/{$attachmentId}/download")->assertForbidden();
});

test('each staff role has chat access while only administrators can announce', function () {
    foreach ([RoleEnum::Administrator, RoleEnum::Manager, RoleEnum::Counselor, RoleEnum::FinanceOfficer, RoleEnum::Receptionist] as $role) {
        $user = makeChatUser($role);

        expect($user->can('chat.view'))->toBeTrue()
            ->and($user->can('chat.send'))->toBeTrue()
            ->and($user->can('chat.announce'))->toBe($role === RoleEnum::Administrator);
    }
});
