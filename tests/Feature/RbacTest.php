<?php

use App\Enums\PermissionEnum;
use App\Enums\RoleEnum;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
});

function userWithRole(RoleEnum $role): User
{
    $user = User::factory()->create();
    $user->assignRole($role->value);

    return $user;
}

test('the seeder assigns the expected permissions to each role', function () {
    expect(Role::findByName(RoleEnum::Administrator->value)->permissions)->toHaveCount(count(PermissionEnum::cases()))
        ->and(Role::findByName(RoleEnum::Manager->value)->permissions)->toHaveCount(18)
        ->and(Role::findByName(RoleEnum::Counselor->value)->permissions)->toHaveCount(12)
        ->and(Role::findByName(RoleEnum::FinanceOfficer->value)->permissions)->toHaveCount(10)
        ->and(Role::findByName(RoleEnum::Receptionist->value)->permissions)->toHaveCount(8);
});

test('every staff role can open my day and only managers may edit any task', function () {
    foreach ([RoleEnum::Manager, RoleEnum::Counselor, RoleEnum::FinanceOfficer, RoleEnum::Receptionist] as $role) {
        $user = userWithRole($role);

        $this->actingAs($user)->get(route('my-day'))->assertOk();
        expect($user->can('task.create'))->toBeTrue()
            ->and($user->can('task.edit_any'))->toBe($role === RoleEnum::Manager)
            ->and($user->can('task.delete_any'))->toBeFalse();
    }
});

test('administrator bypasses all gate checks', function () {
    $administrator = userWithRole(RoleEnum::Administrator);

    expect(Gate::forUser($administrator)->allows('unregistered-ability'))->toBeTrue();
});

test('manager can access its allowed pages and settings', function () {
    $manager = userWithRole(RoleEnum::Manager);

    $this->actingAs($manager)->get(route('dashboard'))->assertOk();
    $this->get(route('leads.index'))->assertOk();
    $this->get(route('roles.index'))->assertOk();
    $this->get(route('candidates.index'))->assertForbidden();
    $this->get(route('finance.index'))->assertForbidden();
});

test('counselor can access leads candidates and opportunities only', function () {
    $counselor = userWithRole(RoleEnum::Counselor);

    $this->actingAs($counselor)->get(route('leads.index'))->assertOk();
    $this->get(route('candidates.index'))->assertOk();
    $this->get(route('opportunities.index'))->assertOk();
    $this->get(route('finance.index'))->assertForbidden();
    $this->get(route('users.index'))->assertForbidden();
});

test('finance officer and receptionist respect their access boundaries', function () {
    $financeOfficer = userWithRole(RoleEnum::FinanceOfficer);
    $this->actingAs($financeOfficer)->get(route('finance.index'))->assertOk();
    $this->get(route('candidates.index'))->assertOk();
    $this->get(route('leads.index'))->assertForbidden();

    $receptionist = userWithRole(RoleEnum::Receptionist);
    $this->actingAs($receptionist)->get(route('leads.index'))->assertOk();
    $this->get(route('candidates.index'))->assertForbidden();
});
