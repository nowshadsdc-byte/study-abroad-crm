<?php

namespace Database\Seeders;

use App\Enums\RoleEnum;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            UserSeeder::class,
            UniversitySeeder::class,
            SettingSeeder::class,
        ]);

        $user = User::query()->updateOrCreate(
            ['email' => 'nowshad.sdc@gmail.com'],
            [
                'name' => 'Nowshad SDC',
                'password' => '123456789',
                'email_verified_at' => now(),
                'is_active' => true,
            ],
        );

        $user->syncRoles([RoleEnum::Administrator->value]);
    }
}
