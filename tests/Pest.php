<?php

use App\Enums\RoleEnum;
use App\Models\User;
use Tests\TestCase;

uses(TestCase::class)->in('Feature');

/**
 * An active staff member, optionally with a role (requires RolePermissionSeeder to have run).
 */
function taskStaff(?RoleEnum $role = null, array $attributes = []): User
{
    $user = User::factory()->create(['is_active' => true, ...$attributes]);

    if ($role !== null) {
        $user->assignRole($role->value);
    }

    return $user;
}
