<?php

use App\Enums\RoleEnum;
use App\Enums\TaskStatus;
use App\Models\Activity;
use App\Models\Lead;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use Carbon\CarbonImmutable;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function businessDay(int $offsetDays = 0): string
{
    return CarbonImmutable::parse(Task::businessToday())->addDays($offsetDays)->toDateString();
}

test('the my day page renders for staff', function () {
    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->get(route('my-day'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('my-day/index'));
});

test('users without task access cannot open my day or the task api', function () {
    $this->actingAs(taskStaff())->get(route('my-day'))->assertForbidden();
    $this->getJson('/api/tasks')->assertForbidden();
});

test('a counselor creates a task with a checklist, assignee and linked lead', function () {
    $creator = taskStaff(RoleEnum::Counselor);
    $assignee = taskStaff(RoleEnum::Receptionist);
    $lead = Lead::query()->create(['name' => 'Ariana Rahman', 'source' => 'Website', 'status' => 'New', 'priority' => 'High']);

    $response = $this->actingAs($creator)->postJson('/api/tasks', [
        'title' => 'Call Ariana about IELTS dates',
        'description' => 'Confirm the test centre.',
        'priority' => 'High',
        'due_date' => businessDay(),
        'due_time' => '14:30',
        'assigned_to_id' => $assignee->id,
        'lead_id' => $lead->id,
        'checklist' => ['Check passport', 'Book slot', '  '],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.title', 'Call Ariana about IELTS dates')
        ->assertJsonPath('data.status', 'Pending')
        ->assertJsonPath('data.due_time', '14:30')
        ->assertJsonPath('data.due_state', 'today')
        ->assertJsonPath('data.assignee.id', $assignee->id)
        ->assertJsonPath('data.student', ['type' => 'lead', 'id' => $lead->id, 'name' => 'Ariana Rahman'])
        ->assertJsonPath('data.checklist', ['total' => 2, 'completed' => 0])
        ->assertJsonCount(2, 'data.checklist_items');

    $task = Task::query()->sole();
    expect($task->created_by_id)->toBe($creator->id)
        ->and(Activity::query()->where('type', 'Task')->where('entity_id', $task->id)->pluck('action')->all())->toEqual(['created', 'assigned']);
});

test('task input is validated', function (array $payload, array $errors) {
    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->postJson('/api/tasks', ['title' => 'Valid title', 'priority' => 'Medium', ...$payload])
        ->assertUnprocessable()
        ->assertJsonValidationErrors($errors);
})->with([
    'missing title' => [['title' => ''], ['title']],
    'unknown priority' => [['priority' => 'Critical'], ['priority']],
    'time without date' => [['due_time' => '10:00'], ['due_time']],
    'recurrence without date' => [['recurrence' => 'weekly'], ['recurrence']],
    'time with a cleared date' => [['due_date' => null, 'due_time' => '10:00'], ['due_time']],
    'bad time format' => [['due_date' => '2026-10-20', 'due_time' => '25:99'], ['due_time']],
    'recurrence end before due date' => [['due_date' => '2026-10-20', 'recurrence' => 'daily', 'recurrence_until' => '2026-10-01'], ['recurrence_until']],
]);

test('both a lead and a client cannot be linked to one task', function () {
    $lead = Lead::query()->create(['name' => 'Lead', 'source' => 'Website', 'status' => 'New', 'priority' => 'Low']);

    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->postJson('/api/tasks', ['title' => 'Linked twice', 'priority' => 'Low', 'lead_id' => $lead->id, 'candidate_id' => 1])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['lead_id']);
});

test('tasks can only be assigned to active users who can see tasks', function () {
    $creator = taskStaff(RoleEnum::Counselor);
    $inactive = taskStaff(RoleEnum::Counselor, ['is_active' => false]);
    $noAccess = taskStaff();

    foreach ([$inactive, $noAccess] as $assignee) {
        $this->actingAs($creator)
            ->postJson('/api/tasks', ['title' => 'Assign me', 'priority' => 'Low', 'assigned_to_id' => $assignee->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['assigned_to_id']);
    }

    $this->getJson('/api/tasks/assignable-users')
        ->assertOk()
        ->assertJsonMissing(['id' => $inactive->id])
        ->assertJsonMissing(['id' => $noAccess->id])
        ->assertJsonFragment(['id' => $creator->id]);
});

test('each view returns the right tasks and the tab counts match', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $colleague = taskStaff(RoleEnum::Counselor);

    $dueToday = Task::factory()->createdBy($colleague)->assignedTo($me)->dueOn(businessDay())->create();
    $overdueOwn = Task::factory()->createdBy($me)->dueOn(businessDay(-2))->create();
    $upcoming = Task::factory()->createdBy($colleague)->assignedTo($me)->dueOn(businessDay(3))->create();
    $noDate = Task::factory()->createdBy($colleague)->assignedTo($me)->dueOn(null)->create();
    $completed = Task::factory()->createdBy($colleague)->assignedTo($me)->completed()->create();
    $delegated = Task::factory()->createdBy($me)->assignedTo($colleague)->dueOn(businessDay())->create();
    $unrelated = Task::factory()->createdBy($colleague)->dueOn(businessDay())->create();

    $ids = fn (string $view) => collect($this->actingAs($me)->getJson("/api/tasks?view={$view}")->assertOk()->json('data'))->pluck('id')->sort()->values()->all();

    expect($ids('my_day'))->toEqual(collect([$dueToday->id, $overdueOwn->id])->sort()->values()->all())
        ->and($ids('assigned'))->toEqual(collect([$dueToday->id, $upcoming->id, $noDate->id])->sort()->values()->all())
        ->and($ids('created'))->toEqual(collect([$overdueOwn->id, $delegated->id])->sort()->values()->all())
        ->and($ids('upcoming'))->toEqual([$upcoming->id])
        ->and($ids('completed'))->toEqual([$completed->id])
        ->and($ids('all'))->toHaveCount(7)->toContain($unrelated->id);

    $this->getJson('/api/tasks?view=my_day')->assertJsonPath('counts', [
        'my_day' => 2, 'overdue' => 1, 'assigned' => 3, 'created' => 2, 'upcoming' => 1, 'completed' => 1, 'all' => 7,
    ]);
});

test('my day lists overdue tasks first, then by due time', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $later = Task::factory()->createdBy($me)->dueOn(businessDay())->create(['due_time' => '16:00:00']);
    $earlier = Task::factory()->createdBy($me)->dueOn(businessDay())->create(['due_time' => '09:00:00']);
    $overdue = Task::factory()->createdBy($me)->dueOn(businessDay(-1))->create();

    $this->actingAs($me)->getJson('/api/tasks?view=my_day')
        ->assertJsonPath('data.0.id', $overdue->id)
        ->assertJsonPath('data.0.due_state', 'overdue')
        ->assertJsonPath('data.1.id', $earlier->id)
        ->assertJsonPath('data.2.id', $later->id);
});

test('tasks can be searched and filtered', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $visa = Task::factory()->createdBy($me)->assignedTo($me)->create(['title' => 'Prepare visa file', 'priority' => 'Urgent']);
    Task::factory()->createdBy($me)->assignedTo($me)->create(['title' => 'Send offer letter', 'priority' => 'Low']);
    $done = Task::factory()->createdBy($me)->assignedTo($me)->completed()->create(['title' => 'Old visa task']);

    $this->actingAs($me)->getJson('/api/tasks?view=assigned&search=visa')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $visa->id);
    $this->getJson('/api/tasks?view=assigned&priority=Low')->assertJsonCount(1, 'data');
    $this->getJson('/api/tasks?view=assigned&status[]=Completed')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $done->id);
    $this->getJson('/api/tasks?view=all&due_from='.businessDay(1))->assertJsonCount(0, 'data');
    $this->getJson('/api/tasks?view=nope')->assertUnprocessable();
});

