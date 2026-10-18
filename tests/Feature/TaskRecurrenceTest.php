<?php

use App\Enums\RoleEnum;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->me = taskStaff(RoleEnum::Counselor);
});

function completeTask(Task $task): void
{
    test()->actingAs(test()->me)->patchJson("/api/tasks/{$task->id}/status", ['status' => 'Completed'])->assertOk();
}

test('completing a weekly task creates the next occurrence with a fresh checklist', function () {
    $assignee = taskStaff(RoleEnum::Receptionist);
    $task = Task::factory()->createdBy($this->me)->assignedTo($assignee)->dueOn('2026-10-18')->create([
        'title' => 'Weekly pipeline review', 'recurrence' => 'weekly', 'due_time' => '10:00:00', 'priority' => 'High',
    ]);
    TaskChecklistItem::factory()->completed()->create(['task_id' => $task->id, 'body' => 'Export report', 'position' => 0]);
    TaskChecklistItem::factory()->create(['task_id' => $task->id, 'body' => 'Share with team', 'position' => 1]);

    completeTask($task);

    $next = Task::query()->where('recurred_from_id', $task->id)->sole();
    expect($next->due_date->toDateString())->toBe('2026-10-25')
        ->and($next->status)->toBe(TaskStatus::Pending)
        ->and($next->title)->toBe('Weekly pipeline review')
        ->and($next->assigned_to_id)->toBe($assignee->id)
        ->and(substr($next->due_time, 0, 5))->toBe('10:00')
        ->and($next->checklistItems->pluck('body')->all())->toEqual(['Export report', 'Share with team'])
        ->and($next->checklistItems->every(fn ($item) => ! $item->is_completed))->toBeTrue();

    $this->getJson("/api/tasks/{$task->id}")->assertJsonPath('data.next_occurrence_id', $next->id);
});

test('reopening and completing again does not create a duplicate occurrence', function () {
    $task = Task::factory()->createdBy($this->me)->dueOn('2026-10-18')->create(['recurrence' => 'daily']);

    completeTask($task);
    $this->patchJson("/api/tasks/{$task->id}/status", ['status' => 'Pending'])->assertOk();
    completeTask($task);

    expect(Task::query()->where('recurred_from_id', $task->id)->count())->toBe(1);
});

test('next due dates follow the recurrence rule', function (string $recurrence, string $dueDate, string $expected) {
    $task = Task::factory()->createdBy($this->me)->dueOn($dueDate)->create(['recurrence' => $recurrence]);

    completeTask($task);

    expect(Task::query()->where('recurred_from_id', $task->id)->sole()->due_date->toDateString())->toBe($expected);
})->with([
    'daily' => ['daily', '2026-10-18', '2026-10-19'],
    'weekly' => ['weekly', '2026-10-18', '2026-10-25'],
    'monthly' => ['monthly', '2026-10-18', '2026-11-18'],
    'monthly never overflows' => ['monthly', '2027-01-31', '2027-02-28'],
    'monthly leap year' => ['monthly', '2028-01-31', '2028-02-29'],
]);

test('recurrence stops after its end date', function () {
    $task = Task::factory()->createdBy($this->me)->dueOn('2026-10-18')->create(['recurrence' => 'weekly', 'recurrence_until' => '2026-10-20']);

    completeTask($task);

    expect(Task::query()->where('recurred_from_id', $task->id)->exists())->toBeFalse();
});

test('one-off and cancelled tasks never recur', function () {
    $oneOff = Task::factory()->createdBy($this->me)->dueOn('2026-10-18')->create();
    $cancelled = Task::factory()->createdBy($this->me)->dueOn('2026-10-18')->create(['recurrence' => 'daily']);

    completeTask($oneOff);
    $this->patchJson("/api/tasks/{$cancelled->id}/status", ['status' => 'Cancelled'])->assertOk();

    expect(Task::query()->whereNotNull('recurred_from_id')->count())->toBe(0);
});
