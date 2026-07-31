<?php

namespace App\Http\Requests;

use App\Models\Company;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->roleModel?->name === 'superadmin';
    }

    protected function prepareForValidation(): void
    {
        $stringFields = [
            'name',
            'activity_type',
            'director_full_name',
            'contact_person',
            'phone',
            'email',
            'website',
            'legal_address',
            'actual_address',
            'notes',
        ];
        $normalized = [];

        foreach ($stringFields as $field) {
            if (! $this->exists($field)) {
                continue;
            }

            $value = trim((string) $this->input($field));
            $normalized[$field] = $value !== '' ? $value : null;
        }

        if ($this->exists('bin')) {
            $normalized['bin'] = preg_replace(
                '/\D+/',
                '',
                (string) $this->input('bin')
            );
        }

        $this->merge($normalized);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $company = $this->route('company');

        return [
            'legal_form' => [
                'required',
                Rule::in(array_keys(Company::LEGAL_FORMS)),
            ],
            'name' => 'required|string|max:255',
            'bin' => [
                'required',
                'digits:12',
                Rule::unique('companies', 'bin')->ignore($company?->id),
            ],
            'registration_date' => 'required|date|before_or_equal:today',
            'region_id' => 'required|integer|exists:regions,id',
            'activity_type' => 'required|string|max:255',
            'director_full_name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'required|string|max:30',
            'email' => 'nullable|email:rfc|max:255',
            'website' => 'nullable|url:http,https|max:255',
            'legal_address' => 'required|string|max:1000',
            'actual_address' => 'nullable|string|max:1000',
            'status' => [
                'required',
                Rule::in(array_keys(Company::STATUSES)),
            ],
            'notes' => 'nullable|string|max:5000',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'legal_form.required' => 'Ұйымдық-құқықтық нысанды таңдаңыз.',
            'name.required' => 'Компанияның ресми атауын енгізіңіз.',
            'bin.required' => 'БСН/БИН енгізіңіз.',
            'bin.digits' => 'БСН/БИН дәл 12 саннан тұруы керек.',
            'bin.unique' => 'Бұл БСН/БИН басқа компанияға тіркелген.',
            'registration_date.required' => 'Тіркелген күнін енгізіңіз.',
            'region_id.required' => 'Тіркелген аймағын таңдаңыз.',
            'activity_type.required' => 'Негізгі қызмет саласын енгізіңіз.',
            'director_full_name.required' => 'Басшының аты-жөнін енгізіңіз.',
            'phone.required' => 'Байланыс телефонын енгізіңіз.',
            'email.email' => 'Email форматы дұрыс емес.',
            'website.url' => 'Сайт адресі http:// немесе https:// арқылы басталуы керек.',
            'legal_address.required' => 'Заңды мекенжайды енгізіңіз.',
            'status.required' => 'Компания статусын таңдаңыз.',
        ];
    }
}
