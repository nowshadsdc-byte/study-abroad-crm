<?php

namespace Database\Seeders;

use App\Enums\PermissionEnum;
use App\Enums\RoleEnum;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $permissions = collect(PermissionEnum::cases())->map(fn (PermissionEnum $permission) => $permission->value);

        $permissions->each(fn (string $name) => Permission::firstOrCreate([
            'name' => $name,
            'guard_name' => 'web',
        ]));

        $allPermissionNames = $permissions->values()->all();

        $rolePermissions = [
            RoleEnum::Administrator->value => $allPermissionNames,
            RoleEnum::Manager->value => [
                PermissionEnum::ChatView->value, PermissionEnum::ChatSend->value,
                PermissionEnum::DashboardView->value, PermissionEnum::LeadView->value, PermissionEnum::LeadCreate->value, PermissionEnum::LeadEdit->value, PermissionEnum::LeadDelete->value,
                PermissionEnum::CandidateCreate->value, PermissionEnum::CandidateEdit->value,
                PermissionEnum::FinanceCreate->value, PermissionEnum::FinanceEdit->value,
                PermissionEnum::OpportunityCreate->value, PermissionEnum::OpportunityEdit->value,
                PermissionEnum::SettingsAccess->value,
                PermissionEnum::TaskView->value, PermissionEnum::TaskCreate->value, PermissionEnum::TaskEditAny->value,
            ],
            RoleEnum::Counselor->value => [
                PermissionEnum::ChatView->value, PermissionEnum::ChatSend->value,
                PermissionEnum::DashboardView->value, PermissionEnum::LeadCreate->value, PermissionEnum::LeadView->value, PermissionEnum::LeadEdit->value,
                PermissionEnum::CandidateCreate->value, PermissionEnum::CandidateView->value, PermissionEnum::CandidateEdit->value,
                PermissionEnum::OpportunityView->value,
                PermissionEnum::TaskView->value, PermissionEnum::TaskCreate->value,
            ],
            RoleEnum::FinanceOfficer->value => [
                PermissionEnum::ChatView->value, PermissionEnum::ChatSend->value,
                PermissionEnum::DashboardView->value, PermissionEnum::FinanceView->value, PermissionEnum::FinanceCreate->value, PermissionEnum::FinanceEdit->value, PermissionEnum::CandidateView->value,
                PermissionEnum::TaskView->value, PermissionEnum::TaskCreate->value,
            ],
            RoleEnum::Receptionist->value => [
                PermissionEnum::ChatView->value, PermissionEnum::ChatSend->value,
                PermissionEnum::DashboardView->value, PermissionEnum::LeadView->value, PermissionEnum::LeadCreate->value, PermissionEnum::LeadEdit->value,
                PermissionEnum::TaskView->value, PermissionEnum::TaskCreate->value,
            ],
        ];

        foreach ($rolePermissions as $roleName => $grants) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'web'])->syncPermissions($grants);
        }

        DB::table('users')->whereNotIn('id', function ($query) {
            $query->select('model_id')->from('model_has_roles');
        })->pluck('id')->each(function (int $userId) {
            /** @var User $user */
            $user = User::query()->find($userId);
            $user?->assignRole(RoleEnum::Receptionist->value);
        });
    }
}
