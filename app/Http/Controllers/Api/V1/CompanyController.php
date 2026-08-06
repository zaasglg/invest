<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\CompanyResource;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => [
                'nullable',
                Rule::in(array_keys(Company::STATUSES)),
            ],
            'legal_form' => [
                'nullable',
                Rule::in(array_keys(Company::LEGAL_FORMS)),
            ],
            'region_id' => ['nullable', 'integer', 'exists:regions,id'],
            'updated_since' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'between:1,100'],
        ]);

        $companies = Company::query()
            ->with([
                'region:id,name',
                'investor:id,company_id,full_name,phone',
            ])
            ->withCount('projects')
            ->when(
                $validated['search'] ?? null,
                fn ($query, $search) => $query->where(
                    function ($searchQuery) use ($search): void {
                        $searchQuery
                            ->whereLike('name', '%'.$search.'%')
                            ->orWhere('bin', 'like', '%'.$search.'%')
                            ->orWhereLike(
                                'director_full_name',
                                '%'.$search.'%'
                            );
                    }
                )
            )
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->when(
                $validated['legal_form'] ?? null,
                fn ($query, $legalForm) => $query->where(
                    'legal_form',
                    $legalForm
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

        return CompanyResource::collection($companies);
    }
}
