<?php

namespace App\Http\Requests;

use App\Models\Company;
use App\Services\PrivateFileService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InvestmentApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user()?->loadMissing('roleModel');
        $application = $this->route('investmentApplication');

        return $user?->roleModel?->name === 'applicant'
            && (! $application
                || (int) $application->user_id === (int) $user->id);
    }

    protected function prepareForValidation(): void
    {
        $strings = [
            'project_name',
            'project_description',
            'company_name',
            'director_full_name',
            'contact_person',
            'contact_phone',
            'contact_email',
            'legal_address',
        ];
        $normalized = [];

        foreach ($strings as $field) {
            if (! $this->exists($field)) {
                continue;
            }

            $value = trim((string) $this->input($field));
            $normalized[$field] = $value !== '' ? $value : null;
        }

        if ($this->exists('company_bin')) {
            $normalized['company_bin'] = preg_replace(
                '/\D+/',
                '',
                (string) $this->input('company_bin')
            );
        }

        $this->merge($normalized);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $rules = [
            'intent' => ['required', Rule::in(['draft', 'submit'])],
            'project_name' => 'required|string|max:255',
            'project_description' => 'required|string|max:10000',
            'project_type_ids' => 'required|array|min:1',
            'project_type_ids.*' => 'required|integer|distinct|exists:project_types,id',
            'requested_area' => 'required|numeric|gt:0|max:2000000000',
            'investment_amount' => 'required|numeric|min:0|max:2000000000',
            'jobs_count' => 'required|integer|min:0|max:2000000000',
            'company_legal_form' => [
                'required',
                Rule::in(array_keys(Company::LEGAL_FORMS)),
            ],
            'company_name' => 'required|string|max:255',
            'company_bin' => 'required|digits:12',
            'company_registration_date' => 'required|date|before_or_equal:today',
            'company_region_id' => [
                'required',
                'integer',
                Rule::exists('regions', 'id')->where('type', 'district'),
            ],
            'director_full_name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'contact_phone' => 'required|string|max:30',
            'contact_email' => 'required|email:rfc|max:255',
            'legal_address' => 'required|string|max:1000',
            'infrastructure_requirements' => 'nullable|array:electricity,water,gas,roads,railway,internet',
            'documents' => 'nullable|array|max:10',
            'documents.*' => [
                'required',
                'file',
                'max:10240',
                'mimes:'.PrivateFileService::DOCUMENT_MIMES,
            ],
        ];

        foreach (['electricity', 'water', 'gas', 'roads', 'railway', 'internet'] as $resource) {
            $rules["infrastructure_requirements.{$resource}"] = 'nullable|numeric|min:0|max:2000000000';
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'project_name.required' => 'Жобаның атауын енгізіңіз.',
            'project_description.required' => 'Жобаның сипаттамасын енгізіңіз.',
            'project_type_ids.required' => 'Кемінде бір қызмет түрін таңдаңыз.',
            'project_type_ids.array' => 'Қызмет түрлерін тізімнен таңдаңыз.',
            'project_type_ids.min' => 'Кемінде бір қызмет түрін таңдаңыз.',
            'project_type_ids.*.exists' => 'Таңдалған қызмет түрі табылмады.',
            'requested_area.required' => 'Қажетті гектарды енгізіңіз.',
            'requested_area.gt' => 'Қажетті гектар 0-ден үлкен болуы керек.',
            'company_bin.digits' => 'БСН дәл 12 саннан тұруы керек.',
            'company_region_id.required' => 'Компания тіркелген ауданды таңдаңыз.',
            'documents.max' => 'Бір ретте 10 файлдан артық жүктеуге болмайды.',
            'documents.*.max' => 'Әр файл 10 МБ-тан аспауы керек.',
            'documents.*.mimes' => 'Құжат форматы қолдау көрсетілмейді.',
        ];
    }
}
