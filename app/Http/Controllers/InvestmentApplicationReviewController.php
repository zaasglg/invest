<?php

namespace App\Http\Controllers;

use App\Models\InvestmentApplication;
use App\Services\InvestmentApplicationAccessService;
use App\Services\InvestmentApplicationWorkflowService;
use App\Services\ZoneCapacityService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class InvestmentApplicationReviewController extends Controller
{
    public function __construct(
        private readonly InvestmentApplicationAccessService $access,
        private readonly InvestmentApplicationWorkflowService $workflow,
        private readonly ZoneCapacityService $capacity
    ) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'status' => [
                'nullable',
                Rule::in(array_keys(InvestmentApplication::STATUSES)),
            ],
            'type' => 'nullable|in:sez,industrial-zone,prom-zone',
        ]);
        $search = trim((string) ($validated['search'] ?? ''));

        $query = $this->access->scopeReviewable(
            InvestmentApplication::query(),
            $request->user()
        );

        if ($search !== '') {
            $pattern = '%'.$search.'%';
            $query->where(function ($searchQuery) use ($pattern) {
                $searchQuery
                    ->whereLike('application_number', $pattern, caseSensitive: false)
                    ->orWhereLike('project_name', $pattern, caseSensitive: false)
                    ->orWhereLike('company_name', $pattern, caseSensitive: false)
                    ->orWhereHas(
                        'applicant',
                        fn ($applicant) => $applicant
                            ->whereLike('full_name', $pattern, caseSensitive: false)
                    );
            });
        }

        $query
            ->when(
                $validated['status'] ?? null,
                fn ($builder, $status) => $builder->where('status', $status)
            )
            ->when(
                $validated['type'] ?? null,
                fn ($builder, $type) => $builder->where(
                    'zoneable_type',
                    ZoneCapacityService::ZONE_TYPES[$type]
                )
            );

        $applications = $query
            ->with([
                'applicant:id,full_name,email,phone',
                'zoneable:id,name,region_id',
                'zoneable.region:id,name',
            ])
            ->latest()
            ->paginate(10)
            ->withQueryString();

        $baseStats = $this->access->scopeReviewable(
            InvestmentApplication::query(),
            $request->user()
        );

        return Inertia::render('investment-applications/index', [
            'applications' => $applications,
            'statuses' => InvestmentApplication::STATUSES,
            'filters' => [
                'search' => $search,
                'status' => $validated['status'] ?? '',
                'type' => $validated['type'] ?? '',
            ],
            'stats' => [
                'submitted' => (clone $baseStats)->where('status', 'submitted')->count(),
                'under_review' => (clone $baseStats)->where('status', 'under_review')->count(),
                'approved' => (clone $baseStats)->where('status', 'approved')->count(),
                'needs_clarification' => (clone $baseStats)
                    ->where('status', 'needs_clarification')
                    ->count(),
            ],
        ]);
    }

    public function show(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureReviewable($request, $investmentApplication);
        $investmentApplication->load([
            'applicant:id,full_name,email,phone',
            'zoneable.region:id,name',
            'reviewer:id,full_name',
            'companyRegion:id,name',
            'projectTypes:id,name',
            'documents:id,investment_application_id,name,type,size,created_at',
            'statusHistories.actor:id,full_name',
            'investmentProject:id,name',
            'sourceInvestmentProject:id,name,start_date,end_date',
        ]);

        return Inertia::render('investment-applications/show', [
            'application' => $investmentApplication,
            'zoneCapacity' => $this->capacity->summarize(
                $investmentApplication->zoneable
            ),
            'actions' => [
                'can_start_review' => $investmentApplication->status === 'submitted',
                'can_request_clarification' => in_array(
                    $investmentApplication->status,
                    ['submitted', 'under_review'],
                    true
                ),
                'can_approve' => in_array(
                    $investmentApplication->status,
                    ['submitted', 'under_review'],
                    true
                ),
                'can_reject' => in_array(
                    $investmentApplication->status,
                    ['submitted', 'under_review'],
                    true
                ),
                'can_set_schedule' => $investmentApplication->status === 'approved'
                    && $investmentApplication->reserved_until?->isFuture()
                    && ($investmentApplication->planned_start_year === null
                        || $investmentApplication->planned_end_year === null),
                'can_convert' => $investmentApplication->status === 'approved'
                    && $investmentApplication->reserved_until?->isFuture()
                    && $investmentApplication->planned_start_year !== null
                    && $investmentApplication->planned_end_year !== null,
            ],
        ]);
    }

    public function startReview(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureReviewable($request, $investmentApplication);
        $this->workflow->beginReview($investmentApplication, $request->user());

        return redirect()->back()->with('success', 'Өтінім қарауға алынды.');
    }

    public function requestClarification(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureReviewable($request, $investmentApplication);
        $validated = $request->validate([
            'comment' => 'required|string|max:5000',
        ]);
        $this->workflow->requestClarification(
            $investmentApplication,
            $request->user(),
            $validated['comment']
        );

        return redirect()->back()->with('success', 'Өтінім толықтыруға қайтарылды.');
    }

    public function approve(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureReviewable($request, $investmentApplication);
        $minimumStartYear = min(
            now()->year,
            $investmentApplication->planned_start_year ?? now()->year
        );
        $yearsChanged = (
            $investmentApplication->planned_start_year !== null
            && $request->integer('planned_start_year')
                !== $investmentApplication->planned_start_year
        ) || (
            $investmentApplication->planned_end_year !== null
            && $request->integer('planned_end_year')
                !== $investmentApplication->planned_end_year
        );
        $validated = $request->validate([
            'approved_area' => [
                'required',
                'numeric',
                'gt:0',
                'max:2000000000',
                'lte:'.$investmentApplication->requested_area,
            ],
            'planned_start_year' => [
                'required',
                'integer',
                'min:'.$minimumStartYear,
                'max:2100',
            ],
            'planned_end_year' => [
                'required',
                'integer',
                'min:'.now()->year,
                'max:2100',
                'gte:planned_start_year',
            ],
            'comment' => [
                Rule::requiredIf($yearsChanged),
                'nullable',
                'string',
                'max:5000',
            ],
        ], [
            'planned_start_year.required' => 'Жобаның басталу жылын енгізіңіз.',
            'planned_end_year.required' => 'Жобаның аяқталу жылын енгізіңіз.',
            'planned_end_year.gte' => 'Аяқталу жылы басталу жылынан ерте болмауы керек.',
            'comment.required' => 'Өтінім беруші көрсеткен мерзімді өзгерту себебін жазыңыз.',
        ]);
        $this->workflow->approve(
            $investmentApplication,
            $request->user(),
            (float) $validated['approved_area'],
            (int) $validated['planned_start_year'],
            (int) $validated['planned_end_year'],
            $validated['comment'] ?? null
        );

        return redirect()->back()->with('success', 'Өтінім қабылданып, жер резервке қойылды.');
    }

    public function setSchedule(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureReviewable($request, $investmentApplication);
        $minimumStartYear = $investmentApplication->sourceInvestmentProject
            ?->start_date?->year ?? now()->year;
        $validated = $request->validate([
            'planned_start_year' => [
                'required',
                'integer',
                'min:'.min(now()->year, $minimumStartYear),
                'max:2100',
            ],
            'planned_end_year' => [
                'required',
                'integer',
                'min:'.now()->year,
                'max:2100',
                'gte:planned_start_year',
            ],
            'comment' => ['required', 'string', 'max:5000'],
        ], [
            'planned_start_year.required' => 'Жобаның басталу жылын енгізіңіз.',
            'planned_end_year.required' => 'Жобаның аяқталу жылын енгізіңіз.',
            'planned_end_year.gte' => 'Аяқталу жылы басталу жылынан ерте болмауы керек.',
            'comment.required' => 'Мерзімді бекіту туралы түсініктеме жазыңыз.',
        ]);
        $this->workflow->setApprovedSchedule(
            $investmentApplication,
            $request->user(),
            (int) $validated['planned_start_year'],
            (int) $validated['planned_end_year'],
            $validated['comment']
        );

        return redirect()->back()->with('success', 'Жобаның жоспарлы мерзімі бекітілді.');
    }

    public function reject(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureReviewable($request, $investmentApplication);
        $validated = $request->validate([
            'comment' => 'required|string|max:5000',
        ]);
        $this->workflow->reject(
            $investmentApplication,
            $request->user(),
            $validated['comment']
        );

        return redirect()->back()->with('success', 'Өтінім қабылданбады.');
    }

    public function convert(
        Request $request,
        InvestmentApplication $investmentApplication
    ) {
        $this->ensureReviewable($request, $investmentApplication);
        $project = $this->workflow->convertToProject(
            $investmentApplication,
            $request->user()
        );

        return redirect()
            ->route('investment-projects.show', $project)
            ->with(
                'success',
                $investmentApplication->application_kind === 'expansion'
                    ? 'Бар инвестициялық жоба кеңейтілді.'
                    : 'Өтінімнен инвестициялық жоба құрылды.'
            );
    }

    private function ensureReviewable(
        Request $request,
        InvestmentApplication $application
    ): void {
        abort_unless(
            $this->access->canReview($request->user(), $application),
            403
        );
    }
}
