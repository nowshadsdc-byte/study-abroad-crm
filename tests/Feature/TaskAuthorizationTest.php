<?php

use App\Enums\RoleEnum;
use App\Models\Lead;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Models\TaskNote;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->creator = taskStaff(RoleEnum::Counselor);
    $this->assignee = taskStaff(RoleEnum::Receptionist);
    $this->task = Task::factory()->createdBy($this->creator)->assignedTo($this->assignee)->create();
    $this->item = TaskChecklistItem::factory()->create(['task_id' => $this->task->id]);
});

/**
 * Resolve the actor for a dataset row.
 */
function taskActor(string $who): User
{
    return match ($who) {
        'creator' => test()->creator,
        'assignee' => test()->assignee,
        'manager with edit_any' => taskStaff(RoleEnum::Manager),
        'viewer without ownership' => taskStaff(RoleEnum::Counselor),
        'user without task.view' => taskStaff(),
    };
}

test('task permissions are enforced on direct api calls', function (string $who, int $view, int $update, int $status, int $checklistAdd, int $checklistToggle, int $delete) {
    $actor = taskActor($who);
    $task = $this->task;

    $this->actingAs($actor)->getJson("/api/tasks/{$task->id}")->assertStatus($view);
    $this->putJson("/api/tasks/{$task->id}", ['title' => 'Edited by '.$who])->assertStatus($update);
    $this->patchJson("/api/tasks/{$task->id}/status", ['status' => 'In Progress'])->assertStatus($status);
    $this->postJson("/api/tasks/{$task->id}/checklist", ['body' => 'Extra step'])->assertStatus($checklistAdd);
    $this->patchJson("/api/tasks/{$task->id}/checklist/{$this->item->id}", ['is_completed' => true])->assertStatus($checklistToggle);
    $this->deleteJson("/api/tasks/{$task->id}/checklist/{$this->item->id}")->assertStatus($checklistToggle === 200 ? 204 : $checklistToggle);
    $this->deleteJson("/api/tasks/{$task->id}")->assertStatus($delete);
})->with([
    'creator' => ['creator', 200, 200, 200, 201, 200, 204],
    'assignee' => ['assignee', 200, 200, 200, 201, 200, 204],
    'manager with edit_any (no delete)' => ['manager with edit_any', 200, 200, 200, 201, 200, 403],
    'viewer without ownership' => ['viewer without ownership', 200, 403, 403, 403, 403, 403],
    'user without task.view' => ['user without task.view', 403, 403, 403, 403, 403, 403],
]);

test('only users with task.delete_any may delete tasks they do not own', function () {
    $supervisor = taskStaff(RoleEnum::Manager);
    $this->actingAs($supervisor)->deleteJson("/api/tasks/{$this->task->id}")->assertForbidden();

    $supervisor->givePermissionTo('task.delete_any');
    $this->actingAs($supervisor->fresh())->deleteJson("/api/tasks/{$this->task->id}")->assertNoContent();
});

test('administrators can do everything', function () {
    $admin = taskStaff(RoleEnum::Administrator);

    $this->actingAs($admin)->putJson("/api/tasks/{$this->task->id}", ['priority' => 'Urgent'])->assertOk();
    $this->deleteJson("/api/tasks/{$this->task->id}")->assertNoContent();
});

test('the task list exposes per-row abilities for the ui', function () {
    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->getJson('/api/tasks?view=all')
        ->assertJsonPath('data.0.can', ['update' => false, 'delete' => false]);

    $this->actingAs($this->creator)
        ->getJson('/api/tasks?view=all')
        ->assertJsonPath('data.0.can', ['update' => true, 'delete' => true]);
});

test('anyone who can see a task may add notes, but only the author or a supervisor may edit them', function () {
    $colleague = taskStaff(RoleEnum::Counselor);
    $note = TaskNote::query()->create(['task_id' => $this->task->id, 'user_id' => $this->creator->id, 'body' => 'Original']);

    $this->actingAs($colleague)->postJson("/api/tasks/{$this->task->id}/notes", ['body' => 'FYI'])->assertCreated();
    $this->patchJson("/api/tasks/{$this->task->id}/notes/{$note->id}", ['body' => 'Hijacked'])->assertForbidden();
    $this->deleteJson("/api/tasks/{$this->task->id}/notes/{$note->id}")->assertForbidden();

    $this->actingAs(taskStaff(RoleEnum::Manager))->patchJson("/api/tasks/{$this->task->id}/notes/{$note->id}", ['body' => 'Clarified'])->assertOk();
    $this->actingAs($this->creator)->deleteJson("/api/tasks/{$this->task->id}/notes/{$note->id}")->assertNoContent();
});

test('checklist items and notes cannot be reached through another task', function () {
    $otherTask = Task::factory()->createdBy($this->creator)->create();
    $note = TaskNote::query()->create(['task_id' => $this->task->id, 'user_id' => $this->creator->id, 'body' => 'Mine']);

    $this->actingAs($this->creator)->patchJson("/api/tasks/{$otherTask->id}/checklist/{$this->item->id}", ['is_completed' => true])->assertNotFound();
    $this->deleteJson("/api/tasks/{$otherTask->id}/checklist/{$this->item->id}")->assertNotFound();
    $this->patchJson("/api/tasks/{$otherTask->id}/notes/{$note->id}", ['body' => 'Moved'])->assertNotFound();

    expect($this->item->fresh()->is_completed)->toBeFalse();
});

test('linking a lead requires permission to view leads', function () {
    $financeOfficer = taskStaff(RoleEnum::FinanceOfficer);
    $lead = Lead::query()->create(['name' => 'Private Lead', 'source' => 'Website', 'status' => 'New', 'priority' => 'Low']);

    $this->actingAs($financeOfficer)->postJson('/api/tasks', ['title' => 'Chase payment', 'priority' => 'Medium', 'lead_id' => $lead->id])->assertForbidden();

    $task = Task::factory()->createdBy($this->creator)->create(['lead_id' => $lead->id]);
    $this->getJson("/api/tasks/{$task->id}")->assertOk()->assertJsonPath('data.student', null);
});

test('users without task.create cannot create tasks or list assignees', function () {
    $user = taskStaff();
    $user->givePermissionTo('task.view');

    $this->actingAs($user)->postJson('/api/tasks', ['title' => 'Nope', 'priority' => 'Low'])->assertForbidden();
    $this->getJson('/api/tasks/assignable-users')->assertForbidden();
});
