<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\InvestmentProjectResource;
use App\Models\InvestmentProject;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvestmentProjectController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'company_id' => [
                'nullable',
                'integer',
                'exists:companies,id',
            ],
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'project_type_id' => [
                'nullable',
                'integer',
                'exists:project_types,id',
            ],
            'status' => [
                'nullable',
                Rule::in(['plan', 'implementation', 'launched', 'suspended']),
            ],
            'archived' => ['nullable', 'boolean'],
            'updated_since' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $projects = InvestmentProject::query()
            ->with($this->analyticsRelations())
            ->when(
                $validated['search'] ?? null,
                fn ($query, $search) => $query->where(
                    function ($searchQuery) use ($search): void {
                        $searchQuery
                            ->whereLike('name', '%'.$search.'%')
                            ->orWhereLike('company_name', '%'.$search.'%')
                            ->orWhereHas('company', function ($companyQuery) use ($search): void {
                                $companyQuery
                                    ->whereLike('name', '%'.$search.'%')
                                    ->orWhere('bin', 'like', '%'.$search.'%');
                            });
                    }
                )
            )
            ->when(
                $validated['company_id'] ?? null,
                fn ($query, $companyId) => $query->where(
                    'company_id',
                    $companyId
                )
            )
            ->when(
                $validated['region_id'] ?? null,
                fn ($query, $regionId) => $query->where(
                    'region_id',
                    $regionId
                )
            )
            ->when(
                $validated['project_type_id'] ?? null,
                function ($query, $projectTypeId): void {
                    $query->where(function ($typeQuery) use ($projectTypeId): void {
                        $typeQuery
                            ->where('project_type_id', $projectTypeId)
                            ->orWhereHas(
                                'projectTypes',
                                fn ($relation) => $relation->whereKey(
                                    $projectTypeId
                                )
                            );
                    });
                }
            )
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->when(
                array_key_exists('archived', $validated),
                fn ($query) => $query->where(
                    'is_archived',
                    $request->boolean('archived')
                )
            )
            ->when(
                $validated['updated_since'] ?? null,
                fn ($query, $updatedSince) => $query->where(
                    'updated_at',
                    '>=',
                    $updatedSince
                )
            )
            ->orderByDesc('updated_at')
            ->orderBy('id')
            ->paginate($validated['per_page'] ?? 25)
            ->withQueryString();

        return InvestmentProjectResource::collection($projects);
    }

    /** @return array<int, mixed> */
    private function analyticsRelations(): array
    {
        return [
            'company.region:id,name',
            'region:id,name',
            'projectType:id,name',
            'projectTypes:id,name',
            'sezs:id,name',
            'industrialZones:id,name',
            'promZones:id,name',
            'subsoilUsers:id,name',
            'creator:id,full_name,phone,position,baskarma_type',
            'curators:id,full_name,phone,position,baskarma_type',
            'investors:id,company_id,full_name,phone,position,baskarma_type',
            'executors:id,full_name,phone,position,baskarma_type',
            'issues.creator:id,full_name,phone,position,baskarma_type',
            'productionPlans' => fn ($query) => $query
                ->withCount('facts')
                ->with('facts.reporter:id,full_name,phone,position,baskarma_type'),
        ];
    }
}
