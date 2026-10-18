<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreChatAnnouncementRequest;
use App\Http\Requests\StoreChatMessageRequest;
use App\Http\Resources\ChatConversationResource;
use App\Http\Resources\ChatMessageResource;
use App\Models\ChatConversation;
use App\Models\ChatMessageAttachment;
use App\Models\ChatMessageReceipt;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ChatController extends Controller
{
    public function __construct(private ChatService $chatService) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        Gate::authorize('viewAny', ChatConversation::class);

        $conversations = ChatConversation::query()
            ->where('type', 'direct')
            ->whereHas('users', fn (Builder $query) => $query->whereKey($user->id))
            ->with([
                'users' => fn ($query) => $query->whereKeyNot($user->id)->select(['users.id', 'users.name', 'users.avatar']),
                'latestMessage' => fn ($query) => $query->with(['sender:id,name,avatar', 'receipts.user:id,name', 'attachments']),
            ])
            ->withCount(['messages as unread_count' => fn (Builder $query) => $query->whereHas('receipts', fn (Builder $receipts) => $receipts->where('user_id', $user->id)->whereNull('read_at'))])
            ->get();

        $conversations->each(function (ChatConversation $conversation): void {
            $conversation->setRelation('other_user', $conversation->users->first());
        });

        $announcementConversation = ChatConversation::query()
            ->where('direct_key', 'announcement')
            ->whereHas('messages', fn (Builder $query) => $query->whereHas('receipts', fn (Builder $receipts) => $receipts->where('user_id', $user->id)))
            ->first();

        if ($announcementConversation !== null) {
            $announcementConversation->setRelation('latestMessage', $announcementConversation->messages()
                ->whereHas('receipts', fn (Builder $query) => $query->where('user_id', $user->id))
                ->with(['sender:id,name,avatar', 'receipts.user:id,name', 'attachments'])
                ->latest('id')
                ->first());
            $announcementConversation->unread_count = $announcementConversation->messages()
                ->whereHas('receipts', fn (Builder $query) => $query->where('user_id', $user->id)->whereNull('read_at'))
                ->count();
            $conversations->push($announcementConversation);
        }

        $conversations = $conversations->sortByDesc(fn (ChatConversation $conversation) => $conversation->latestMessage->id ?? 0)->values();
        $unreadCount = ChatMessageReceipt::query()
            ->where('user_id', $user->id)
            ->whereNull('read_at')
            ->whereHas('message', fn (Builder $query) => $query->where('sender_id', '!=', $user->id))
            ->count();

        return response()->json([
            ...ChatConversationResource::collection($conversations)->response()->getData(true),
            'unread_total' => $unreadCount,
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', ChatConversation::class);
        $filters = $request->validate(['search' => ['nullable', 'string', 'max:100']]);
        $user = $request->user();

        $users = User::query()
            ->where('is_active', true)
            ->whereKeyNot($user->id)
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(fn (Builder $searchQuery) => $searchQuery->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%')))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'avatar']);

        return response()->json(['data' => $users]);
    }

    public function messages(Request $request, ChatConversation $conversation): AnonymousResourceCollection
    {
        Gate::authorize('view', $conversation);
        $user = $request->user();

        $messages = $conversation->messages()
            ->when($conversation->type === 'announcement', fn (Builder $query) => $query->whereHas('receipts', fn (Builder $receipts) => $receipts->where('user_id', $user->id)))
            ->with(['sender:id,name,avatar', 'receipts.user:id,name', 'attachments'])
            ->latest('id')
            ->paginate(50)
            ->withQueryString();

        return ChatMessageResource::collection($messages);
    }

    public function send(StoreChatMessageRequest $request): JsonResponse
    {
        $recipient = User::query()->where('is_active', true)->findOrFail($request->integer('recipient_id'));
        $message = $this->chatService->sendDirect($request->user(), $recipient, $request->validated());

        return ChatMessageResource::make($message->load(['sender:id,name,avatar', 'receipts.user:id,name', 'attachments']))
            ->response()->setStatusCode(201);
    }

    public function announce(StoreChatAnnouncementRequest $request): JsonResponse
    {
        Gate::authorize('announce', ChatConversation::class);
        $message = $this->chatService->publishAnnouncement($request->user(), $request->validated());

        return ChatMessageResource::make($message->load(['sender:id,name,avatar', 'receipts.user:id,name', 'attachments']))
            ->response()->setStatusCode(201);
    }

    public function markRead(Request $request, ChatConversation $conversation): JsonResponse
    {
        Gate::authorize('view', $conversation);
        $this->chatService->markRead($conversation, $request->user());

        return response()->json(['data' => ['conversation_id' => $conversation->id, 'read' => true]]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', ChatConversation::class);

        return response()->json(['data' => ['count' => ChatMessageReceipt::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->whereHas('message', fn (Builder $query) => $query->where('sender_id', '!=', $request->user()->id))
            ->count()]]);
    }

    public function socketToken(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', ChatConversation::class);

        abort_unless($request->user()->is_active, 403);
        $payload = rtrim(strtr(base64_encode(json_encode([
            'user_id' => $request->user()->id,
            'expires_at' => now()->addMinutes(5)->timestamp,
        ], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
        $signature = hash_hmac('sha256', $payload, (string) config('app.key'));

        return response()->json(['data' => ['token' => $payload.'.'.$signature, 'expires_in' => 300]]);
    }

    public function download(ChatMessageAttachment $attachment): StreamedResponse
    {
        $attachment->loadMissing('message.conversation');
        $message = $attachment->message;
        $conversation = $message->conversation;
        Gate::authorize('view', $conversation);

        if ($conversation->type === 'announcement' && ! $message->receipts()->where('user_id', auth()->id())->exists()) {
            abort(404);
        }

        abort_unless(Storage::disk($attachment->disk)->exists($attachment->path), 404);

        return Storage::disk($attachment->disk)->download($attachment->path, $attachment->original_name);
    }
}
