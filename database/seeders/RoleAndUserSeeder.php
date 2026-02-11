<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RoleAndUserSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::firstOrCreate(
            ['name' => 'superadmin'],
            [
                'display_name' => 'Суперадмин',
                'description' => 'Полный доступ ко всей системе',
            ]
        );

        User::firstOrCreate(
            ['email' => 'admin@invest.kz'],
            [
                'full_name' => 'Суперадмин',
                'password' => Hash::make('password'),
                'role' => 'admin',
                'role_id' => $role->id,
            ]
        );
    }
}
