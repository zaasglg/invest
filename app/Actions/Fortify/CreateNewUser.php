<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'phone' => ['required', 'string', 'max:30'],
            'password' => $this->passwordRules(),
        ])->validate();

        $applicantRole = Role::query()->firstOrCreate(
            ['name' => 'applicant'],
            [
                'display_name' => 'Өтінім беруші',
                'description' => 'Өзін-өзі тіркейтін әлеуетті инвестор',
            ]
        );

        return User::create([
            'full_name' => $input['full_name'],
            'email' => Str::lower($input['email']),
            'phone' => $input['phone'],
            'password' => $input['password'],
            'requires_email_verification' => true,
            'role' => 'district_user',
            'role_id' => $applicantRole->id,
        ]);
    }
}
