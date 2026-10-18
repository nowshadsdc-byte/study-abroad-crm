<?php

namespace App\Services;

use App\Enums\TaskStatus;
use App\Events\TaskAssigned;
use App\Events\TaskCreated;
use App\Events\TaskStatusChanged;
use App\Models\Activity;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Models\TaskNote;
use App\Models\User;
use BackedEnum;
use Carbon\CarbonImmutable;
use DateTimeInterface;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class TaskService
{
    /**
     * Fields that are recorded in the activity "changes" diff.
     */
    private const TRACKED_FIELDS = [
        'title', 'description', 'priority', 'due_date', 'due_time', 'recurrence', 'recurrence_until',
        'assigned_to_id', 'lead_id', 'candidate_id',
    ];

    /**
     * @param  array<string, mixed>  $attributes  Validated task fields, plus an optional `checklist` list of item bodies.
     */
    public function create(array $attributes, User $actor): Task
    {
        return DB::transaction(function () use ($attributes, $actor): Task {
            $checklist = Arr::pull($attributes, 'checklist', []);
            $status = TaskStatus::from($attributes['status'] ?? TaskStatus::Pending->value);

            $task = Task::create([
                ...$this->normalize($attributes),
                'status' => $status,
                'created_by_id' => $actor->id,
                ...($status === TaskStatus::Completed ? ['completed_at' => now(), 'completed_by_id' => $actor->id] : []),
            ]);

            foreach (array_values(array_filter($checklist, fn ($body) => is_string($body) && trim($body) !== '')) as $position => $body) {
                $task->checklistItems()->create(['body' => trim($body), 'position' => $position]);
            }

            $this->activity($task, $actor, 'created', "Task \"{$task->title}\" created");
            TaskCreated::dispatch($task, $actor);

            if ($task->assigned_to_id !== null) {
                $this->recordAssignment($task, $actor, null);
            }

            return $task;
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(Task $task, array $attributes, User $actor): Task
    {
        return DB::transaction(function () use ($task, $attributes, $actor): Task {
            $status = isset($attributes['status']) ? TaskStatus::from($attributes['status']) : null;
            unset($attributes['status'], $attributes['checklist']);

            $previousAssigneeId = $task->assigned_to_id;
            $task->fill($this->normalize($attributes, $task));
            $changes = $this->diff($task);

            if ($changes !== []) {
                $task->save();
                $this->activity($task, $actor, 'updated', 'Task updated', ['changes' => $changes]);

                if (array_key_exists('assigned_to_id', $changes)) {
                    $this->recordAssignment($task, $actor, $previousAssigneeId);
                }
            }

            if ($status !== null && $status !== $task->status) {
                $this->applyStatus($task, $status, $actor);
            }

            return $task->refresh();
        });
    }

    public function changeStatus(Task $task, TaskStatus $status, User $actor): Task
    {
        return DB::transaction(function () use ($task, $status, $actor): Task {
            if ($status !== $task->status) {
                $this->applyStatus($task, $status, $actor);
            }

            return $task->refresh();
        });
    }

    public function archive(Task $task, User $actor): void
    {
        DB::transaction(function () use ($task, $actor): void {
            $task->delete();
            $this->activity($task, $actor, 'deleted', "Task \"{$task->title}\" deleted");
        });
    }

    public function addChecklistItem(Task $task, string $body, User $actor): TaskChecklistItem
    {
        return DB::transaction(function () use ($task, $body, $actor): TaskChecklistItem {
            $position = $task->checklistItems()->exists() ? (int) $task->checklistItems()->max('position') + 1 : 0;
            $item = $task->checklistItems()->create(['body' => trim($body), 'position' => $position]);
            $this->activity($task, $actor, 'checklist_added', "Checklist item \"{$item->body}\" added");
            $task->touch();

            return $item;
        });
    }

    /**
     * @param  array{body?: string, is_completed?: bool}  $attributes
     */
    public function updateChecklistItem(TaskChecklistItem $item, array $attributes, User $actor): TaskChecklistItem
    {
        return DB::transaction(function () use ($item, $attributes, $actor): TaskChecklistItem {
            if (array_key_exists('body', $attributes)) {
                $item->body = trim($attributes['body']);
            }

            if (array_key_exists('is_completed', $attributes) && $attributes['is_completed'] !== $item->is_completed) {
                $item->is_completed = $attributes['is_completed'];
                $item->completed_at = $item->is_completed ? now() : null;
                $item->completed_by_id = $item->is_completed ? $actor->id : null;
            }

            if (! $item->isDirty()) {
                return $item;
            }

            $action = $item->isDirty('is_completed')
                ? ($item->is_completed ? 'checklist_completed' : 'checklist_reopened')
                : 'checklist_updated';
            $item->save();

            $description = match ($action) {
                'checklist_completed' => "Checklist item \"{$item->body}\" completed",
                'checklist_reopened' => "Checklist item \"{$item->body}\" marked incomplete",
                default => "Checklist item \"{$item->body}\" edited",
            };
            $this->activity($item->task, $actor, $action, $description);
            $item->task->touch();

            return $item;
        });
    }

    public function deleteChecklistItem(TaskChecklistItem $item, User $actor): void
    {
        DB::transaction(function () use ($item, $actor): void {
            $item->delete();
            $this->activity($item->task, $actor, 'checklist_deleted', "Checklist item \"{$item->body}\" removed");
            $item->task->touch();
        });
    }

    public function addNote(Task $task, string $body, User $actor): TaskNote
    {
        return DB::transaction(function () use ($task, $body, $actor): TaskNote {
            $note = $task->notes()->create(['body' => trim($body), 'user_id' => $actor->id]);
            $this->activity($task, $actor, 'note_added', 'Note added');
            $task->touch();

            return $note->load('user');
        });
    }

    public function updateNote(TaskNote $note, string $body, User $actor): TaskNote
    {
        return DB::transaction(function () use ($note, $body, $actor): TaskNote {
            $note->update(['body' => trim($body)]);
            $this->activity($note->task, $actor, 'note_edited', 'Note edited');

            return $note->load('user');
        });
    }

    public function deleteNote(TaskNote $note, User $actor): void
    {
        DB::transaction(function () use ($note, $actor): void {
            $note->delete();
            $this->activity($note->task, $actor, 'note_deleted', 'Note removed');
        });
    }

    private function applyStatus(Task $task, TaskStatus $status, User $actor): void
    {
        $previous = $task->status;
        $task->status = $status;
        $task->completed_at = $status === TaskStatus::Completed ? now() : null;
        $task->completed_by_id = $status === TaskStatus::Completed ? $actor->id : null;
        $task->save();

        [$action, $description] = match (true) {
            $status === TaskStatus::Completed => ['completed', 'Task completed'],
            $previous === TaskStatus::Completed => ['reopened', "Task reopened as {$status->value}"],
            default => ['status_changed', "Status changed from {$previous->value} to {$status->value}"],
        };
        $this->activity($task, $actor, $action, $description, ['changes' => ['status' => [$previous->value, $status->value]]]);
        TaskStatusChanged::dispatch($task, $actor, $previous);

        if ($status === TaskStatus::Completed) {
            $this->spawnNextOccurrence($task, $actor);
        }
    }

    /**
     * Create the next occurrence of a recurring task, at most once per task.
     */
    private function spawnNextOccurrence(Task $task, User $actor): void
    {
        $task = Task::query()->lockForUpdate()->findOrFail($task->id);

        if ($task->recurrence === null || $task->due_date === null || $task->nextOccurrence()->exists()) {
            return;
        }

        $nextDueDate = $task->recurrence->nextDueDate(CarbonImmutable::parse($task->due_date->toDateString()));

        if ($task->recurrence_until !== null && $nextDueDate->toDateString() > $task->recurrence_until->toDateString()) {
            return;
        }

        $next = Task::create([
            ...$task->only(['title', 'description', 'priority', 'due_time', 'recurrence', 'recurrence_until', 'created_by_id', 'assigned_to_id', 'lead_id', 'candidate_id']),
            'status' => TaskStatus::Pending,
            'due_date' => $nextDueDate->toDateString(),
            'recurred_from_id' => $task->id,
        ]);

        foreach ($task->checklistItems as $item) {
            $next->checklistItems()->create(['body' => $item->body, 'position' => $item->position]);
        }

        $this->activity($next, $actor, 'recurred', "Created from recurring task #{$task->id}", ['recurred_from_id' => $task->id]);
        $this->activity($task, $actor, 'recurred', "Next occurrence scheduled for {$nextDueDate->format('d M Y')}", ['next_task_id' => $next->id]);
    }

    private function recordAssignment(Task $task, User $actor, ?int $previousAssigneeId): void
    {
        $name = $task->assignee()->value('name') ?? 'nobody';
        $this->activity($task, $actor, 'assigned', "Assigned to {$name}", ['previous_assigned_to_id' => $previousAssigneeId]);
        TaskAssigned::dispatch($task, $actor, $previousAssigneeId);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private function normalize(array $attributes, ?Task $task = null): array
    {
        if (array_key_exists('title', $attributes)) {
            $attributes['title'] = trim((string) $attributes['title']);
        }

        if (isset($attributes['due_time']) && strlen((string) $attributes['due_time']) === 5) {
            $attributes['due_time'] .= ':00';
        }

        if (array_key_exists('due_date', $attributes) && $attributes['due_date'] === null) {
            $attributes['due_time'] = null;
            $attributes['recurrence'] = null;
        }

        if (array_key_exists('recurrence', $attributes) && $attributes['recurrence'] === null) {
            $attributes['recurrence_until'] = null;
        }

        if (array_key_exists('lead_id', $attributes) && $attributes['lead_id'] !== null) {
            $attributes['candidate_id'] = null;
        } elseif (array_key_exists('candidate_id', $attributes) && $attributes['candidate_id'] !== null) {
            $attributes['lead_id'] = null;
        }

        return $attributes;
    }

    /**
     * @return array<string, array{0: mixed, 1: mixed}>
     */
    private function diff(Task $task): array
    {
        $changes = [];

        foreach (array_keys($task->getDirty()) as $field) {
            if (! in_array($field, self::TRACKED_FIELDS, true)) {
                continue;
            }

            $changes[$field] = [$this->presentable($task->getOriginal($field)), $this->presentable($task->getAttribute($field))];
        }

        return $changes;
    }

    private function presentable(mixed $value): mixed
    {
        return match (true) {
            $value instanceof BackedEnum => $value->value,
            $value instanceof DateTimeInterface => $value->format('Y-m-d'),
            default => $value,
        };
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function activity(Task $task, User $actor, string $action, string $description, array $meta = []): void
    {
        Activity::create(['type' => 'Task', 'action' => $action, 'description' => $description, 'entity_id' => $task->id, 'user_id' => $actor->id, 'meta' => $meta ?: null]);
    }
}