test('updating a task changes its details and clearing the date clears time and recurrence', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $task = Task::factory()->createdBy($me)->create(['due_time' => '10:00:00', 'recurrence' => 'weekly']);

    $this->actingAs($me)->putJson("/api/tasks/{$task->id}", ['title' => 'Renamed', 'priority' => 'High', 'due_date' => null])
        ->assertOk()
        ->assertJsonPath('data.title', 'Renamed')
        ->assertJsonPath('data.priority', 'High')
        ->assertJsonPath('data.due_date', null)
        ->assertJsonPath('data.due_time', null)
        ->assertJsonPath('data.recurrence', null)
        ->assertJsonPath('data.due_state', 'none');
});

test('the status endpoint completes and reopens a task', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $task = Task::factory()->createdBy($me)->create();

    $this->actingAs($me)->patchJson("/api/tasks/{$task->id}/status", ['status' => 'Completed'])
        ->assertOk()
        ->assertJsonPath('data.status', 'Completed')
        ->assertJsonPath('data.due_state', 'completed')
        ->assertJsonPath('data.completed_by.id', $me->id);

    $this->patchJson("/api/tasks/{$task->id}/status", ['status' => 'In Progress'])
        ->assertOk()
        ->assertJsonPath('data.status', 'In Progress')
        ->assertJsonPath('data.completed_at', null);

    $this->patchJson("/api/tasks/{$task->id}/status", ['status' => 'Done'])->assertUnprocessable();
});

