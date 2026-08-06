<?php

namespace App\Http\Resources\Api\V1;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvestmentProjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'company_id' => $this->company_id,
            'company_name_snapshot' => $this->company_name,
            'company' => $this->whenLoaded('company', fn () => $this->company
                ? [
                    'id' => $this->company->id,
                    'name' => $this->company->name,
                    'display_name' => $this->company->display_name,
                    'bin' => $this->company->bin,
                    'activity_type' => $this->company->activity_type,
                    'director_full_name' => $this->company->director_full_name,
                    'phone' => $this->company->phone,
                    'region' => $this->company->relationLoaded('region')
                        && $this->company->region
                        ? [
                            'id' => $this->company->region->id,
                            'name' => $this->company->region->name,
                        ]
                        : null,
                ]
                : null),
            'description' => $this->description,
            'current_status' => $this->current_status,
            'region' => $this->whenLoaded('region', fn () => $this->region
                ? [
                    'id' => $this->region->id,
                    'name' => $this->region->name,
                ]
                : null),
            'primary_project_type' => $this->whenLoaded(
                'projectType',
                fn () => $this->projectType
                    ? [
                        'id' => $this->projectType->id,
                        'name' => $this->projectType->name,
                    ]
                    : null
            ),
            'project_types' => $this->namedRelation('projectTypes'),
            'sezs' => $this->namedRelation('sezs'),
            'industrial_zones' => $this->namedRelation('industrialZones'),
            'prom_zones' => $this->namedRelation('promZones'),
            'subsoil_users' => $this->namedRelation('subsoilUsers'),
            'jobs_count' => $this->jobs_count,
            'total_investment' => $this->total_investment,
            'status' => $this->status,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'is_expired' => $this->is_expired,
            'sort_order' => $this->sort_order,
            'is_archived' => $this->is_archived,
            'geometry' => $this->geometry,
            'infrastructure' => $this->infrastructure,
            'production_not_applicable' => $this->production_not_applicable,
            'production_plans' => $this->productionPlans(),
            'creator' => $this->whenLoaded(
                'creator',
                fn () => $this->userData($this->creator)
            ),
            'curators' => $this->usersRelation('curators'),
            'investors' => $this->usersRelation('investors'),
            'executors' => $this->usersRelation('executors'),
            'issues' => $this->issues(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function namedRelation(string $relation)
    {
        return $this->whenLoaded(
            $relation,
            fn () => $this->{$relation}->map(fn ($item) => [
                'id' => $item->id,
                'name' => $item->name,
            ])->values()
        );
    }

    private function usersRelation(string $relation)
    {
        return $this->whenLoaded(
            $relation,
            fn () => $this->{$relation}
                ->map(fn (User $user) => $this->userData($user))
                ->values()
        );
    }

    /** @return array<string, mixed>|null */
    private function userData(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'full_name' => $user->full_name,
            'phone' => $user->phone,
            'position' => $user->position,
            'baskarma_type' => $user->baskarma_type,
        ];
    }

    private function productionPlans()
    {
        return $this->whenLoaded(
            'productionPlans',
            fn () => $this->productionPlans->map(fn ($plan) => [
                'id' => $plan->id,
                'product_name' => $plan->product_name,
                'planned_quantity' => $plan->planned_quantity,
                'unit' => $plan->unit,
                'unit_label' => $plan->unit_label,
                'custom_unit' => $plan->custom_unit,
                'planned_amount' => $plan->planned_amount,
                'period' => $plan->period,
                'period_label' => $plan->period_label,
                'legacy_value' => $plan->legacy_value,
                'is_complete' => $plan->is_complete,
                'facts_count' => (int) ($plan->facts_count ?? 0),
                'facts' => $plan->relationLoaded('facts')
                    ? $plan->facts->map(fn ($fact) => [
                        'id' => $fact->id,
                        'period_key' => $fact->period_key,
                        'period_label' => $fact->period_label,
                        'reporting_year' => $fact->reporting_year,
                        'period_number' => $fact->period_number,
                        'actual_quantity' => $fact->actual_quantity,
                        'actual_amount' => $fact->actual_amount,
                        'notes' => $fact->notes,
                        'reporter' => $fact->relationLoaded('reporter')
                            ? $this->userData($fact->reporter)
                            : null,
                        'created_at' => $fact->created_at?->toISOString(),
                        'updated_at' => $fact->updated_at?->toISOString(),
                    ])->values()
                    : null,
            ])->values()
        );
    }

    private function issues()
    {
        return $this->whenLoaded(
            'issues',
            fn () => $this->issues->map(fn ($issue) => [
                'id' => $issue->id,
                'title' => $issue->title,
                'description' => $issue->description,
                'category' => $issue->category,
                'severity' => $issue->severity,
                'status' => $issue->status,
                'creator' => $issue->relationLoaded('creator')
                    ? $this->userData($issue->creator)
                    : null,
                'created_at' => $issue->created_at?->toISOString(),
                'updated_at' => $issue->updated_at?->toISOString(),
            ])->values()
        );
    }
}
