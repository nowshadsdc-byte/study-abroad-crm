<?php

use App\Enums\RoleEnum;
use App\Models\Activity;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

test('updates record who changed what', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $task = Task::factory()->createdBy($me)->dueOn('2026-10-18')->create(['title' => 'Old title', 'priority' => 'Low']);

    $this->actingAs($me)->putJson("/api/tasks/{$task->id}", ['title' => 'New title', 'priority' => 'Urgent', 'due_date' => '2026-10-21'])->assertOk();

    $activity = Activity::query()->where('type', 'Task')->where('entity_id', $task->id)->where('action', 'updated')->sole();
    expect($activity->user_id)->toBe($me->id)
        ->and($activity->meta['changes'])->toEqual([
            'title' => ['Old title', 'New title'],
            'priority' => ['Low', 'Urgent'],
            'due_date' => ['2026-10-18', '2026-10-21'],
        ]);
});

test('saving unchanged values does not add history', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $task = Task::factory()->createdBy($me)->dueOn('2026-10-18')->create(['title' => 'Same', 'due_time' => '09:30:00']);

    $this->actingAs($me)->putJson("/api/tasks/{$task->id}", ['title' => 'Same', 'due_date' => '2026-10-18', 'due_time' => '09:30'])->assertOk();

    expect(Activity::query()->where('entity_id', $task->id)->where('type', 'Task')->count())->toBe(0);
});

test('status, checklist, assignment and note changes all appear in the history endpoint, newest first', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $colleague = taskStaff(RoleEnum::Receptionist);
    $task = Task::factory()->createdBy($me)->create();
    $item = TaskChecklistItem::factory()->create(['task_id' => $task->id, 'body' => 'Book IELTS']);

    $this->actingAs($me);
    $this->travel(1)->seconds();
    $this->putJson("/api/tasks/{$task->id}", ['assigned_to_id' => $colleague->id])->assertOk();
    $this->travel(1)->seconds();
    $this->patchJson("/api/tasks/{$task->id}/checklist/{$item->id}", ['is_completed' => true])->assertOk();
    $this->travel(1)->seconds();
    $this->postJson("/api/tasks/{$task->id}/notes", ['body' => 'Booked for Saturday'])->assertCreated();
    $this->travel(1)->seconds();
    $this->patchJson("/api/tasks/{$task->id}/status", ['status' => 'Completed'])->assertOk();

    $actions = collect($this->getJson("/api/tasks/{$task->id}/activity")->assertOk()->json('data'))->pluck('action')->all();

    expect($actions)->toEqual(['completed', 'note_added', 'checklist_completed', 'assigned', 'updated'])
        ->and($this->getJson("/api/tasks/{$task->id}/activity")->json('data.0.user.id'))->toBe($me->id);
});

test('task history is hidden from users without task access', function () {
    $task = Task::factory()->create();

    $this->actingAs(taskStaff())->getJson("/api/tasks/{$task->id}/activity")->assertForbidden();
});
