<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\ProjectProductionFact;
use App\Models\ProjectProductionPlan;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class ProjectProductionService
{
    public function __construct(
        private readonly InvestmentProjectAccessService $projectAccess
    ) {}

    /** @param array<int, array<string, mixed>> $rows */
    public function assertNewPlansAreComplete(array $rows): void
    {
        foreach ($rows as $index => $row) {
            if ($this->isCompleteRow($row)) {
                continue;
            }

            $this->throwIncompleteRow($row, $index);
        }
    }

    /** @param array<int, array<string, mixed>> $rows */
    public function assertApplicability(
        bool $notApplicable,
        array $rows
    ): void {
        if ($notApplicable && $rows !== []) {
            throw ValidationException::withMessages([
                'planned_production' => '«Жоспарлы өндіріс қолданылмайды» таңдалса, өнім жолдарын алып тастаңыз.',
            ]);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function assertPlansCanBeSynced(
        InvestmentProject $project,
        array $rows
    ): void {
        $existing = $project->productionPlans()
            ->withCount('facts')
            ->get()
            ->keyBy('id');
        $submittedIds = collect($rows)
            ->pluck('id')
            ->filter()
            ->map(fn ($id) => (int) $id);

        foreach ($submittedIds as $id) {
            if (! $existing->has($id)) {
                throw ValidationException::withMessages([
                    'planned_production' => 'Таңдалған өндіріс жоспары бұл жобаға тиесілі емес.',
                ]);
            }
        }

        $protected = $existing
            ->reject(fn (ProjectProductionPlan $plan) => $submittedIds
                ->contains($plan->id))
            ->first(fn (ProjectProductionPlan $plan) => $plan->facts_count > 0);

        if ($protected) {
            throw ValidationException::withMessages([
                'planned_production' => 'Нақты өндіріс есебі бар жоспарды өшіруге болмайды.',
            ]);
        }

        foreach ($rows as $index => $row) {
            $plan = isset($row['id'])
                ? $existing->get((int) $row['id'])
                : null;

            if ($this->isCompleteRow($row)) {
                continue;
            }

            if ($plan && filled($plan->legacy_value)) {
                continue;
            }

            $this->throwIncompleteRow($row, $index);
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function syncPlans(
        InvestmentProject $project,
        array $rows
    ): void {
        $existing = $project->productionPlans()->get()->keyBy('id');
        $keptIds = [];

        foreach (array_values($rows) as $sortOrder => $row) {
            $plan = isset($row['id'])
                ? $existing->get((int) $row['id'])
                : null;

            if ($plan && ! $this->isCompleteRow($row)) {
                $keptIds[] = $plan->id;

                continue;
            }

            $attributes = Arr::only($row, [
                'product_name',
                'planned_quantity',
                'unit',
                'custom_unit',
                'planned_amount',
                'period',
            ]);
            $attributes['custom_unit'] = $attributes['unit'] === 'other'
                ? trim((string) ($attributes['custom_unit'] ?? ''))
                : null;
            $attributes['legacy_value'] = null;
            $attributes['sort_order'] = $sortOrder;

            if ($plan) {
                $plan->update($attributes);
            } else {
                $plan = $project->productionPlans()->create($attributes);
            }

            $keptIds[] = $plan->id;
        }

        $project->productionPlans()
            ->when(
                $keptIds !== [],
                fn ($query) => $query->whereNotIn('id', $keptIds)
            )
            ->whereDoesntHave('facts')
            ->delete();
    }

    /** @param array<int, array<string, mixed>> $rows */
    public function appendPlans(
        InvestmentProject $project,
        array $rows
    ): void {
        $currentMaxSortOrder = $project->productionPlans()->max('sort_order');
        $nextSortOrder = $currentMaxSortOrder === null
            ? 0
            : (int) $currentMaxSortOrder + 1;

        foreach (array_values($rows) as $index => $row) {
            $attributes = Arr::only($row, [
                'product_name',
                'planned_quantity',
                'unit',
                'custom_unit',
                'planned_amount',
                'period',
            ]);
            $attributes['custom_unit'] = $attributes['unit'] === 'other'
                ? trim((string) ($attributes['custom_unit'] ?? ''))
                : null;
            $attributes['legacy_value'] = null;
            $attributes['sort_order'] = $nextSortOrder + $index;

            $project->productionPlans()->create($attributes);
        }
    }

    public function canReport(User $user, InvestmentProject $project): bool
    {
        $role = $user->loadMissing('roleModel')->roleModel?->name;

        return ! $project->is_archived
            && in_array(
                $role,
                ['superadmin', 'invest', 'moderator', 'investor'],
                true
            )
            && $this->projectAccess->canView($user, $project);
    }

    /** @param array<string, mixed> $data */
    public function saveFact(
        ProjectProductionPlan $plan,
        array $data,
        User $reporter
    ): ProjectProductionFact {
        [$periodKey, $year, $periodNumber] = $this->periodIdentity(
            $plan,
            $data
        );

        return $plan->facts()->updateOrCreate(
            ['period_key' => $periodKey],
            [
                'reporting_year' => $year,
                'period_number' => $periodNumber,
                'actual_quantity' => $data['actual_quantity'],
                'actual_amount' => $data['actual_amount'],
                'notes' => $data['notes'] ?? null,
                'reported_by' => $reporter->id,
            ]
        );
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function activitySnapshot(InvestmentProject $project): array
    {
        return $project->productionPlans()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (ProjectProductionPlan $plan) => [
                'product_name' => $plan->product_name,
                'planned_quantity' => $plan->planned_quantity,
                'unit' => $plan->unit_label,
                'planned_amount' => $plan->planned_amount,
                'period' => $plan->period_label,
                'legacy_value' => $plan->legacy_value,
            ])
            ->all();
    }

    /** @param array<string, mixed> $row */
    private function isCompleteRow(array $row): bool
    {
        return filled($row['planned_quantity'] ?? null)
            && array_key_exists('planned_amount', $row)
            && $row['planned_amount'] !== null
            && $row['planned_amount'] !== ''
            && (($row['unit'] ?? null) !== 'other'
                || filled($row['custom_unit'] ?? null));
    }

    /** @param array<string, mixed> $row */
    private function throwIncompleteRow(array $row, int $index): never
    {
        $prefix = "planned_production.{$index}";
        $errors = [];

        if (! filled($row['planned_quantity'] ?? null)) {
            $errors["{$prefix}.planned_quantity"] = 'Жоспарлы көлемді енгізіңіз.';
        }

        if (! array_key_exists('planned_amount', $row)
            || $row['planned_amount'] === null
            || $row['planned_amount'] === '') {
            $errors["{$prefix}.planned_amount"] = 'Жоспарлы соманы енгізіңіз.';
        }

        if (($row['unit'] ?? null) === 'other'
            && ! filled($row['custom_unit'] ?? null)) {
            $errors["{$prefix}.custom_unit"] = 'Өлшем бірлігін жазыңыз.';
        }

        throw ValidationException::withMessages($errors ?: [
            $prefix => 'Өндіріс жоспарын толық толтырыңыз.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: int|null, 2: int|null}
     */
    private function periodIdentity(
        ProjectProductionPlan $plan,
        array $data
    ): array {
        if ($plan->period === 'project') {
            return ['project', null, null];
        }

        $year = (int) $data['reporting_year'];

        return match ($plan->period) {
            'month' => [
                sprintf('%04d-%02d', $year, (int) $data['period_number']),
                $year,
                (int) $data['period_number'],
            ],
            'quarter' => [
                sprintf('%04d-Q%d', $year, (int) $data['period_number']),
                $year,
                (int) $data['period_number'],
            ],
            default => [(string) $year, $year, null],
        };
    }
}
