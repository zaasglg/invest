<?php

namespace App\Http\Requests;

use App\Models\Company;
use App\Models\IndustrialZone;
use App\Models\InvestmentApplication;
use App\Models\InvestmentProject;
use App\Models\PromZone;
use App\Models\Sez;
use App\Services\PrivateFileService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class InvestmentApplicationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user()?->loadMissing('roleModel');
        $application = $this->route('investmentApplication');

        return in_array(
            $user?->roleModel?->name,
            ['applicant', 'investor'],
            true
        )
            && (! $application
                || (int) $application->user_id === (int) $user->id);
    }

    protected function prepareForValidation(): void
    {
        $strings = [
            'project_name',
            'project_description',
            'company_activity_type',
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

        $user = $this->user()?->loadMissing(['roleModel', 'company']);
        $role = $user?->roleModel?->name;
        $applicationKind = (string) $this->input(
            'application_kind',
            'new_project'
        );
        $this->merge(['application_kind' => $applicationKind]);

        if ($applicationKind === 'expansion'
            && $role === 'investor'
            && $this->filled('source_investment_project_id')) {
            $sourceProject = InvestmentProject::query()
                ->whereKey($this->integer('source_investment_project_id'))
                ->where('company_id', $user->company_id)
                ->with('projectTypes:id,name')
                ->first();

            if ($sourceProject) {
                $this->merge([
                    'project_name' => $sourceProject->name,
                    'project_type_ids' => $sourceProject->projectTypes
                        ->pluck('id')
                        ->whenEmpty(fn ($ids) => collect([
                            $sourceProject->project_type_id,
                        ]))
                        ->filter()
                        ->values()
                        ->all(),
                ]);
            }
        }

        if ($role === 'investor' && $user?->company) {
            $this->merge($this->companySnapshot(
                $user->company,
                $user->full_name,
                $user->email,
                $user->phone
            ));

            return;
        }

        if ($role === 'applicant'
            && preg_match('/^\d{12}$/', (string) $this->input('company_bin'))) {
            $company = Company::query()
                ->where('bin', $this->input('company_bin'))
                ->first();

            if ($company) {
                $this->merge([
                    'company_legal_form' => $company->legal_form,
                    'company_name' => $company->name,
                    'company_bin' => $company->bin,
                    'company_registration_date' => $company
                        ->registration_date?->format('Y-m-d'),
                    'company_region_id' => $company->region_id,
                    'director_full_name' => $company->director_full_name,
                    'legal_address' => $company->legal_address,
                    ...(
                        filled($company->activity_type)
                            ? ['company_activity_type' => $company->activity_type]
                            : []
                    ),
                ]);
            }
        }
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $rules = [
            'intent' => ['required', Rule::in(['draft', 'submit'])],
            'application_kind' => [
                'required',
                Rule::in(array_keys(InvestmentApplication::APPLICATION_KINDS)),
            ],
            'source_investment_project_id' => [
                'nullable',
                'required_if:application_kind,expansion',
                'integer',
                'exists:investment_projects,id',
            ],
            'project_name' => 'required|string|max:255',
            'project_description' => 'required|string|max:10000',
            'project_type_ids' => 'required|array|min:1',
            'project_type_ids.*' => 'required|integer|distinct|exists:project_types,id',
            'company_activity_type' => 'required|string|max:255',
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

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->user()?->loadMissing(['roleModel', 'company']);
                $role = $user?->roleModel?->name;
                $kind = (string) $this->input('application_kind');

                if ($role === 'applicant' && $kind !== 'new_project') {
                    $validator->errors()->add(
                        'application_kind',
                        'Алғашқы өтінім тек жаңа жоба ретінде беріледі.'
                    );
                }

                if ($role === 'applicant') {
                    $company = Company::query()
                        ->where('bin', $this->input('company_bin'))
                        ->with('investor:id,company_id')
                        ->first();

                    if ($company?->investor) {
                        $validator->errors()->add(
                            'company_bin',
                            'Бұл компанияға Investor аккаунты тіркелген. Өтінімді сол аккаунтпен беріңіз.'
                        );
                    }
                }

                if ($role === 'investor' && ! $user?->company_id) {
                    $validator->errors()->add(
                        'company_bin',
                        'Investor аккаунтына компания байланыстырылмаған. Әкімшіге хабарласыңыз.'
                    );
                }

                if ($kind !== 'expansion'
                    || ! $this->filled('source_investment_project_id')) {
                    return;
                }

                if ($role !== 'investor') {
                    $validator->errors()->add(
                        'application_kind',
                        'Жобаны кеңейту өтінімін тек Investor аккаунты бере алады.'
                    );

                    return;
                }

                $project = InvestmentProject::query()
                    ->whereKey($this->integer('source_investment_project_id'))
                    ->where('company_id', $user?->company_id)
                    ->first();

                if (! $project) {
                    $validator->errors()->add(
                        'source_investment_project_id',
                        'Таңдалған жоба сіздің компанияңызға тиесілі емес.'
                    );

                    return;
                }

                if (! $this->projectBelongsToApplicationZone($project)) {
                    $validator->errors()->add(
                        'source_investment_project_id',
                        'Кеңейтілетін жоба осы инвестициялық аймаққа байланыстырылмаған.'
                    );
                }
            },
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'application_kind.required' => 'Өтінім түрін таңдаңыз.',
            'application_kind.in' => 'Өтінім түрі қате көрсетілген.',
            'source_investment_project_id.required_if' => 'Кеңейтілетін жобаны таңдаңыз.',
            'source_investment_project_id.exists' => 'Таңдалған жоба табылмады.',
            'project_name.required' => 'Жобаның атауын енгізіңіз.',
            'project_description.required' => 'Жобаның сипаттамасын енгізіңіз.',
            'project_type_ids.required' => 'Кемінде бір жоба түрін таңдаңыз.',
            'project_type_ids.array' => 'Жоба түрлерін тізімнен таңдаңыз.',
            'project_type_ids.min' => 'Кемінде бір жоба түрін таңдаңыз.',
            'project_type_ids.*.exists' => 'Таңдалған жоба түрі табылмады.',
            'company_activity_type.required' => 'Компанияның негізгі қызмет саласын енгізіңіз.',
            'requested_area.required' => 'Қажетті гектарды енгізіңіз.',
            'requested_area.gt' => 'Қажетті гектар 0-ден үлкен болуы керек.',
            'company_bin.digits' => 'БСН дәл 12 саннан тұруы керек.',
            'company_region_id.required' => 'Компания тіркелген ауданды таңдаңыз.',
            'documents.max' => 'Бір ретте 10 файлдан артық жүктеуге болмайды.',
            'documents.*.max' => 'Әр файл 10 МБ-тан аспауы керек.',
            'documents.*.mimes' => 'Құжат форматы қолдау көрсетілмейді.',
        ];
    }

    /** @return array<string, mixed> */
    private function companySnapshot(
        Company $company,
        string $userName,
        string $userEmail,
        ?string $userPhone
    ): array {
        return [
            'company_legal_form' => $company->legal_form,
            'company_name' => $company->name,
            'company_bin' => $company->bin,
            'company_registration_date' => $company
                ->registration_date?->format('Y-m-d'),
            'company_region_id' => $company->region_id,
            'director_full_name' => $company->director_full_name,
            ...(
                filled($company->activity_type)
                    ? ['company_activity_type' => $company->activity_type]
                    : []
            ),
            'contact_person' => $company->contact_person ?: $userName,
            'contact_phone' => $company->phone ?: $userPhone,
            'contact_email' => $company->email ?: $userEmail,
            'legal_address' => $company->legal_address,
        ];
    }

    private function projectBelongsToApplicationZone(
        InvestmentProject $project
    ): bool {
        $application = $this->route('investmentApplication');
        $zoneType = $application?->zone_type
            ?? (string) $this->route('zoneType');
        $zoneId = (int) ($application?->zoneable_id ?? $this->route('zone'));

        return match ($zoneType) {
            'sez' => $project->sezs()->whereKey($zoneId)->exists(),
            'industrial-zone' => $project->industrialZones()
                ->whereKey($zoneId)
                ->exists(),
            'prom-zone' => $project->promZones()->whereKey($zoneId)->exists(),
            default => match ($application?->zoneable_type) {
                Sez::class => $project->sezs()->whereKey($zoneId)->exists(),
                IndustrialZone::class => $project->industrialZones()
                    ->whereKey($zoneId)
                    ->exists(),
                PromZone::class => $project->promZones()
                    ->whereKey($zoneId)
                    ->exists(),
                default => false,
            },
        };
    }
}
