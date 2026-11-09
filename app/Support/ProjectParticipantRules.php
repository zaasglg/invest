<?php

namespace App\Support;

use App\Models\InvestmentProject;
use App\Models\User;
use Closure;
use Illuminate\Validation\ValidationException;

final class ProjectParticipantRules
{
    public static function assertActiveAssignmentsRetained(InvestmentProject $project, ?array $curatorIds, ?int $companyId): void
    {
        $responsible = $project->attractionActivities()
            ->whereIn('status', ['planned', 'in_progress', 'pending_review'])
            ->pluck('responsible_id')->filter()->map(fn ($id) => (int) $id)->all();
        if (! $responsible) {
            return;
        }

        if ($curatorIds !== null) {
            $oldCurators = $project->curators()->pluck('users.id')->map(fn ($id) => (int) $id)->all();
            if (array_diff(array_intersect($responsible, $oldCurators), $curatorIds)) {
                throw ValidationException::withMessages([
                    'curator_ids' => 'Аяқталмаған іс-шараға жауапты кураторды алып тастауға болмайды. Алдымен оның жұмысын басқа адамға беріңіз немесе аяқтаңыз.',
                ]);
            }
        }

        if ((int) $project->company_id !== (int) $companyId
            && User::whereIn('id', $responsible)->where('company_id', $project->company_id)
                ->whereHas('roleModel', fn ($query) => $query->where('name', 'investor'))->exists()) {
            throw ValidationException::withMessages([
                'company_id' => 'Қазіргі компания инвесторына аяқталмаған іс-шара берілген. Алдымен жауаптыны ауыстырыңыз немесе жұмысты аяқтаңыз.',
            ]);
        }
    }

    public static function executor(int $regionId, ?InvestmentProject $project = null): array
    {
        return ['bail', 'integer', 'distinct', 'exists:users,id',
            function (string $attribute, mixed $value, Closure $fail) use ($regionId, $project) {
                $user = User::with('roleModel')->find($value);
                if ($user?->roleModel?->name !== 'ispolnitel'
                    || ($user->baskarma_type === 'district' && (int) $user->region_id !== $regionId
                        && ! $project?->executors()->whereKey($user->id)->exists())) {
                    $fail('Жобаның ауданына тиісті аудан орындаушысын немесе облыстық/қосымша орындаушыны таңдаңыз.');
                }
            },
        ];
    }

    public static function curator(int $regionId): array
    {
        return ['bail', 'integer', 'distinct', 'exists:users,id',
            function (string $attribute, mixed $value, Closure $fail) use ($regionId) {
                $user = User::with('roleModel')->find($value);
                if (! in_array($user?->roleModel?->name, ['superadmin', 'invest', 'moderator'], true)
                    || ($user->roleModel?->name === 'invest' && $user->region_id && (int) $user->region_id !== $regionId)) {
                    $fail('Жобаға қолжетімділігі бар кураторды таңдаңыз.');
                }
            },
        ];
    }
}
