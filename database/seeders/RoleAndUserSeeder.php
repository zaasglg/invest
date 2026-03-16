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
        $roles = [
            [
                'name' => 'superadmin',
                'display_name' => 'Супер Админ',
                'description' => 'Полный доступ ко всей системе',
                'user' => [
                    'full_name' => 'Супер Админ',
                    'email' => 'superadmin@invest.kz',
                    'role' => 'admin',
                ],
            ],
            [
                'name' => 'invest',
                'display_name' => 'Invest Штаб',
                'description' => 'Инвестиционный штаб',
                'user' => [
                    'full_name' => 'Invest Штаб',
                    'email' => 'invest@invest.kz',
                    'role' => 'invest',
                ],
            ],
            [
                'name' => 'akim',
                'display_name' => 'Аким',
                'description' => 'Аким',
                'user' => [
                    'full_name' => 'Аким',
                    'email' => 'akim@invest.kz',
                    'role' => 'akim',
                ],
            ],
            [
                'name' => 'zamakim',
                'display_name' => 'Зам Аким',
                'description' => 'Заместитель акима',
                'user' => [
                    'full_name' => 'Зам Аким',
                    'email' => 'zamakim@invest.kz',
                    'role' => 'deputy_akim',
                ],
            ],
            [
                'name' => 'ispolnitel',
                'display_name' => 'Исполнитель',
                'description' => 'Исполнитель',
                'user' => [
                    'full_name' => 'Исполнитель',
                    'email' => 'ispolnitel@invest.kz',
                    'role' => 'district_user',
                ],
            ],
        ];

        foreach ($roles as $roleData) {
            $role = Role::firstOrCreate(
                ['name' => $roleData['name']],
                [
                    'display_name' => $roleData['display_name'],
                    'description' => $roleData['description'],
                ]
            );

            User::firstOrCreate(
                ['email' => $roleData['user']['email']],
                [
                    'full_name' => $roleData['user']['full_name'],
                    'password' => Hash::make('password'),
                    'role' => $roleData['user']['role'],
                    'role_id' => $role->id,
                ]
            );
        }
    }
}
