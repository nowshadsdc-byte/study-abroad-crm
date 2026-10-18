<?php

use App\Enums\RoleEnum;
use App\Models\Task;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

afterEach(function () {
    Carbon::setTestNow();
});

test('today and overdue are decided in the business timezone, not UTC', function () {
    // 19:30 UTC on 18 Oct is 01:30 on 19 Oct in Dhaka.
    Carbon::setTestNow(Carbon::parse('2026-10-18 19:30:00', 'UTC'));
    $me = taskStaff(RoleEnum::Counselor);

    $yesterdayInDhaka = Task::factory()->createdBy($me)->dueOn('2026-10-18')->create();
    $todayInDhaka = Task::factory()->createdBy($me)->dueOn('2026-10-19')->create();
    $tomorrowInDhaka = Task::factory()->createdBy($me)->dueOn('2026-10-20')->create();

    expect(Task::businessToday())->toBe('2026-10-19')
        ->and($yesterdayInDhaka->dueState())->toBe('overdue')
        ->and($todayInDhaka->dueState())->toBe('today')
        ->and($tomorrowInDhaka->dueState())->toBe('upcoming');

    $this->actingAs($me)->getJson('/api/tasks?view=my_day')
        ->assertJsonPath('today', '2026-10-19')
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('counts.overdue', 1)
        ->assertJsonPath('counts.upcoming', 1);
});

test('the business timezone is configurable', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-18 19:30:00', 'UTC'));
    config(['app.business_timezone' => 'UTC']);

    expect(Task::businessToday())->toBe('2026-10-18');
});

test('due date range filters include both ends', function () {
    Carbon::setTestNow(Carbon::parse('2026-10-18 06:00:00', 'UTC'));
    $me = taskStaff(RoleEnum::Counselor);
    Task::factory()->createdBy($me)->dueOn('2026-10-20')->create();
    Task::factory()->createdBy($me)->dueOn('2026-10-22')->create();
    Task::factory()->createdBy($me)->dueOn('2026-10-23')->create();

    $this->actingAs($me)->getJson('/api/tasks?view=all&due_from=2026-10-20&due_to=2026-10-22')->assertJsonCount(2, 'data');
    $this->getJson('/api/tasks?view=all&due_from=2026-10-22&due_to=2026-10-20')->assertUnprocessable();
});