test('checklist items are added, edited, toggled and removed', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $task = Task::factory()->createdBy($me)->create();

    $first = $this->actingAs($me)->postJson("/api/tasks/{$task->id}/checklist", ['body' => 'Collect transcripts'])->assertCreated()->json('data');
    $second = $this->postJson("/api/tasks/{$task->id}/checklist", ['body' => 'Scan passport'])->assertCreated()->json('data');
    expect($second['position'])->toBe($first['position'] + 1);

    $this->patchJson("/api/tasks/{$task->id}/checklist/{$first['id']}", ['is_completed' => true])
        ->assertOk()
        ->assertJsonPath('data.is_completed', true)
        ->assertJsonPath('data.completed_by.id', $me->id);
    $this->patchJson("/api/tasks/{$task->id}/checklist/{$second['id']}", ['body' => 'Scan passport (all pages)'])
        ->assertOk()
        ->assertJsonPath('data.body', 'Scan passport (all pages)');

    $this->getJson('/api/tasks?view=all')->assertJsonPath('data.0.checklist', ['total' => 2, 'completed' => 1]);

    $this->deleteJson("/api/tasks/{$task->id}/checklist/{$second['id']}")->assertNoContent();
    expect(TaskChecklistItem::query()->count())->toBe(1);
});

test('notes are added and edited by their author', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $task = Task::factory()->createdBy($me)->create();

    $note = $this->actingAs($me)->postJson("/api/tasks/{$task->id}/notes", ['body' => 'Left a voicemail.'])
        ->assertCreated()
        ->assertJsonPath('data.user.id', $me->id)
        ->assertJsonPath('data.is_edited', false)
        ->json('data');

    $this->travel(2)->minutes();

    $this->patchJson("/api/tasks/{$task->id}/notes/{$note['id']}", ['body' => 'Left a voicemail, will retry at 4 PM.'])
        ->assertOk()
        ->assertJsonPath('data.is_edited', true);

    $this->getJson("/api/tasks/{$task->id}")->assertJsonCount(1, 'data.notes')->assertJsonPath('data.notes.0.can.manage', true);
    $this->deleteJson("/api/tasks/{$task->id}/notes/{$note['id']}")->assertNoContent();
});

test('deleting a task archives it', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $task = Task::factory()->createdBy($me)->create();

    $this->actingAs($me)->deleteJson("/api/tasks/{$task->id}")->assertNoContent();

    expect(Task::query()->count())->toBe(0)->and(Task::withTrashed()->count())->toBe(1);
    $this->getJson("/api/tasks/{$task->id}")->assertNotFound();
});

test('completing via the update endpoint uses the same status rules', function () {
    $me = taskStaff(RoleEnum::Counselor);
    $task = Task::factory()->createdBy($me)->create();

    $this->actingAs($me)->putJson("/api/tasks/{$task->id}", ['status' => 'Completed'])->assertOk();

    expect($task->fresh()->status)->toBe(TaskStatus::Completed)->and($task->fresh()->completed_at)->not->toBeNull();
});
