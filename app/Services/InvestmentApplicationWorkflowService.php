<?php

namespace App\Services;

use App\Models\Company;
use App\Models\IndustrialZone;
use App\Models\InvestmentApplication;
use App\Models\InvestmentApplicationStatusHistory;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectDocument;
use App\Models\PromZone;
use App\Models\Role;
use App\Models\Sez;
use App\Models\TaskNotification;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class InvestmentApplicationWorkflowService
{
    public function __construct(
        private readonly ZoneCapacityService $capacity
    ) {}

    public function recordCreated(
        InvestmentApplication $application,
        User $actor
    ): void {
        $this->history($application, null, 'draft', $actor);
    }

    public function submit(
        InvestmentApplication $application,
        User $actor
    ): InvestmentApplication {
        $application = DB::transaction(function () use ($application, $actor) {
            $locked = InvestmentApplication::query()
                ->lockForUpdate()
                ->findOrFail($application->id);

            abort_unless(
                (int) $locked->user_id === (int) $actor->id
                    && in_array(
                        $locked->status,
                        InvestmentApplication::EDITABLE_STATUSES,
                        true
                    ),
                403
            );

            $zone = $locked->zoneable()->lockForUpdate()->firstOrFail();
            $available = $this->capacity->summarize($zone)['available'];

            if ((float) $locked->requested_area > $available) {
                throw ValidationException::withMessages([
                    'requested_area' => "Қазіргі бос аумақ {$available} га. Сұралған гектарды азайтыңыз.",
                ]);
            }

            $from = $locked->status;
            $locked->update([
                'status' => 'submitted',
                'submitted_at' => now(),
                'reviewed_by' => null,
                'reviewed_at' => null,
                'reserved_until' => null,
            ]);
            $this->history($locked, $from, 'submitted', $actor);

            return $locked->fresh(['zoneable.region', 'applicant']);
        });

        $this->notifyReviewers($application);

        return $application;
    }

    public function beginReview(
        InvestmentApplication $application,
        User $reviewer
    ): InvestmentApplication {
        return $this->reviewTransition(
            $application,
            $reviewer,
            ['submitted'],
            'under_review',
            null,
            'Өтінім қарауға алынды.'
        );
    }

    public function requestClarification(
        InvestmentApplication $application,
        User $reviewer,
        string $comment
    ): InvestmentApplication {
        return $this->reviewTransition(
            $application,
            $reviewer,
            ['submitted', 'under_review'],
            'needs_clarification',
            $comment,
            'Өтінімге қосымша мәлімет қажет.'
        );
    }

    public function reject(
        InvestmentApplication $application,
        User $reviewer,
        string $comment
    ): InvestmentApplication {
        return $this->reviewTransition(
            $application,
            $reviewer,
            ['submitted', 'under_review'],
            'rejected',
            $comment,
            'Өтінім қабылданбады.'
        );
    }

    public function approve(
        InvestmentApplication $application,
        User $reviewer,
        float $approvedArea,
        ?string $comment
    ): InvestmentApplication {
        $application = DB::transaction(function () use (
            $application,
            $reviewer,
            $approvedArea,
            $comment
        ) {
            $locked = InvestmentApplication::query()
                ->lockForUpdate()
                ->findOrFail($application->id);

            abort_unless(
                in_array($locked->status, ['submitted', 'under_review'], true),
                422,
                'Бұл өтінімді қабылдау мүмкін емес.'
            );

            if ($approvedArea <= 0
                || $approvedArea > (float) $locked->requested_area) {
                throw ValidationException::withMessages([
                    'approved_area' => 'Мақұлданған аумақ сұралған аумақтан аспауы және 0-ден үлкен болуы керек.',
                ]);
            }

            $zone = $locked->zoneable()->lockForUpdate()->firstOrFail();
            $available = $this->capacity->summarize($zone)['available'];

            if ($approvedArea > $available) {
                throw ValidationException::withMessages([
                    'approved_area' => "Қазіргі бос аумақ {$available} га. Мақұлданатын гектарды азайтыңыз.",
                ]);
            }

            $from = $locked->status;
            $reservationDays = max(
                1,
                (int) config('investment_applications.reservation_days', 30)
            );
            $locked->update([
                'status' => 'approved',
                'approved_area' => $approvedArea,
                'reviewed_by' => $reviewer->id,
                'reviewer_comment' => $comment,
                'reviewed_at' => now(),
                'reserved_until' => now()->addDays($reservationDays),
            ]);
            $this->history(
                $locked,
                $from,
                'approved',
                $reviewer,
                $comment,
                [
                    'approved_area' => $approvedArea,
                    'reserved_until' => $locked->reserved_until?->toIso8601String(),
                ]
            );

            return $locked->fresh(['zoneable.region', 'applicant']);
        });

        $this->notifyApplicant(
            $application,
            'investment_application_approved',
            "Өтінім қабылданды. {$application->approved_area} га аумақ {$application->reserved_until?->format('d.m.Y')} дейін резервке қойылды."
        );

        return $application;
    }

    public function withdraw(
        InvestmentApplication $application,
        User $actor
    ): InvestmentApplication {
        return DB::transaction(function () use ($application, $actor) {
            $locked = InvestmentApplication::query()
                ->lockForUpdate()
                ->findOrFail($application->id);

            abort_unless(
                (int) $locked->user_id === (int) $actor->id
                    && in_array(
                        $locked->status,
                        InvestmentApplication::WITHDRAWABLE_STATUSES,
                        true
                    ),
                403
            );

            $from = $locked->status;
            $locked->update([
                'status' => 'withdrawn',
                'reserved_until' => null,
            ]);
            $this->history($locked, $from, 'withdrawn', $actor);

            return $locked->fresh();
        });
    }

    public function expire(InvestmentApplication $application): bool
    {
        $expired = DB::transaction(function () use ($application) {
            $locked = InvestmentApplication::query()
                ->lockForUpdate()
                ->find($application->id);

            if (! $locked
                || $locked->status !== 'approved'
                || ! $locked->reserved_until
                || $locked->reserved_until->isFuture()) {
                return null;
            }

            $locked->update(['status' => 'expired']);
            $this->history(
                $locked,
                'approved',
                'expired',
                null,
                'Жер резервінің мерзімі аяқталды.'
            );

            return $locked->fresh(['applicant']);
        });

        if (! $expired) {
            return false;
        }

        $this->notifyApplicant(
            $expired,
            'investment_application_expired',
            'Өтінім бойынша жер резервінің мерзімі аяқталды.'
        );

        return true;
    }

    public function convertToProject(
        InvestmentApplication $application,
        User $reviewer
    ): InvestmentProject {
        [$application, $project] = DB::transaction(function () use (
            $application,
            $reviewer
        ) {
            $locked = InvestmentApplication::query()
                ->lockForUpdate()
                ->findOrFail($application->id);

            abort_unless(
                $locked->status === 'approved',
                422,
                'Тек қабылданған өтінімді жобаға айналдыруға болады.'
            );

            if (! $locked->reserved_until || $locked->reserved_until->isPast()) {
                throw ValidationException::withMessages([
                    'application' => 'Резерв мерзімі аяқталған. Өтінімді қайта қарау қажет.',
                ]);
            }

            $zone = $locked->zoneable()->lockForUpdate()->firstOrFail();
            $projectTypes = $locked->projectTypes()
                ->get(['project_types.id', 'project_types.name']);
            $primaryTypeId = $projectTypes
                ->firstWhere('name', trim(Str::before($locked->activity_sector, ',')))
                ?->id;
            $projectTypeIds = collect([$primaryTypeId])
                ->merge($projectTypes->pluck('id'))
                ->filter()
                ->unique()
                ->values()
                ->all();
            $account = User::query()
                ->with('roleModel')
                ->lockForUpdate()
                ->findOrFail($locked->user_id);
            $company = Company::query()
                ->where('bin', $locked->company_bin)
                ->lockForUpdate()
                ->first();

            if (! $company) {
                $company = Company::create([
                    'legal_form' => $locked->company_legal_form,
                    'name' => $locked->company_name,
                    'bin' => $locked->company_bin,
                    'registration_date' => $locked->company_registration_date,
                    'region_id' => $locked->company_region_id,
                    'activity_type' => $locked->activity_sector,
                    'director_full_name' => $locked->director_full_name,
                    'contact_person' => $locked->contact_person,
                    'phone' => $locked->contact_phone,
                    'email' => $locked->contact_email,
                    'legal_address' => $locked->legal_address,
                    'status' => 'active',
                    'created_by' => $reviewer->id,
                ]);
            }

            $existingInvestor = $company->investor()->first();
            if ($existingInvestor && $existingInvestor->id !== $account->id) {
                throw ValidationException::withMessages([
                    'company_bin' => 'Бұл компанияға басқа инвестор аккаунты байланыстырылған.',
                ]);
            }

            if ($account->company_id
                && (int) $account->company_id !== (int) $company->id) {
                throw ValidationException::withMessages([
                    'company_bin' => 'Өтінім беруші басқа компанияға байланыстырылған.',
                ]);
            }

            if ($account->roleModel?->name === 'applicant') {
                $investorRole = Role::query()->firstOrCreate(
                    ['name' => 'investor'],
                    [
                        'display_name' => 'Инвестор',
                        'description' => 'Компанияның инвестициялық жобаларына қол жеткізеді',
                    ]
                );
                $account->update([
                    'role' => 'district_user',
                    'role_id' => $investorRole->id,
                    'company_id' => $company->id,
                    'phone' => $locked->contact_phone,
                ]);
            } else {
                abort_unless(
                    $account->roleModel?->name === 'investor'
                        && (int) $account->company_id === (int) $company->id,
                    403,
                    'Өтінім иесі Investor аккаунтына сәйкес келмейді.'
                );
            }

            if ($locked->application_kind === 'expansion') {
                $project = InvestmentProject::query()
                    ->lockForUpdate()
                    ->findOrFail($locked->source_investment_project_id);
                abort_unless(
                    (int) $project->company_id === (int) $company->id
                        && $this->projectBelongsToZone($project, $zone),
                    422,
                    'Кеңейтілетін жоба компанияға немесе аймаққа сәйкес келмейді.'
                );

                $project->update([
                    'jobs_count' => (int) $project->jobs_count
                        + (int) $locked->jobs_count,
                    'total_investment' => (float) $project->total_investment
                        + (float) $locked->investment_amount,
                    'infrastructure' => $this->expandedInfrastructure(
                        $project->infrastructure,
                        $locked
                    ),
                ]);
                $project->projectTypes()->syncWithoutDetaching($projectTypeIds);
                $project->curators()->syncWithoutDetaching([$reviewer->id]);
            } else {
                $project = InvestmentProject::create([
                    'name' => $locked->project_name,
                    'project_type_id' => $projectTypeIds[0] ?? null,
                    'company_id' => $company->id,
                    'company_name' => $company->display_name,
                    'description' => $locked->project_description,
                    'current_status' => 'Өтінім қабылданып, жоба құрылды.',
                    'region_id' => $zone->region_id,
                    'jobs_count' => $locked->jobs_count,
                    'production_not_applicable' => true,
                    'total_investment' => $locked->investment_amount,
                    'status' => 'plan',
                    'created_by' => $reviewer->id,
                    'infrastructure' => $this->projectInfrastructure($locked),
                ]);
                $project->projectTypes()->sync($projectTypeIds);
                $project->curators()->sync([$reviewer->id]);

                match ($zone::class) {
                    Sez::class => $project->sezs()->sync([$zone->id]),
                    IndustrialZone::class => $project->industrialZones()->sync([$zone->id]),
                    PromZone::class => $project->promZones()->sync([$zone->id]),
                };
            }

            $this->copyApplicationDocuments($locked, $project);

            $locked->update([
                'status' => 'converted_to_project',
                'investment_project_id' => $project->id,
                'converted_at' => now(),
                'reserved_until' => null,
            ]);
            $this->history(
                $locked,
                'approved',
                'converted_to_project',
                $reviewer,
                $locked->application_kind === 'expansion'
                    ? 'Өтінім бойынша бар инвестициялық жоба кеңейтілді.'
                    : 'Өтінімнен инвестициялық жоба құрылды.',
                ['investment_project_id' => $project->id]
            );
            KpiLog::activity(
                projectId: $project->id,
                event: $locked->application_kind === 'expansion'
                    ? 'project.expanded_from_application'
                    : 'project.created_from_application',
                category: 'project',
                action: $locked->application_kind === 'expansion'
                    ? 'Қабылданған өтінім бойынша жоба кеңейтілді.'
                    : 'Қабылданған өтінім бойынша жоба құрылды.',
                subject: $locked,
                properties: [
                    'application_number' => $locked->application_number,
                    'application_kind' => $locked->application_kind,
                    'approved_area' => (float) $locked->approved_area,
                    'investment_amount' => (float) $locked->investment_amount,
                    'jobs_count' => (int) $locked->jobs_count,
                    'description' => $locked->project_description,
                ],
                actor: $reviewer
            );

            return [$locked->fresh(['applicant']), $project];
        });

        TaskNotification::create([
            'user_id' => $application->user_id,
            'type' => 'investment_application_converted',
            'message' => $application->application_kind === 'expansion'
                ? 'Өтінім қабылданып, бар инвестициялық жобаңыз кеңейтілді.'
                : 'Өтінім инвестициялық жобаға айналдырылды. Енді жоба кабинетіне кіре аласыз.',
            'action_url' => route('investment-projects.show', $project, false),
            'action_label' => 'Жобаны ашу',
            'is_read' => false,
        ]);

        return $project;
    }

    private function projectBelongsToZone(
        InvestmentProject $project,
        object $zone
    ): bool {
        return match ($zone::class) {
            Sez::class => $project->sezs()->whereKey($zone->id)->exists(),
            IndustrialZone::class => $project->industrialZones()
                ->whereKey($zone->id)
                ->exists(),
            PromZone::class => $project->promZones()
                ->whereKey($zone->id)
                ->exists(),
            default => false,
        };
    }

    /** @param array<string, mixed>|null $infrastructure
     * @return array<string, mixed>
     */
    private function expandedInfrastructure(
        ?array $infrastructure,
        InvestmentApplication $application
    ): array {
        $result = $infrastructure ?? [];
        $requirements = $application->infrastructure_requirements ?? [];

        foreach (['electricity', 'water', 'gas', 'roads', 'railway', 'internet'] as $key) {
            $additional = (float) ($requirements[$key] ?? 0);
            $currentRequired = (float) data_get(
                $result,
                "{$key}.required_capacity",
                data_get($result, "{$key}.capacity", 0)
            );
            $currentUsed = (float) data_get(
                $result,
                "{$key}.used_capacity",
                0
            );
            $result[$key] = [
                ...(is_array($result[$key] ?? null) ? $result[$key] : []),
                'needed' => (bool) data_get($result, "{$key}.needed", false)
                    || $additional > 0,
                'required_capacity' => $currentRequired + $additional,
                'used_capacity' => $currentUsed,
            ];
        }

        $additionalArea = (float) $application->approved_area;
        $currentLandRequired = (float) data_get(
            $result,
            'land.required_capacity',
            0
        );
        $currentLandUsed = (float) data_get($result, 'land.used_capacity', 0);
        $result['land'] = [
            ...(is_array($result['land'] ?? null) ? $result['land'] : []),
            'needed' => true,
            'required_capacity' => $currentLandRequired + $additionalArea,
            'used_capacity' => $currentLandUsed + $additionalArea,
        ];

        return $result;
    }

    private function copyApplicationDocuments(
        InvestmentApplication $application,
        InvestmentProject $project
    ): void {
        $application->documents()->get()->each(
            function ($document) use ($project): void {
                ProjectDocument::query()->firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'file_path' => $document->file_path,
                    ],
                    [
                        'name' => $document->name,
                        'type' => $document->type,
                        'is_completed' => false,
                        'uploaded_by' => $document->uploaded_by,
                        'source' => 'investment_application',
                        'submitted_at' => now(),
                    ]
                );
            }
        );
    }

    private function reviewTransition(
        InvestmentApplication $application,
        User $reviewer,
        array $fromStatuses,
        string $toStatus,
        ?string $comment,
        string $notificationMessage
    ): InvestmentApplication {
        $application = DB::transaction(function () use (
            $application,
            $reviewer,
            $fromStatuses,
            $toStatus,
            $comment
        ) {
            $locked = InvestmentApplication::query()
                ->lockForUpdate()
                ->findOrFail($application->id);
            abort_unless(
                in_array($locked->status, $fromStatuses, true),
                422,
                'Өтінімнің ағымдағы статусында бұл әрекет қолжетімсіз.'
            );

            $from = $locked->status;
            $locked->update([
                'status' => $toStatus,
                'reviewed_by' => $reviewer->id,
                'reviewer_comment' => $comment,
                'reviewed_at' => now(),
                'reserved_until' => null,
            ]);
            $this->history($locked, $from, $toStatus, $reviewer, $comment);

            return $locked->fresh(['zoneable.region', 'applicant']);
        });

        $this->notifyApplicant(
            $application,
            'investment_application_'.$toStatus,
            $notificationMessage
        );

        return $application;
    }

    private function notifyReviewers(InvestmentApplication $application): void
    {
        $application->loadMissing(['zoneable', 'applicant']);
        $requiredSubRole = match ($application->zoneable_type) {
            Sez::class => 'aea',
            IndustrialZone::class => 'ia',
            PromZone::class => 'prom_zone',
            default => null,
        };

        User::query()
            ->with('roleModel')
            ->whereHas(
                'roleModel',
                fn ($role) => $role->whereIn('name', ['superadmin', 'invest'])
            )
            ->get()
            ->filter(function (User $user) use ($application, $requiredSubRole) {
                if ($user->roleModel?->name === 'superadmin') {
                    return true;
                }

                if ($user->region_id
                    && (int) $user->region_id !== (int) $application->zoneable?->region_id) {
                    return false;
                }

                return in_array(
                    $user->invest_sub_role,
                    [$requiredSubRole, 'turkistan_invest', null],
                    true
                );
            })
            ->each(function (User $reviewer) use ($application): void {
                TaskNotification::create([
                    'user_id' => $reviewer->id,
                    'type' => 'investment_application_submitted',
                    'message' => "{$application->application_number}: жаңа жер өтінімі жіберілді.",
                    'action_url' => route(
                        'investment-applications.show',
                        $application,
                        false
                    ),
                    'action_label' => 'Өтінімді қарау',
                    'is_read' => false,
                ]);
            });
    }

    private function notifyApplicant(
        InvestmentApplication $application,
        string $type,
        string $message
    ): void {
        TaskNotification::create([
            'user_id' => $application->user_id,
            'type' => $type,
            'message' => "{$application->application_number}: {$message}",
            'action_url' => route(
                'applicant.applications.show',
                $application,
                false
            ),
            'action_label' => 'Өтінімді ашу',
            'is_read' => false,
        ]);
    }

    /** @return array<string, array<string, int|float|bool>> */
    private function projectInfrastructure(
        InvestmentApplication $application
    ): array {
        $requirements = $application->infrastructure_requirements ?? [];
        $result = [];

        foreach (['electricity', 'water', 'gas', 'roads', 'railway', 'internet'] as $key) {
            $value = (float) ($requirements[$key] ?? 0);
            $result[$key] = [
                'needed' => $value > 0,
                'required_capacity' => $value,
                'used_capacity' => 0,
            ];
        }

        $area = (float) $application->approved_area;
        $result['land'] = [
            'needed' => true,
            'required_capacity' => $area,
            'used_capacity' => $area,
        ];

        return $result;
    }

    /** @param array<string, mixed>|null $metadata */
    private function history(
        InvestmentApplication $application,
        ?string $from,
        string $to,
        ?User $actor,
        ?string $comment = null,
        ?array $metadata = null
    ): void {
        InvestmentApplicationStatusHistory::create([
            'investment_application_id' => $application->id,
            'from_status' => $from,
            'to_status' => $to,
            'changed_by' => $actor?->id,
            'comment' => $comment,
            'metadata' => $metadata,
        ]);
    }
}
