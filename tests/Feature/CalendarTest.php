<?php

use App\Enums\RoleEnum;
use App\Models\Lead;
use App\Models\LeadFollowUp;
use App\Models\Opportunity;
use App\Models\Task;
use App\Models\University;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    config(['app.business_timezone' => 'Asia/Dhaka']);
});

function calendarTask(User $owner, string $dueDate, array $attributes = []): Task
{
    return Task::query()->create([
        'title' => 'Task due '.$dueDate,
        'priority' => 'Medium',
        'status' => 'Pending',
        'due_date' => $dueDate,
        'created_by_id' => $owner->id,
        ...$attributes,
    ]);
}

function calendarLead(array $attributes = []): Lead
{
    return Lead::query()->create(['name' => 'Kazi Nayeem', 'source' => 'Website', 'status' => 'New', 'priority' => 'High', ...$attributes]);
}

/**
 * @return array<int, string>
 */
function calendarEventIds(array $events): array
{
    return array_column($events, 'id');
}

test('the calendar page renders for staff with task access', function () {
    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->get(route('calendar'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('calendar/index'));
});

test('users without task access cannot open the calendar or its api', function () {
    $this->actingAs(taskStaff())->get(route('calendar'))->assertForbidden();
    $this->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')->assertForbidden();
});

test('tasks inside the range are returned with their date and time', function () {
    $counselor = taskStaff(RoleEnum::Counselor);
    $inRange = calendarTask($counselor, '2026-11-10', ['due_time' => '14:30']);
    $lastDay = calendarTask($counselor, '2026-11-30');
    calendarTask($counselor, '2026-12-01');
    calendarTask($counselor, '2026-10-31');
    calendarTask($counselor, '2026-11-12', ['status' => 'Cancelled']);

    $response = $this->actingAs($counselor)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')
        ->assertOk()
        ->assertJsonPath('today', Task::businessToday());

    expect(calendarEventIds($response->json('data')))->toEqual(["task-{$inRange->id}", "task-{$lastDay->id}"])
        ->and($response->json('data.0'))->toMatchArray([
            'source' => 'task',
            'type' => 'Task',
            'date' => '2026-11-10',
            'time' => '14:30',
            'status' => 'Pending',
        ]);
});

test('counselors only see tasks involving them while supervisors see everyone unless mine only', function () {
    $counselor = taskStaff(RoleEnum::Counselor);
    $manager = taskStaff(RoleEnum::Manager);
    $mine = calendarTask($counselor, '2026-11-10');
    $assignedToMe = calendarTask($manager, '2026-11-11', ['assigned_to_id' => $counselor->id]);
    $someoneElses = calendarTask($manager, '2026-11-12');

    $counselorIds = calendarEventIds($this->actingAs($counselor)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')->json('data'));
    expect($counselorIds)->toEqual(["task-{$mine->id}", "task-{$assignedToMe->id}"]);

    $managerIds = calendarEventIds($this->actingAs($manager)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')->json('data'));
    expect($managerIds)->toEqual(["task-{$mine->id}", "task-{$assignedToMe->id}", "task-{$someoneElses->id}"]);

    $managerMineIds = calendarEventIds($this->actingAs($manager)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30&mine=1')->json('data'));
    expect($managerMineIds)->toEqual(["task-{$someoneElses->id}"]);
});

test('follow-ups are placed on the business-local day and scheduled follow-ups appear too', function () {
    $counselor = taskStaff(RoleEnum::Counselor);
    $lead = calendarLead();
    $followUp = LeadFollowUp::query()->create([
        'lead_id' => $lead->id,
        'type' => 'Call',
        'notes' => 'Discussed intake.',
        'outcome' => 'Callback',
        'follow_up_date' => '2026-11-09 20:00:00',
        'next_follow_up_date' => '2026-11-15 04:00:00',
        'created_by_id' => $counselor->id,
    ]);

    $events = $this->actingAs($counselor)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')->assertOk()->json('data');

    expect($events)->toHaveCount(2)
        ->and($events[0])->toMatchArray([
            'id' => "follow_up-{$followUp->id}",
            'source' => 'follow_up',
            'type' => 'Call',
            'title' => 'Call · Kazi Nayeem',
            'date' => '2026-11-10',
            'time' => '02:00',
            'href' => route('leads.show', $lead->id, false),
        ])
        ->and($events[1])->toMatchArray([
            'id' => "next_follow_up-{$followUp->id}",
            'title' => 'Follow-up · Kazi Nayeem',
            'date' => '2026-11-15',
            'time' => '10:00',
            'status' => 'Scheduled',
        ]);
});

test('follow-ups that fall outside the range in the business timezone are left out', function () {
    $counselor = taskStaff(RoleEnum::Counselor);
    $lead = calendarLead();
    LeadFollowUp::query()->create(['lead_id' => $lead->id, 'type' => 'Email', 'notes' => 'Sent brochure.', 'follow_up_date' => '2026-11-30 19:00:00', 'created_by_id' => $counselor->id]);

    $this->actingAs($counselor)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')->assertOk()->assertJsonCount(0, 'data');
    $this->getJson('/api/calendar?start=2026-12-01&end=2026-12-31')->assertOk()->assertJsonPath('data.0.date', '2026-12-01');
});

test('mine only keeps follow-ups the viewer logged or whose lead they own', function () {
    $counselor = taskStaff(RoleEnum::Counselor);
    $colleague = taskStaff(RoleEnum::Counselor);
    $ownLead = calendarLead(['name' => 'Own Lead', 'assigned_to_id' => $counselor->id]);
    $otherLead = calendarLead(['name' => 'Other Lead', 'assigned_to_id' => $colleague->id]);

    $onOwnLead = LeadFollowUp::query()->create(['lead_id' => $ownLead->id, 'type' => 'Visit', 'notes' => 'Visited office.', 'follow_up_date' => '2026-11-05 06:00:00', 'created_by_id' => $colleague->id]);
    $loggedByMe = LeadFollowUp::query()->create(['lead_id' => $otherLead->id, 'type' => 'WhatsApp', 'notes' => 'Sent docs list.', 'follow_up_date' => '2026-11-06 06:00:00', 'created_by_id' => $counselor->id]);
    $notMine = LeadFollowUp::query()->create(['lead_id' => $otherLead->id, 'type' => 'Meeting', 'notes' => 'Met parents.', 'follow_up_date' => '2026-11-07 06:00:00', 'created_by_id' => $colleague->id]);

    $all = calendarEventIds($this->actingAs($counselor)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')->json('data'));
    expect($all)->toContain("follow_up-{$notMine->id}");

    $mine = calendarEventIds($this->getJson('/api/calendar?start=2026-11-01&end=2026-11-30&mine=1')->json('data'));
    expect($mine)->toEqual(["follow_up-{$onOwnLead->id}", "follow_up-{$loggedByMe->id}"]);
});

test('follow-ups of archived leads are hidden', function () {
    $counselor = taskStaff(RoleEnum::Counselor);
    $lead = calendarLead();
    LeadFollowUp::query()->create(['lead_id' => $lead->id, 'type' => 'Call', 'notes' => 'No answer.', 'follow_up_date' => '2026-11-05 06:00:00', 'created_by_id' => $counselor->id]);
    $lead->delete();

    $this->actingAs($counselor)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')->assertOk()->assertJsonCount(0, 'data');
});

test('opportunity deadlines are all-day events hidden by mine only', function () {
    $counselor = taskStaff(RoleEnum::Counselor);
    $university = University::query()->create(['name' => 'Test University', 'country' => 'Canada']);
    $opportunity = Opportunity::query()->create(['university_id' => $university->id, 'title' => 'MSc Data Science', 'status' => 'Open', 'deadline' => '2026-11-20']);
    Opportunity::query()->create(['university_id' => $university->id, 'title' => 'Later intake', 'status' => 'Open', 'deadline' => '2027-01-20']);

    $this->actingAs($counselor)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', "deadline-{$opportunity->id}")
        ->assertJsonPath('data.0.type', 'Deadline')
        ->assertJsonPath('data.0.time', null)
        ->assertJsonPath('data.0.subtitle', 'Test University');

    $this->getJson('/api/calendar?start=2026-11-01&end=2026-11-30&mine=1')->assertOk()->assertJsonCount(0, 'data');
});

test('sources the viewer has no permission for are left out', function () {
    $financeOfficer = taskStaff(RoleEnum::FinanceOfficer);
    $lead = calendarLead();
    LeadFollowUp::query()->create(['lead_id' => $lead->id, 'type' => 'Call', 'notes' => 'Called.', 'follow_up_date' => '2026-11-05 06:00:00', 'created_by_id' => $financeOfficer->id]);
    $university = University::query()->create(['name' => 'Test University', 'country' => 'Canada']);
    Opportunity::query()->create(['university_id' => $university->id, 'title' => 'MSc', 'status' => 'Open', 'deadline' => '2026-11-20']);
    $task = calendarTask($financeOfficer, '2026-11-08');

    $ids = calendarEventIds($this->actingAs($financeOfficer)->getJson('/api/calendar?start=2026-11-01&end=2026-11-30')->assertOk()->json('data'));

    expect($ids)->toEqual(["task-{$task->id}"]);
});

test('the calendar range is validated', function (string $query, array $errors) {
    $this->actingAs(taskStaff(RoleEnum::Counselor))
        ->getJson('/api/calendar?'.$query)
        ->assertUnprocessable()
        ->assertJsonValidationErrors($errors);
})->with([
    'missing start' => ['end=2026-11-30', ['start']],
    'end before start' => ['start=2026-11-30&end=2026-11-01', ['end']],
    'bad date format' => ['start=30-11-2026&end=2026-12-01', ['start']],
    'range too long' => ['start=2026-01-01&end=2026-06-30', ['end']],
]);
