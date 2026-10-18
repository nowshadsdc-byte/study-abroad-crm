<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class PublishChatSocketEvent implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * @param  array<int>  $userIds
     * @param  array<string, mixed>  $payload
     */
    public function __construct(public string $event, public array $userIds, public array $payload) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $baseUrl = rtrim((string) config('services.chat_socket.url'), '/');
        $key = (string) config('app.key');

        if ($baseUrl === '' || $key === '') {
            throw new \RuntimeException('Chat Socket.IO service is not configured.');
        }

        Http::withToken($key)
            ->timeout(5)
            ->retry([100, 500, 1000], throw: false)
            ->post($baseUrl.'/internal/emit', [
                'event' => $this->event,
                'user_ids' => array_values(array_unique($this->userIds)),
                'payload' => $this->payload,
            ])
            ->throw();
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('Chat socket event delivery failed.', [
            'event' => $this->event,
            'user_ids' => $this->userIds,
            'error' => $exception?->getMessage(),
        ]);
    }
}
