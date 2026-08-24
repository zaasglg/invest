<?php

namespace App\Http\Controllers;

use App\Http\Requests\InvestmentApplicationRequest;
use App\Http\Requests\SubmitInvestmentApplicationRequest;
use App\Models\Company;
use App\Models\InvestmentApplication;
use App\Models\InvestmentApplicationDocument;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Services\InvestmentApplicationDocumentService;
use App\Services\InvestmentApplicationWorkflowService;
use App\Services\ZoneCapacityService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ApplicantInvestmentApplicationController extends Controller
{
    public function __construct(
        private readonly ZoneCapacityService $capacity,
        private readonly InvestmentApplicationWorkflowService $workflow,
        private readonly InvestmentApplicationDocumentService $documents
    ) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => [
                'nullable',
                \Illuminate\Validation\Rule::in(array_keys(InvestmentApplication::STATUSES)),
            ],
        ]);

        $applications = InvestmentApplication::query()
            ->where('user_id', $request->user()->id)
            ->with([
                'zoneable:id,name,region_id',
                'zoneable.region:id,name',
                'sourceInvestmentProject:id,name',
            ])
            ->when(
                $validated['status'] ?? null,
                fn ($query, $status) => $query->where('status', $status)
            )
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('applicant/applications/index', [
            'accountRole' => $request->user()
                ->loadMissing('roleModel')
                ->roleModel?->name,
            'applications' => $applications,
            'statuses' => InvestmentApplication::STATUSES,
            'filter' => $validated['status'] ?? '',
        ]);
    }

    public function create(string $zoneType, int $zone, Request $request)
    {
        $zoneModel = $this->capacity->resolve($zoneType, $zone);

        return Inertia::render('applicant/applications/form', [
            'application' => null,
            'zone' => $this->capacity->present($zoneModel),
            ...$this->formOptions($request, $zoneModel),
        ]);
    }

    public function companyLookup(Request $request)
    {
        abort_unless(
            $request->user()
                ->loadMissing('roleModel')
                ->roleModel?->name === 'applicant',
            403
        );
        $validated = $request->validate([
            'bin' => 'required|digits:12',
        ]);
        $company = Company::query()
            ->where('bin', $validated['bin'])
            ->with(['region:id,name', 'investor:id,company_id'])
            ->first();

        if (! $company) {
            return response()->json(['found' => false]);
        }

        if ($company->investor) {
            return response()->json([
                'found' => true,
                'can_attach' => false,
                'has_investor' => true,
                'company' => $company->only(['id', 'name', 'bin']),
                'message' => 'Бұл компанияға Investor аккаунты тіркелген. Өтінімді сол аккаунтпен беріңіз.',
            ]);
        }

        return response()->json([
            'found' => true,
            'can_attach' => true,
            'has_investor' => false,
            'company' => $this->companyFormData($company),
            'message' => 'Компания CRM базасынан табылды. Ресми деректер автоматты толтырылды.',
        ]);
    }

    public function store(
        string $zoneType,
        int $zone,
        InvestmentApplicationRequest $request
    ) {
        $zoneModel = $this->capacity->resolve($zoneType, $zone);
        $validated = $request->validated();
        $intent = $validated['intent'];
        $documents = $request->file('documents', []);
        [$validated, $projectTypeIds] = $this->normalizeApplicationData(
            $validated,
            $request
        );
        $validated['activity_sector'] = $this->activitySector($projectTypeIds);
        unset(
            $validated['intent'],
            $validated['documents'],
            $validated['project_type_ids']
        );

        $application = DB::transaction(function () use (
            $documents,
            $intent,
            $projectTypeIds,
            $request,
            $validated,
            $zoneModel
        ) {
            $application = InvestmentApplication::create([
                ...$validated,
                'application_number' => $this->newApplicationNumber(),
                'user_id' => $request->user()->id,
                'zoneable_type' => $zoneModel::class,
                'zoneable_id' => $zoneModel->id,
                'status' => 'draft',
                'infrastructure_requirements' => $validated['infrastructure_requirements'] ?? [],
            ]);
            $application->projectTypes()->sync($projectTypeIds);
            $this->workflow->recordCreated($application, $request->user());

            if ($intent === 'submit') {
                $this->workflow->submit($application, $request->user());
            }

            $this->documents->storeMany(
                $application,
                is_array($documents) ? $documents : [],
                $request->user()
            );

            return $application;
        });

        return redirect()
            ->route('applicant.applications.show', $application)
            ->with(
                'success',
                $intent === 'submit'
                    ? 'Өтінім жіберілді.'
                    : 'Өтінім жоба нұсқасы ретінде сақталды.'
            );
    }

    public function show(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureOwner($request, $investmentApplication);

        return Inertia::render('applicant/applications/show', [
            'application' => $investmentApplication->load([
                'zoneable.region:id,name',
                'reviewer:id,full_name',
                'companyRegion:id,name',
                'projectTypes:id,name',
                'documents:id,investment_application_id,name,type,size,created_at',
                'statusHistories.actor:id,full_name',
                'investmentProject:id,name',
                'sourceInvestmentProject:id,name',
            ]),
        ]);
    }

    public function edit(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureOwner($request, $investmentApplication);
        abort_unless($investmentApplication->is_editable, 403);

        return Inertia::render('applicant/applications/form', [
            'application' => $investmentApplication->load([
                'projectTypes:id,name',
                'documents:id,investment_application_id,name,type,size,created_at',
                'sourceInvestmentProject:id,name',
            ]),
            'zone' => $this->capacity->present(
                $investmentApplication->zoneable()->firstOrFail()
            ),
            ...$this->formOptions(
                $request,
                $investmentApplication->zoneable()->firstOrFail()
            ),
        ]);
    }

    public function update(
        InvestmentApplicationRequest $request,
        InvestmentApplication $investmentApplication
    ) {
        abort_unless($investmentApplication->is_editable, 403);
        $validated = $request->validated();
        $intent = $validated['intent'];
        $documents = $request->file('documents', []);
        [$validated, $projectTypeIds] = $this->normalizeApplicationData(
            $validated,
            $request
        );
        $validated['activity_sector'] = $this->activitySector($projectTypeIds);
        unset(
            $validated['intent'],
            $validated['documents'],
            $validated['project_type_ids']
        );

        DB::transaction(function () use (
            $documents,
            $intent,
            $investmentApplication,
            $projectTypeIds,
            $request,
            $validated
        ): void {
            $investmentApplication->update([
                ...$validated,
                'infrastructure_requirements' => $validated['infrastructure_requirements'] ?? [],
            ]);
            $investmentApplication->projectTypes()->sync($projectTypeIds);

            if ($intent === 'submit') {
                $this->workflow->submit(
                    $investmentApplication,
                    $request->user()
                );
            }

            $this->documents->storeMany(
                $investmentApplication,
                is_array($documents) ? $documents : [],
                $request->user()
            );
        });

        return redirect()
            ->route('applicant.applications.show', $investmentApplication)
            ->with('success', $intent === 'submit' ? 'Өтінім жіберілді.' : 'Өтінім сақталды.');
    }

    public function submit(
        SubmitInvestmentApplicationRequest $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureOwner($request, $investmentApplication);
        $this->workflow->submit($investmentApplication, $request->user());

        return redirect()->back()->with('success', 'Өтінім жіберілді.');
    }

    public function withdraw(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureOwner($request, $investmentApplication);
        $this->workflow->withdraw($investmentApplication, $request->user());

        return redirect()->back()->with('success', 'Өтінім кері қайтарылды.');
    }

    public function destroyDocument(
        Request $request,
        InvestmentApplication $investmentApplication,
        InvestmentApplicationDocument $document
    ) {
        $this->ensureOwner($request, $investmentApplication);
        abort_unless($investmentApplication->is_editable, 403);
        abort_unless(
            (int) $document->investment_application_id === (int) $investmentApplication->id,
            404
        );
        $this->documents->delete($document);

        return redirect()->back()->with('success', 'Құжат жойылды.');
    }

    /** @return array<string, mixed> */
    private function formOptions(Request $request, Model $zone): array
    {
        $user = $request->user()->loadMissing(['roleModel', 'company']);
        $role = $user->roleModel?->name;

        return [
            'regions' => Region::query()
                ->where('type', 'district')
                ->orderBy('sort_order')
                ->get(['id', 'name']),
            'legalForms' => Company::LEGAL_FORMS,
            'projectTypes' => ProjectType::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'applicationKinds' => InvestmentApplication::APPLICATION_KINDS,
            'accountRole' => $role,
            'company' => $user->company
                ? $this->companyFormData($user->company)
                : null,
            'existingProjects' => $role === 'investor' && $user->company_id
                ? $this->existingProjects($user->company_id, $zone)
                : [],
            'applicantDefaults' => [
                'full_name' => $request->user()->full_name,
                'email' => $request->user()->email,
                'phone' => $request->user()->phone,
            ],
        ];
    }

    /** @return array{0: array<string, mixed>, 1: array<int, int>} */
    private function normalizeApplicationData(
        array $validated,
        Request $request
    ): array {
        $kind = $validated['application_kind'];
        $projectTypeIds = $this->projectTypeIds($validated);

        if ($kind === 'expansion'
            && filled($validated['source_investment_project_id'] ?? null)) {
            $source = InvestmentProject::query()
                ->whereKey($validated['source_investment_project_id'])
                ->where('company_id', $request->user()->company_id)
                ->with('projectTypes:id,name')
                ->firstOrFail();
            $projectTypeIds = $source->projectTypes
                ->pluck('id')
                ->whenEmpty(fn ($ids) => collect([$source->project_type_id]))
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all();
            $validated['project_name'] = $source->name;
        } else {
            $validated['source_investment_project_id'] = null;
        }

        return [$validated, $projectTypeIds];
    }

    private function existingProjects(int $companyId, Model $zone)
    {
        $relation = match ($this->capacity->type($zone)) {
            'sez' => 'sezs',
            'industrial-zone' => 'industrialZones',
            'prom-zone' => 'promZones',
        };

        return InvestmentProject::query()
            ->active()
            ->where('company_id', $companyId)
            ->whereHas(
                $relation,
                fn ($query) => $query->whereKey($zone->getKey())
            )
            ->with('projectTypes:id,name')
            ->orderBy('name')
            ->get([
                'id',
                'name',
                'description',
                'project_type_id',
                'jobs_count',
                'total_investment',
                'start_date',
                'end_date',
                'infrastructure',
            ]);
    }

    /** @return array<string, mixed> */
    private function companyFormData(Company $company): array
    {
        $company->loadMissing('region:id,name');

        return [
            'id' => $company->id,
            'legal_form' => $company->legal_form,
            'name' => $company->name,
            'bin' => $company->bin,
            'registration_date' => $company->registration_date?->format('Y-m-d'),
            'region_id' => $company->region_id,
            'region' => $company->region?->only(['id', 'name']),
            'activity_type' => $company->activity_type,
            'director_full_name' => $company->director_full_name,
            'contact_person' => $company->contact_person,
            'phone' => $company->phone,
            'email' => $company->email,
            'legal_address' => $company->legal_address,
        ];
    }

    /** @param  array<string, mixed>  $validated
     * @return array<int, int>
     */
    private function projectTypeIds(array $validated): array
    {
        return collect($validated['project_type_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /** @param  array<int, int>  $projectTypeIds */
    private function activitySector(array $projectTypeIds): string
    {
        $names = ProjectType::query()
            ->whereKey($projectTypeIds)
            ->pluck('name', 'id');

        return Str::limit(collect($projectTypeIds)
            ->map(fn (int $id) => $names->get($id))
            ->filter()
            ->join(', '), 255, '');
    }

    private function ensureOwner(
        Request $request,
        InvestmentApplication $application
    ): void {
        abort_unless(
            (int) $application->user_id === (int) $request->user()->id,
            403
        );
    }

    private function newApplicationNumber(): string
    {
        do {
            $number = 'INV-'.now()->format('Y').'-'.Str::upper(Str::random(8));
        } while (InvestmentApplication::query()
            ->where('application_number', $number)
            ->exists());

        return $number;
    }
}
