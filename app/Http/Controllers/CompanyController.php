<?php

namespace App\Http\Controllers;

use App\Http\Requests\CompanyRequest;
use App\Models\Company;
use App\Models\Region;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CompanyController extends Controller
{
    public function index(Request $request)
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'search' => 'nullable|string|max:100',
            'status' => 'nullable|in:active,inactive,liquidating',
            'legal_form' => 'nullable|in:too,ao,ip,cooperative,public_foundation,state_enterprise,branch,other',
            'profile' => 'nullable|in:complete,incomplete',
        ]);

        $query = Company::query()
            ->with('region:id,name')
            ->withCount('projects')
            ->when(
                $validated['search'] ?? null,
                fn ($companyQuery, $search) => $companyQuery->where(
                    function ($searchQuery) use ($search): void {
                        $searchQuery
                            ->whereLike(
                                'name',
                                '%'.$search.'%',
                                caseSensitive: false
                            )
                            ->orWhere('bin', 'like', '%'.$search.'%')
                            ->orWhereLike(
                                'director_full_name',
                                '%'.$search.'%',
                                caseSensitive: false
                            );
                    }
                )
            )
            ->when(
                $validated['status'] ?? null,
                fn ($companyQuery, $status) => $companyQuery->where(
                    'status',
                    $status
                )
            )
            ->when(
                $validated['legal_form'] ?? null,
                fn ($companyQuery, $legalForm) => $companyQuery->where(
                    'legal_form',
                    $legalForm
                )
            )
            ->when(
                ($validated['profile'] ?? null) === 'complete',
                fn ($companyQuery) => $companyQuery->profileComplete()
            )
            ->when(
                ($validated['profile'] ?? null) === 'incomplete',
                fn ($companyQuery) => $companyQuery->where(
                    fn ($incompleteQuery) => $incompleteQuery
                        ->whereNull('bin')
                        ->orWhereNull('registration_date')
                        ->orWhereNull('region_id')
                        ->orWhereNull('activity_type')
                        ->orWhereNull('director_full_name')
                        ->orWhereNull('phone')
                        ->orWhereNull('legal_address')
                )
            );

        return Inertia::render('companies/index', [
            'companies' => $query
                ->orderBy('name')
                ->paginate(20)
                ->withQueryString(),
            'filters' => [
                'search' => $validated['search'] ?? '',
                'status' => $validated['status'] ?? '',
                'legal_form' => $validated['legal_form'] ?? '',
                'profile' => $validated['profile'] ?? '',
            ],
            'legalForms' => Company::LEGAL_FORMS,
            'statuses' => Company::STATUSES,
            'canManage' => $this->canManage($request),
        ]);
    }

    public function show(Request $request, Company $company)
    {
        $this->authorizeRead($request);

        return Inertia::render('companies/show', [
            'company' => $company->load([
                'region:id,name',
                'creator:id,full_name',
                'investor:id,company_id,full_name,email,phone',
            ]),
            'projects' => $company->projects()
                ->with(['region:id,name', 'projectType:id,name'])
                ->latest()
                ->paginate(15),
            'canManage' => $this->canManage($request),
        ]);
    }

    public function create(Request $request)
    {
        abort_unless($this->canManage($request), 403);

        return Inertia::render('companies/create', [
            ...$this->formOptions(),
        ]);
    }

    public function store(CompanyRequest $request)
    {
        $company = DB::transaction(function () use ($request): Company {
            $validated = $request->validated();
            $investorData = $this->investorData($validated);
            $companyData = $this->companyData($validated);

            $company = Company::create([
                ...$companyData,
                'created_by' => $request->user()->id,
            ]);

            $this->createInvestor($company, $investorData);

            return $company;
        });

        return redirect()
            ->route('companies.show', $company)
            ->with('success', 'Компания құрылды.');
    }

    public function edit(Request $request, Company $company)
    {
        abort_unless($this->canManage($request), 403);

        return Inertia::render('companies/edit', [
            'company' => $company->load(
                'investor:id,company_id,full_name,email,phone'
            ),
            ...$this->formOptions(),
        ]);
    }

    public function update(CompanyRequest $request, Company $company)
    {
        DB::transaction(function () use ($request, $company): void {
            $validated = $request->validated();
            $company->update($this->companyData($validated));

            $investorData = $this->investorData($validated);
            $investor = $company->investor()->first();

            if ($investor) {
                $investor->update($investorData);
            } else {
                $this->createInvestor($company, $investorData);
            }

            $company->projects()->update([
                'company_name' => $company->display_name,
            ]);
        });

        return redirect()
            ->route('companies.show', $company)
            ->with('success', 'Компания мәліметтері жаңартылды.');
    }

    public function destroy(Request $request, Company $company)
    {
        abort_unless($this->canManage($request), 403);
        abort_if(
            $company->projects()->exists(),
            409,
            'Жобаларға тіркелген компанияны жоюға болмайды. Алдымен статусын белсенді емес етіп өзгертіңіз.'
        );

        DB::transaction(fn () => $company->delete());

        return redirect()
            ->route('companies.index')
            ->with('success', 'Компания жойылды.');
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'regions' => Region::query()
                ->select('id', 'name', 'type', 'parent_id')
                ->orderBy('name')
                ->get(),
            'legalForms' => Company::LEGAL_FORMS,
            'statuses' => Company::STATUSES,
        ];
    }

    private function authorizeRead(Request $request): void
    {
        abort_unless(
            in_array(
                $request->user()?->roleModel?->name,
                ['superadmin', 'prokuror', 'akim', 'zamakim'],
                true
            ),
            403
        );
    }

    private function canManage(Request $request): bool
    {
        return $request->user()?->roleModel?->name === 'superadmin';
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function companyData(array $validated): array
    {
        unset(
            $validated['investor_full_name'],
            $validated['investor_email'],
            $validated['investor_password'],
            $validated['investor_password_confirmation']
        );

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function investorData(array $validated): array
    {
        $data = [
            'full_name' => $validated['investor_full_name'],
            'email' => Str::lower($validated['investor_email']),
            'phone' => $validated['phone'] ?? null,
        ];

        if (! empty($validated['investor_password'])) {
            $data['password'] = $validated['investor_password'];
        }

        return $data;
    }

    /**
     * @param  array<string, mixed>  $investorData
     */
    private function createInvestor(
        Company $company,
        array $investorData
    ): User {
        $investorRole = Role::query()
            ->where('name', 'investor')
            ->firstOrFail();

        return $company->investor()->create([
            ...$investorData,
            'role' => 'district_user',
            'role_id' => $investorRole->id,
        ]);
    }
}
