<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->user()->id),
            'telegram_chat_id' => [
                'nullable',
                'string',
                'max:50',
                'regex:/^-?\d+$/',
            ],
        ];
    }

    /**
     * Get the validation error messages for the request.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'telegram_chat_id.regex' => 'Telegram ID тек сандардан тұруы керек.',
        ];
    }
}
