<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectType;
use App\Models\PromZone;
use App\Models\Region;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Models\User;
use App\Services\InvestmentProjectAccessService;
use App\Services\PrivateFileService;
use App\Services\ProjectExecutorAssignmentService;
use App\Services\ProjectPassportSummaryService;
use App\Services\SortOrderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use PhpOffice\PhpPresentation\IOFactory;
use PhpOffice\PhpPresentation\PhpPresentation;
use PhpOffice\PhpPresentation\Shape\RichText;
use PhpOffice\PhpPresentation\Slide\Background\Color as BackgroundColor;
use PhpOffice\PhpPresentation\Style\Alignment;
use PhpOffice\PhpPresentation\Style\Color;
use PhpOffice\PhpPresentation\Style\Fill;
use ZipArchive;

class InvestmentProjectController extends Controller
{
    public function __construct(
        private readonly PrivateFileService $files,
        private readonly InvestmentProjectAccessService $projectAccess,
        private readonly ProjectPassportSummaryService $passportSummary,
        private readonly SortOrderService $sortOrder,
        private readonly ProjectExecutorAssignmentService $projectExecutors
    ) {}

    public function index(Request $request)
    {
        $filters = $request->only([
            'search',
            'region_id',
            'project_type_id',
            'status',
            'executor_id',
            'sector_type',
            'sector_id',
            'min_investment',
            'max_investment',
            'start_date_from',
            'start_date_to',
            'end_date_from',
            'end_date_to',
        ]);

        $projectsQuery = InvestmentProject::active()->with([
            'company',
            'region',
            'projectType',
            'creator',
            'curators',
            'investors',
            'executors',
            'sezs',
            'industrialZones',
            'promZones',
            'subsoilUsers',
        ]);

        $user = $request->user();
        $this->projectAccess->scopeVisible($projectsQuery, $user);

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $projectsQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhereHas('company', function ($companyQuery) use ($search) {
                        $companyQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('bin', 'like', "%{$search}%");
                    });
            });
        }

        if (! empty($filters['region_id'])) {
            $projectsQuery->where('region_id', (int) $filters['region_id']);
        }

        if (! empty($filters['project_type_id'])) {
            $projectsQuery->where('project_type_id', (int) $filters['project_type_id']);
        }

        if (! empty($filters['status'])) {
            $projectsQuery->where('status', $filters['status']);
        }

        if (! empty($filters['executor_id'])) {
            $executorId = (int) $filters['executor_id'];
            $projectsQuery->whereHas('executors', function ($query) use ($executorId) {
                $query->where('users.id', $executorId);
            });
        }

        if (! empty($filters['sector_type'])) {
            $sectorType = $filters['sector_type'];
            $sectorId = ! empty($filters['sector_id']) ? (int) $filters['sector_id'] : null;

            if ($sectorType === 'sez') {
                $projectsQuery->whereHas('sezs', function ($query) use ($sectorId) {
                    if ($sectorId) {
                        $query->where('sezs.id', $sectorId);
                    }
                });
            }

            if ($sectorType === 'industrial_zone') {
                $projectsQuery->whereHas('industrialZones', function ($query) use ($sectorId) {
                    if ($sectorId) {
                        $query->where('industrial_zones.id', $sectorId);
                    }
                });
            }

            if ($sectorType === 'prom_zone') {
                $projectsQuery->whereHas('promZones', function ($query) use ($sectorId) {
                    if ($sectorId) {
                        $query->where('prom_zones.id', $sectorId);
                    }
                });
            }

            if ($sectorType === 'subsoil') {
                $projectsQuery->whereHas('subsoilUsers', function ($query) use ($sectorId) {
                    if ($sectorId) {
                        $query->where('subsoil_users.id', $sectorId);
                    }
                });
            }
        }

        if (! empty($filters['min_investment'])) {
            $projectsQuery->where('total_investment', '>=', (float) $filters['min_investment']);
        }

        if (! empty($filters['max_investment'])) {
            $projectsQuery->where('total_investment', '<=', (float) $filters['max_investment']);
        }

        if (! empty($filters['start_date_from'])) {
            $projectsQuery->whereDate('start_date', '>=', $filters['start_date_from']);
        }

        if (! empty($filters['start_date_to'])) {
            $projectsQuery->whereDate('start_date', '<=', $filters['start_date_to']);
        }

        if (! empty($filters['end_date_from'])) {
            $projectsQuery->whereDate('end_date', '>=', $filters['end_date_from']);
        }

        if (! empty($filters['end_date_to'])) {
            $projectsQuery->whereDate('end_date', '<=', $filters['end_date_to']);
        }

        $statsQuery = clone $projectsQuery;
        $totalProjects = $statsQuery->count();
        $totalInvestment = $statsQuery->sum('total_investment');
        $statusCounts = (clone $statsQuery)
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $currentYear = now()->year;

        $stats = [
            'total_projects' => $totalProjects,
            'total_investment' => $totalInvestment,
            'status_counts' => [
                'launched' => $statusCounts['launched'] ?? 0,
                'implementation' => $statusCounts['implementation'] ?? 0,
                'suspended' => $statusCounts['suspended'] ?? 0,
                'plan' => $statusCounts['plan'] ?? 0,
            ],
            'ending_this_year' => (clone $statsQuery)
                ->whereYear('end_date', $currentYear)
                ->count(),
        ];

        $projects = $projectsQuery->orderBy('sort_order', 'asc')->latest()->paginate(15)->withQueryString();

        // dd(Region::where('type','district')->orderBy('name')->get());
        return Inertia::render('investment-projects/index', [
            'projects' => $projects,
            'stats' => $stats,
            'regions' => Region::where('type', 'district')->orderBy('sort_order')->get(),
            'projectTypes' => ProjectType::select('id', 'name')->orderBy('name')->get(),
            'users' => User::select('id', 'full_name', 'region_id', 'baskarma_type', 'position')->orderBy('full_name')->get(),
            'sezs' => Sez::select('id', 'name', 'region_id')->orderBy('name')->get(),
            'industrialZones' => IndustrialZone::select('id', 'name', 'region_id')->orderBy('name')->get(),
            'promZones' => PromZone::select('id', 'name', 'region_id')->orderBy('name')->get(),
            'subsoilUsers' => SubsoilUser::select('id', 'name', 'region_id')->orderBy('name')->get(),
            'filters' => $filters,
        ]);
    }

    public function moveToPage(Request $request, InvestmentProject $investmentProject)
    {
        $user = $request->user();
        $roleName = $user?->load('roleModel')->roleModel?->name;

        abort_unless(in_array($roleName, ['superadmin', 'invest'], true), 403);
        abort_unless($this->projectAccess->canView($user, $investmentProject), 403);

        $validated = $request->validate([
            'target_page' => 'required|integer|min:1',
        ]);

        $targetPage = $validated['target_page'];
        $perPage = 15;

        $targetIndex = ($targetPage - 1) * $perPage;
        $previousSortOrder = $investmentProject->sort_order;

        $projectsQuery = InvestmentProject::active()
            ->where('id', '!=', $investmentProject->id);

        if ($roleName !== 'superadmin') {
            $this->projectAccess->scopeVisible($projectsQuery, $user);
        }

        $projectIds = $projectsQuery
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->pluck('id')
            ->map(static fn ($id): int => (int) $id)
            ->all();
        array_splice(
            $projectIds,
            $targetIndex,
            0,
            [(int) $investmentProject->id]
        );
        $this->sortOrder->update(InvestmentProject::class, $projectIds, 1);

        $investmentProject->refresh();
        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'project.position_changed',
            category: 'project',
            action: 'Жобаның тізімдегі орны ауыстырылды',
            subject: $investmentProject,
            properties: [
                'project_name' => $investmentProject->name,
                'changes' => KpiLog::changes(
                    ['sort_order' => $previousSortOrder],
                    ['sort_order' => $investmentProject->sort_order],
                    ['sort_order' => 'Тізімдегі орны']
                ),
                'details' => [
                    'Мақсатты бет' => $targetPage,
                ],
            ]
        );

        return redirect()->back()->with('success', 'Жобаның орны ауыстырылды.');
    }

    public function reorder(Request $request)
    {
        $user = $request->user();
        $role = $user?->load('roleModel')->roleModel?->name;

        if (! in_array($role, ['superadmin', 'invest'])) {
            abort(403);
        }

        $validated = $request->validate([
            'project_ids' => 'required|array|min:1',
            'project_ids.*' => 'integer|distinct|exists:investment_projects,id',
            'page' => 'sometimes|integer|min:1',
        ]);

        $projectIds = $validated['project_ids'];
        $allowedProjectCount = $this->projectAccess->scopeVisible(
            InvestmentProject::query()->whereIn('id', $projectIds),
            $user
        )->count();

        abort_unless($allowedProjectCount === count($projectIds), 403);

        $page = $validated['page'] ?? 1;
        $perPage = 15;
        $offset = ($page - 1) * $perPage;
        $previousSortOrders = InvestmentProject::query()
            ->whereIn('id', $projectIds)
            ->pluck('sort_order', 'id');

        $this->sortOrder->update(
            InvestmentProject::class,
            array_map('intval', $projectIds),
            $offset
        );

        InvestmentProject::query()
            ->whereIn('id', $projectIds)
            ->get()
            ->each(function (InvestmentProject $project) use (
                $previousSortOrders,
                $page
            ): void {
                $previousSortOrder = $previousSortOrders->get($project->id);

                if ((int) $previousSortOrder === (int) $project->sort_order) {
                    return;
                }

                KpiLog::activity(
                    projectId: $project->id,
                    event: 'project.position_changed',
                    category: 'project',
                    action: 'Жобаның тізімдегі реті өзгертілді',
                    subject: $project,
                    properties: [
                        'project_name' => $project->name,
                        'changes' => KpiLog::changes(
                            ['sort_order' => $previousSortOrder],
                            ['sort_order' => $project->sort_order],
                            ['sort_order' => 'Тізімдегі орны']
                        ),
                        'details' => [
                            'Бет' => $page,
                        ],
                    ]
                );
            });

        return response()->noContent();
    }

    public function create()
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        $sezQuery = Sez::select('id', 'name', 'region_id', 'location');
        $izQuery = IndustrialZone::select('id', 'name', 'region_id', 'location');
        $promZoneQuery = PromZone::select('id', 'name', 'region_id', 'location');

        if ($isDistrictScoped) {
            // Include user's district and its parent oblast
            $userRegion = Region::find($user->region_id);
            $regionIds = [$user->region_id];
            if ($userRegion && $userRegion->parent_id) {
                $regionIds[] = $userRegion->parent_id;
            }
            $regionsQuery->whereIn('id', $regionIds);
            $sezQuery->where('region_id', $user->region_id);
            $izQuery->where('region_id', $user->region_id);
            $promZoneQuery->where('region_id', $user->region_id);
        }

        $regions = $regionsQuery->get();
        $projectTypes = ProjectType::all();
        $users = User::with('roleModel:id,name,display_name')
            ->select('id', 'full_name', 'region_id', 'role_id', 'baskarma_type', 'position')
            ->orderBy('full_name')
            ->get();
        $sezList = $sezQuery->get();
        $industrialZones = $izQuery->get();
        $promZones = $promZoneQuery->get();

        $restrictedSectorType = $user?->restrictedSectorType();

        // Superadmin can select any invest curator. A moderator must select a
        // Turkistan Invest curator so the new project stays inside their scope.
        $roleName = $user?->roleModel?->name;
        $isSuperAdmin = $roleName === 'superadmin';
        $isModerator = $roleName === 'moderator';
        $canSelectCurators = $isSuperAdmin || $isModerator;
        $investUsers = [];
        if ($canSelectCurators) {
            $investUsers = User::with('roleModel:id,name,display_name')
                ->whereHas('roleModel', fn ($q) => $q->where('name', 'invest'))
                ->when(
                    $isModerator,
                    fn ($query) => $query->where(
                        'invest_sub_role',
                        'turkistan_invest'
                    )
                )
                ->select('id', 'full_name', 'region_id', 'invest_sub_role')
                ->orderBy('full_name')
                ->get();
        }

        return Inertia::render('investment-projects/create', [
            'regions' => $regions,
            'isDistrictScoped' => $isDistrictScoped,
            'userRegionId' => $isDistrictScoped ? $user->region_id : null,
            'projectTypes' => $projectTypes,
            'users' => $users,
            'sezList' => $sezList,
            'industrialZones' => $industrialZones,
            'promZones' => $promZones,
            'isSuperAdmin' => $isSuperAdmin,
            'canSelectCurators' => $canSelectCurators,
            'requiresCuratorSelection' => $isModerator,
            'investUsers' => $investUsers,
            'investSubRole' => $user?->invest_sub_role,
            'restrictedSectorType' => $restrictedSectorType,
            'companies' => Company::query()
                ->active()
                ->profileComplete()
                ->whereHas('investor')
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $roleName = $user?->roleModel?->name;
        $isSuperAdmin = $roleName === 'superadmin';
        $isModerator = $roleName === 'moderator';
        $canSelectCurators = $isSuperAdmin || $isModerator;
        $isDistrictScoped = $user && $user->isDistrictScoped();
        $restrictedSectorType = $user?->restrictedSectorType();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_id' => 'required|integer|exists:companies,id',
            'description' => 'nullable|string',
            'current_status' => 'nullable|string',
            'jobs_count' => 'nullable|integer|min:0',
            'capacity' => 'nullable|string|max:500',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int) $value !== (int) $user->region_id) {
                        $fail('Жобаны тек өз ауданыңызға қосуға болады.');
                    }
                },
            ],
            'project_type_id' => 'required|exists:project_types,id',
            'sector' => [
                $restrictedSectorType ? 'required' : 'nullable',
                'array',
                $restrictedSectorType ? 'min:1' : 'nullable',
            ],
            'sector.*' => [
                'string',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped, $restrictedSectorType) {
                    $parsed = $this->parseSector($value);
                    $type = $parsed['type'];
                    $id = $parsed['id'];

                    if ($restrictedSectorType && $type !== $restrictedSectorType) {
                        $fail('Сіз тек өз секторыңызды таңдай аласыз.');

                        return;
                    }

                    if (! $isDistrictScoped) {
                        return;
                    }

                    if ($type === 'sez') {
                        if (! Sez::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("АЭА ({$id}) сіздің ауданыңызда емес.");
                        }
                    } elseif ($type === 'industrial_zone') {
                        if (! IndustrialZone::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("ИА ({$id}) сіздің ауданыңызда емес.");
                        }
                    } elseif ($type === 'prom_zone') {
                        if (! PromZone::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("Пром зона ({$id}) сіздің ауданыңызда емес.");
                        }
                    }
                },
            ],
            'total_investment' => 'required|numeric|min:0',
            'status' => 'required|in:plan,implementation,launched,suspended',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'executor_ids' => 'nullable|array',
            'executor_ids.*' => 'exists:users,id',
            'geometry' => 'nullable|array',
            'infrastructure' => 'nullable|array',
            'infrastructure.gas' => 'nullable|array',
            'infrastructure.water' => 'nullable|array',
            'infrastructure.electricity' => 'nullable|array',
            'infrastructure.land' => 'nullable|array',
            'curator_ids' => [
                $isModerator ? 'required' : 'nullable',
                'array',
                $isModerator ? 'min:1' : 'max:100',
            ],
            'curator_ids.*' => 'exists:users,id',
        ], [
            'sector.required' => 'Сектор таңдау міндетті.',
            'sector.min' => 'Кемінде бір сектор таңдаңыз.',
            'company_id.required' => 'Компанияны таңдаңыз.',
            'company_id.exists' => 'Таңдалған компания табылмады.',
        ]);

        $company = Company::query()
            ->active()
            ->profileComplete()
            ->whereHas('investor')
            ->find($validated['company_id']);

        if (! $company) {
            throw ValidationException::withMessages([
                'company_id' => 'Компания белсенді, толық және инвестор аккаунтымен бірге болуы керек.',
            ]);
        }

        $validated['company_name'] = $company->display_name;

        $curatorIds = $canSelectCurators
            ? ($validated['curator_ids'] ?? [])
            : [];
        unset($validated['curator_ids']);

        if ($isModerator) {
            $uniqueCuratorIds = array_values(array_unique(array_map(
                'intval',
                $curatorIds
            )));
            $validCuratorCount = User::query()
                ->whereIn('id', $uniqueCuratorIds)
                ->where('invest_sub_role', 'turkistan_invest')
                ->whereHas(
                    'roleModel',
                    fn ($query) => $query->where('name', 'invest')
                )
                ->count();

            if ($validCuratorCount !== count($uniqueCuratorIds)) {
                throw ValidationException::withMessages([
                    'curator_ids' => 'Модератор тек Turkistan Invest кураторын таңдай алады.',
                ]);
            }

            $curatorIds = $uniqueCuratorIds;
        } elseif (! $isSuperAdmin) {
            // Regular non-admin creators curate their own projects.
            $curatorIds = [auth()->id()];
        } elseif (empty($curatorIds)) {
            // Superadmin created a project without picking curators; fall back to self
            $curatorIds = [auth()->id()];
        }

        // Keep created_by in sync with the first curator for backward compatibility
        $validated['created_by'] = (int) $curatorIds[0];

        // Парсим массив sectors
        $sectors = $validated['sector'] ?? [];
        $sezIds = [];
        $izIds = [];
        $promZoneIds = [];

        foreach ($sectors as $sector) {
            $parsed = $this->parseSector($sector);
            if ($parsed['type'] === 'sez') {
                $sezIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'industrial_zone') {
                $izIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'prom_zone') {
                $promZoneIds[] = $parsed['id'];
            }
        }

        $executorIds = $validated['executor_ids'] ?? [];
        unset($validated['executor_ids'], $validated['sector']);

        $project = InvestmentProject::create($validated);

        // Sync curators (admin-managed, 1+)
        $project->curators()->sync(array_values(array_unique(array_map('intval', $curatorIds))));

        // Sync executors (auto-include district ispolnitel users)
        $this->syncExecutorsWithIspolnitel($project, $executorIds);

        // Sync many-to-many связи с секторами
        $project->sezs()->sync($sezIds);
        $project->industrialZones()->sync($izIds);
        $project->promZones()->sync($promZoneIds);

        KpiLog::activity(
            projectId: $project->id,
            event: 'project.created',
            category: 'project',
            action: 'Жаңа жоба құрылды: "'.$project->name.'"',
            subject: $project,
            properties: [
                'project_name' => $project->name,
                'details' => [
                    'Компания' => $project->company_name,
                    'Инвестиция сомасы' => $project->total_investment,
                    'Жоба статусы' => $project->status,
                ],
            ]
        );

        return redirect()->route('investment-projects.index')->with('success', 'Жоба құрылды.');
    }

    public function show($id)
    {
        $currentUser = request()->user();
        $currentRole = $currentUser?->roleModel?->name;

        $project = InvestmentProject::with([
            'company.region:id,name',
            'region',
            'projectType',
            'creator',
            'curators',
            'investors',
            'executors',
            'documents',
            'issues',
            'issues.creator:id,full_name',
            'tasks' => function ($query) use ($currentRole) {
                // Executors only see tasks the moderator has approved.
                if (in_array($currentRole, ['ispolnitel', 'investor'], true)) {
                    $query->where('approval_status', 'approved');
                }
            },
            'tasks.assignee.roleModel',
            'tasks.approver',
            'tasks.creator',
            'tasks.events.user:id,full_name',
            'tasks.completions.submitter',
            'tasks.completions.reviewer',
            'tasks.completions.files',
            'sezs',
            'industrialZones',
            'promZones',
            'subsoilUsers',
        ])
            ->withCount('photos')
            ->find($id);

        if ($currentRole === 'investor'
            && (! $project
                || ! $project->investors->contains('id', $currentUser?->id))) {
            abort(403, 'Бұл жоба инвестор аккаунтына бекітілмеген.');
        }

        // Region-scope check: district-scoped users can only view their district's projects
        // Ispolnitel can view any project (restricted sections handled in frontend)
        if ($project) {
            if (! $this->isIspolnitelUser(request()->user())) {
                $this->authorizeDistrictAccess($project);
            }

            // Block non-authorized roles from viewing archived projects
            if ($project->is_archived) {
                $user = request()->user();
                $archiveRole = $user?->load('roleModel')->roleModel?->name;
                if (! in_array($archiveRole, ['superadmin', 'invest', 'prokuror'], true)) {
                    abort(403, 'Бұл жоба архивтелген. Қол жеткізу мүмкін емес.');
                }
            }
        }

        // Get gallery photos from the most recent date only
        $mainGalleryPhotos = collect();
        if ($project) {
            $latestDate = $project->photos()
                ->where('photo_type', 'gallery')
                ->selectRaw('COALESCE(gallery_date, DATE(created_at)) as photo_date')
                ->orderByDesc('photo_date')
                ->value('photo_date');

            if ($latestDate) {
                $mainGalleryPhotos = $project->photos()
                    ->where('photo_type', 'gallery')
                    ->where(function ($query) use ($latestDate) {
                        $query->whereDate('gallery_date', $latestDate)
                            ->orWhere(function ($q) use ($latestDate) {
                                $q->whereNull('gallery_date')
                                    ->whereDate('created_at', $latestDate);
                            });
                    })
                    ->latest()
                    ->get();
            }
        }

        // Get render/future photos
        $renderPhotos = $project ? $project->photos()->renderPhotos()->latest()->get() : collect();

        if (! $project) {
            // Demo fallback data
            $project = [
                'id' => (int) $id,
                'name' => 'Демо жоба '.$id,
                'company_id' => null,
                'company_name' => 'Demo Company Ltd.',
                'company' => null,
                'description' => 'Бұл дерекқорда жазба табылмағандықтан автоматты түрде жасалған демонстрациялық жоба. Мұнда инвестициялық жобаның толық сипаттамасы, мақсаттары, міндеттері және күтілетін нәтижелері болады.',
                'region' => ['name' => 'Түркістан облысы'],
                'project_type' => ['name' => 'Өндіріс'],
                'sector' => 'industrial_zone',
                'total_investment' => 150000000,
                'status' => 'plan',
                'start_date' => now()->toDateString(),
                'end_date' => now()->addYears(2)->toDateString(),
                'creator' => ['name' => 'Admin User'],
                'executors' => [],
                'created_at' => now()->toISOString(),
            ];
        }

        $user = request()->user();
        $assignableUsersQuery = User::select('id', 'full_name', 'role_id', 'baskarma_type', 'region_id', 'position')
            ->with('roleModel:id,name,display_name')
            ->where(function ($query) use ($id) {
                $query
                    ->whereHas('roleModel', function ($roleQuery) {
                        $roleQuery->where('name', 'ispolnitel');
                    })
                    ->orWhere(function ($investorQuery) use ($id) {
                        $investorQuery
                            ->whereHas('roleModel', function ($roleQuery) {
                                $roleQuery->where('name', 'investor');
                            })
                            ->whereHas('investorProjects', function ($projectQuery) use ($id) {
                                $projectQuery->where('investment_projects.id', (int) $id);
                            });
                    });
            })
            ->orderBy('full_name');

        if ($user && $user->isDistrictScoped()) {
            $assignableUsersQuery->where(function ($query) use ($user) {
                // Users in same region
                $query->where('region_id', $user->region_id)
                    // Or executor-style accounts allowed for this project
                    ->orWhere(function ($q) {
                        $q->whereHas('roleModel', function ($roleQuery) {
                            $roleQuery->whereIn('name', ['ispolnitel', 'investor']);
                        });
                    });
            });
        }

        $canDownload = $user && is_object($project) ? $user->canDownloadFromProject($project) : true;

        // Check if an executor-style account is involved in the project.
        $roleName = $user?->roleModel?->name;
        $isInvolved = true;
        if (in_array($roleName, ['ispolnitel', 'investor'], true)
            && is_object($project)) {
            $isInvolved = $user->isInvolvedInProject($project);
        }

        // Check if project is in ispolnitel's own district
        $isOwnDistrict = false;
        if ($roleName === 'ispolnitel' && is_object($project) && $user->region_id) {
            $isOwnDistrict = (int) $project->region_id === (int) $user->region_id;
        }

        $includeOperationalDetails = ! in_array(
            $roleName,
            ['ispolnitel', 'investor'],
            true
        ) || $isInvolved;
        $passportSummary = is_object($project)
            ? $this->passportSummary->build(
                $project,
                $includeOperationalDetails
            )
            : null;

        if (is_object($project) && ! $includeOperationalDetails) {
            $project->setAttribute('current_status', null);
            $project->setRelation('documents', collect());
            $project->setRelation('issues', collect());
            $project->setRelation('tasks', collect());
        }

        return Inertia::render('investment-projects/show', [
            'project' => $project,
            'passportSummary' => $passportSummary,
            'mainGallery' => $mainGalleryPhotos,
            'renderPhotos' => $renderPhotos,
            'users' => $assignableUsersQuery->get(),
            'canDownload' => $canDownload,
            'canAccessChat' => $user && is_object($project)
                ? $project->isChatParticipant($user)
                : false,
            'isInvolved' => $isInvolved,
            'isOwnDistrict' => $isOwnDistrict,
        ]);
    }

    public function edit(InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $investmentProject->load([
            'company',
            'sezs',
            'industrialZones',
            'promZones',
            'curators',
        ]);

        $regionsQuery = Region::query();
        $sezQuery = Sez::select('id', 'name', 'region_id', 'location');
        $izQuery = IndustrialZone::select('id', 'name', 'region_id', 'location');
        $promZoneQuery = PromZone::select('id', 'name', 'region_id', 'location');

        if ($isDistrictScoped) {
            $regionsQuery->where('id', $user->region_id);
            $sezQuery->where('region_id', $user->region_id);
            $izQuery->where('region_id', $user->region_id);
            $promZoneQuery->where('region_id', $user->region_id);
        }

        $regions = $regionsQuery->get();
        $projectTypes = ProjectType::all();
        $users = User::with('roleModel:id,name,display_name')
            ->select('id', 'full_name', 'region_id', 'role_id', 'baskarma_type', 'position')
            ->orderBy('full_name')
            ->get();
        $sezList = $sezQuery->get();
        $industrialZones = $izQuery->get();
        $promZones = $promZoneQuery->get();

        // Формируем массив sector на основе many-to-many связей
        $sector = [];

        // Загружаем все связанные СЭЗ
        foreach ($investmentProject->sezs as $sez) {
            $sector[] = "sez-{$sez->id}";
        }

        // Загружаем все связанные ИЗ
        foreach ($investmentProject->industrialZones as $iz) {
            $sector[] = "industrial_zone-{$iz->id}";
        }

        // Загружаем все связанные промзоны
        foreach ($investmentProject->promZones as $promZone) {
            $sector[] = "prom_zone-{$promZone->id}";
        }

        $projectData = $investmentProject->load(['region', 'projectType', 'creator', 'executors', 'documents'])
            ->loadCount('photos')
            ->toArray();

        $projectData['sector'] = $sector;
        $projectData['curator_ids'] = $investmentProject->curators->pluck('id')->values()->all();

        // Get invest-role users for curator selection (superadmin only)
        $isSuperAdmin = $user && $user->roleModel?->name === 'superadmin';
        $investUsers = [];
        if ($isSuperAdmin) {
            $investUsers = User::with('roleModel:id,name,display_name')
                ->whereHas('roleModel', fn ($q) => $q->where('name', 'invest'))
                ->select('id', 'full_name', 'region_id', 'invest_sub_role')
                ->orderBy('full_name')
                ->get();
        }

        $restrictedSectorType = $user?->restrictedSectorType();

        return Inertia::render('investment-projects/edit', [
            'project' => $projectData,
            'regions' => $regions,
            'isDistrictScoped' => $isDistrictScoped,
            'userRegionId' => $isDistrictScoped ? $user->region_id : null,
            'projectTypes' => $projectTypes,
            'users' => $users,
            'sezList' => $sezList,
            'industrialZones' => $industrialZones,
            'promZones' => $promZones,
            'isSuperAdmin' => $isSuperAdmin,
            'investUsers' => $investUsers,
            'investSubRole' => $user?->invest_sub_role,
            'restrictedSectorType' => $restrictedSectorType,
            'companies' => Company::query()
                ->where(function ($query) use ($investmentProject) {
                    $query
                        ->where(function ($availableQuery) {
                            $availableQuery
                                ->active()
                                ->profileComplete()
                                ->whereHas('investor');
                        })
                        ->when(
                            $investmentProject->company_id,
                            fn ($companyQuery, $companyId) => $companyQuery
                                ->orWhere('companies.id', $companyId)
                        );
                })
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function updateStatus(Request $request, InvestmentProject $investmentProject)
    {
        $validated = $request->validate([
            'current_status' => 'nullable|string',
        ]);

        $previousStatus = $investmentProject->current_status;
        $investmentProject->update(['current_status' => $validated['current_status']]);

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'project.status_updated',
            category: 'project',
            action: 'Жобаның ағымдағы жағдайы жаңартылды',
            subject: $investmentProject,
            properties: [
                'project_name' => $investmentProject->name,
                'changes' => KpiLog::changes(
                    ['current_status' => $previousStatus],
                    ['current_status' => $investmentProject->current_status],
                    ['current_status' => 'Ағымдағы жағдай']
                ),
            ]
        );

        return redirect()->back()->with('success', 'Ағымдағы жағдайы жаңартылды.');
    }

    public function logs(
        Request $request,
        InvestmentProject $investmentProject
    ) {
        $user = request()->user();

        if (! in_array($user?->roleModel?->name, ['superadmin', 'prokuror'], true)) {
            abort(403);
        }

        $validated = $request->validate([
            'search' => 'nullable|string|max:100',
            'category' => 'nullable|in:project,task,completion,document,photo,issue,chat,download',
            'user_id' => 'nullable|integer|exists:users,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $baseQuery = KpiLog::query()
            ->where('project_id', $investmentProject->id);

        $logs = (clone $baseQuery)
            ->with([
                'user:id,full_name,role_id',
                'user.roleModel:id,name,display_name',
            ])
            ->when(
                $validated['search'] ?? null,
                fn ($query, $search) => $query->where(
                    function ($searchQuery) use ($search): void {
                        $searchQuery
                            ->whereLike(
                                'action',
                                '%'.$search.'%',
                                caseSensitive: false
                            )
                            ->orWhereLike(
                                'event',
                                '%'.$search.'%',
                                caseSensitive: false
                            )
                            ->orWhereHas(
                                'user',
                                fn ($userQuery) => $userQuery->whereLike(
                                    'full_name',
                                    '%'.$search.'%',
                                    caseSensitive: false
                                )
                            )
                            ->orWhereRaw(
                                'CAST(properties AS TEXT) ILIKE ?',
                                ['%'.$search.'%']
                            );
                    }
                )
            )
            ->when(
                $validated['category'] ?? null,
                fn ($query, $category) => $query->where(
                    'category',
                    $category
                )
            )
            ->when(
                $validated['user_id'] ?? null,
                fn ($query, $userId) => $query->where(
                    'user_id',
                    $userId
                )
            )
            ->when(
                $validated['date_from'] ?? null,
                fn ($query, $date) => $query->whereDate(
                    'created_at',
                    '>=',
                    $date
                )
            )
            ->when(
                $validated['date_to'] ?? null,
                fn ($query, $date) => $query->whereDate(
                    'created_at',
                    '<=',
                    $date
                )
            )
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $actors = User::query()
            ->select('id', 'full_name')
            ->whereIn(
                'id',
                (clone $baseQuery)
                    ->whereNotNull('user_id')
                    ->select('user_id')
                    ->distinct()
            )
            ->orderBy('full_name')
            ->get();

        $categoryCounts = (clone $baseQuery)
            ->selectRaw(
                "COALESCE(category, 'legacy') as category, COUNT(*) as total"
            )
            ->groupByRaw("COALESCE(category, 'legacy')")
            ->pluck('total', 'category');

        return Inertia::render('investment-projects/logs', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'logs' => $logs,
            'actors' => $actors,
            'filters' => [
                'search' => $validated['search'] ?? '',
                'category' => $validated['category'] ?? '',
                'user_id' => isset($validated['user_id'])
                    ? (string) $validated['user_id']
                    : '',
                'date_from' => $validated['date_from'] ?? '',
                'date_to' => $validated['date_to'] ?? '',
            ],
            'categoryCounts' => $categoryCounts,
        ]);
    }

    public function update(Request $request, InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();
        $restrictedSectorType = $user?->restrictedSectorType();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_id' => 'required|integer|exists:companies,id',
            'description' => 'nullable|string',
            'current_status' => 'nullable|string',
            'jobs_count' => 'nullable|integer|min:0',
            'capacity' => 'nullable|string|max:500',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int) $value !== (int) $user->region_id) {
                        $fail('Жобаны тек өз ауданыңызда өзгертуге болады.');
                    }
                },
            ],
            'project_type_id' => 'required|exists:project_types,id',
            'sector' => [
                $restrictedSectorType ? 'required' : 'nullable',
                'array',
                $restrictedSectorType ? 'min:1' : 'nullable',
            ],
            'sector.*' => [
                'string',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped, $restrictedSectorType) {
                    $parsed = $this->parseSector($value);
                    $type = $parsed['type'];
                    $id = $parsed['id'];

                    if ($restrictedSectorType && $type !== $restrictedSectorType) {
                        $fail('Сіз тек өз секторыңызды таңдай аласыз.');

                        return;
                    }

                    if (! $isDistrictScoped) {
                        return;
                    }

                    if ($type === 'sez') {
                        if (! Sez::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("АЭА ({$id}) сіздің ауданыңызда емес.");
                        }
                    } elseif ($type === 'industrial_zone') {
                        if (! IndustrialZone::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("ИА ({$id}) сіздің ауданыңызда емес.");
                        }
                    } elseif ($type === 'prom_zone') {
                        if (! PromZone::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("Пром зона ({$id}) сіздің ауданыңызда емес.");
                        }
                    }
                },
            ],
            'total_investment' => 'required|numeric|min:0',
            'status' => 'required|in:plan,implementation,launched,suspended',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'executor_ids' => 'nullable|array',
            'executor_ids.*' => 'exists:users,id',
            'geometry' => 'nullable|array',
            'infrastructure' => 'nullable|array',
            'infrastructure.gas' => 'nullable|array',
            'infrastructure.water' => 'nullable|array',
            'infrastructure.electricity' => 'nullable|array',
            'infrastructure.land' => 'nullable|array',
            'curator_ids' => 'nullable|array',
            'curator_ids.*' => 'exists:users,id',
            'return_to' => 'nullable|string',
        ], [
            'sector.required' => 'Сектор таңдау міндетті.',
            'sector.min' => 'Кемінде бір сектор таңдаңыз.',
            'company_id.required' => 'Компанияны таңдаңыз.',
            'company_id.exists' => 'Таңдалған компания табылмады.',
        ]);

        $company = Company::find($validated['company_id']);
        $keepsCurrentCompany = (int) $investmentProject->company_id
            === (int) $company?->id;

        if (! $company
            || ! $company->investor()->exists()
            || (! $keepsCurrentCompany
                && ($company->status !== 'active'
                    || ! $company->is_profile_complete))) {
            throw ValidationException::withMessages([
                'company_id' => 'Компания белсенді, толық және инвестор аккаунтымен бірге болуы керек.',
            ]);
        }

        $validated['company_name'] = $company->display_name;

        $activityBefore = $this->projectActivitySnapshot(
            $investmentProject
        );

        // Superadmin can change curators; others cannot
        $isSuperAdmin = $user && $user->roleModel?->name === 'superadmin';
        $curatorIds = null;
        if ($isSuperAdmin && array_key_exists('curator_ids', $validated)) {
            $curatorIds = array_values(array_unique(array_map('intval', $validated['curator_ids'] ?? [])));
            if (! empty($curatorIds)) {
                $validated['created_by'] = $curatorIds[0];
            }
        }
        unset($validated['curator_ids']);

        $returnTo = $validated['return_to'] ?? '';
        unset($validated['return_to']);

        // Парсим массив sectors в формате ["sez-1", "industrial_zone-5"]
        $sectors = $validated['sector'] ?? [];
        $sezIds = [];
        $izIds = [];
        $promZoneIds = [];

        foreach ($sectors as $sector) {
            $parsed = $this->parseSector($sector);
            if ($parsed['type'] === 'sez') {
                $sezIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'industrial_zone') {
                $izIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'prom_zone') {
                $promZoneIds[] = $parsed['id'];
            }
        }

        $executorIds = $validated['executor_ids'] ?? [];
        unset($validated['executor_ids'], $validated['sector']);

        $investmentProject->update($validated);

        // Sync curators (superadmin only)
        if ($isSuperAdmin && $curatorIds !== null) {
            $investmentProject->curators()->sync($curatorIds);
        }

        // Sync executors (auto-include district ispolnitel users)
        $this->syncExecutorsWithIspolnitel($investmentProject, $executorIds);

        // Sync many-to-many связи с секторами
        $investmentProject->sezs()->sync($sezIds);
        $investmentProject->industrialZones()->sync($izIds);
        $investmentProject->promZones()->sync($promZoneIds);

        $investmentProject->refresh();
        $activityAfter = $this->projectActivitySnapshot(
            $investmentProject
        );

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'project.updated',
            category: 'project',
            action: 'Жоба мәліметтері жаңартылды',
            subject: $investmentProject,
            properties: [
                'project_name' => $investmentProject->name,
                'changes' => KpiLog::changes(
                    $activityBefore,
                    $activityAfter,
                    $this->projectActivityLabels()
                ),
            ]
        );

        if (! empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'Жоба жаңартылды.');
        }

        return redirect()->route('investment-projects.show', $investmentProject->id)->with('success', 'Жоба жаңартылды.');
    }

    /**
     * @return array<string, mixed>
     */
    private function projectActivitySnapshot(
        InvestmentProject $project
    ): array {
        return [
            'name' => $project->name,
            'company_name' => $project->company_name,
            'description' => $project->description,
            'current_status' => $project->current_status,
            'jobs_count' => $project->jobs_count,
            'capacity' => $project->capacity,
            'region' => $project->region()->value('name'),
            'project_type' => $project->projectType()->value('name'),
            'total_investment' => $project->total_investment,
            'status' => $project->status,
            'start_date' => $project->start_date,
            'end_date' => $project->end_date,
            'geometry' => $project->geometry,
            'infrastructure' => $project->infrastructure,
            'curators' => $project->curators()
                ->orderBy('full_name')
                ->pluck('full_name')
                ->all(),
            'executors' => $project->executors()
                ->orderBy('full_name')
                ->pluck('full_name')
                ->all(),
            'sezs' => $project->sezs()
                ->orderBy('name')
                ->pluck('name')
                ->all(),
            'industrial_zones' => $project->industrialZones()
                ->orderBy('name')
                ->pluck('name')
                ->all(),
            'prom_zones' => $project->promZones()
                ->orderBy('name')
                ->pluck('name')
                ->all(),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function projectActivityLabels(): array
    {
        return [
            'name' => 'Жоба атауы',
            'company_name' => 'Компания',
            'description' => 'Сипаттама',
            'current_status' => 'Ағымдағы жағдай',
            'jobs_count' => 'Жұмыс орындары',
            'capacity' => 'Жоба қуаттылығы',
            'region' => 'Өңір',
            'project_type' => 'Жоба түрі',
            'total_investment' => 'Инвестиция сомасы',
            'status' => 'Жоба статусы',
            'start_date' => 'Басталу күні',
            'end_date' => 'Аяқталу күні',
            'geometry' => 'Картадағы аумақ',
            'infrastructure' => 'Инфрақұрылым',
            'curators' => 'Кураторлар',
            'executors' => 'Орындаушылар',
            'sezs' => 'АЭА',
            'industrial_zones' => 'Индустриялық аймақтар',
            'prom_zones' => 'Өндірістік аймақтар',
        ];
    }

    private function parseSector(string $sector): array
    {
        // Формат: "sez-1", "industrial_zone-5"
        if (strpos($sector, '-') !== false) {
            [$type, $id] = explode('-', $sector, 2);

            return ['type' => $type, 'id' => (int) $id];
        }

        return ['type' => null, 'id' => null];
    }

    public function passport(InvestmentProject $investmentProject)
    {
        // Check download permission for ispolnitel
        $user = auth()->user();
        if ($user && ! $user->canDownloadFromProject($investmentProject)) {
            abort(403, 'Сіздің бұл жобаның файлдарына қол жеткізуіңіз жоқ.');
        }

        $investmentProject->load([
            'region',
            'projectType',
            'creator',
            'executors',
            'documents',
            'photos',
            'sezs',
            'industrialZones',
            'promZones',
            'subsoilUsers',
        ]);

        $zip = new ZipArchive;
        $zipFileName = 'passport_'.$investmentProject->id.'_'.time().'.zip';
        $zipPath = storage_path('app/private/'.$zipFileName);

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Мұрағатты құру мүмкін болмады.');
        }

        // Add documents split by completion status
        foreach ($investmentProject->documents as $document) {
            $filePath = $this->files->path($document->file_path);
            if ($filePath !== null) {
                $docName = $this->files->archiveName(
                    $document->name,
                    $document->file_path
                );
                $folder = $document->is_completed
                    ? 'Құжаттар/Аяқталған құжаттар'
                    : 'Құжаттар/Жүктелген құжаттар';
                $zip->addFile($filePath, $folder.'/'.$docName);
            }
        }

        // Add photos split by type (gallery vs render)
        $galleryIndex = 0;
        $renderIndex = 0;
        foreach ($investmentProject->photos as $photo) {
            $filePath = Storage::disk('public')->path($photo->file_path);
            if (file_exists($filePath)) {
                $extension = pathinfo($photo->file_path, PATHINFO_EXTENSION) ?: 'jpg';

                if ($photo->photo_type === 'render') {
                    $renderIndex++;
                    $photoName = $renderIndex.'.'.$extension;
                    if ($photo->description) {
                        $photoName = $renderIndex.'_'.preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $photo->description).'.'.$extension;
                    }
                    $zip->addFile($filePath, 'Фото/Болашақтағы сурет/'.$photoName);
                } else {
                    $galleryIndex++;
                    $photoName = $galleryIndex.'.'.$extension;
                    if ($photo->description) {
                        $photoName = $galleryIndex.'_'.preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $photo->description).'.'.$extension;
                    }
                    $zip->addFile($filePath, 'Фото/Галерея/'.$photoName);
                }
            }
        }

        if ($zip->count() === 0) {
            $zip->close();
            @unlink($zipPath);

            return redirect()->back();
        }

        $zip->close();

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'download.project_archive',
            category: 'download',
            action: 'Жобаның құжаттар архиві жүктелді',
            subject: $investmentProject,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Құжаттар саны' => $investmentProject->documents->count(),
                    'Фотолар саны' => $investmentProject->photos->count(),
                ],
            ]
        );

        $downloadName = 'Төлқұжат_'.preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $investmentProject->name).'.zip';

        return response()->download($zipPath, $downloadName)->deleteFileAfterSend(true);
    }

    /**
     * Generate a PPTX presentation for all projects in the same region.
     * Each project gets its own slide within a single PPTX file.
     */
    public function presentation(InvestmentProject $investmentProject)
    {
        // Check download permission for ispolnitel
        $user = auth()->user();
        if ($user && ! $user->canDownloadFromProject($investmentProject)) {
            abort(403, 'Сіздің бұл жобаның файлдарына қол жеткізуіңіз жоқ.');
        }

        // Load the single project with all relations
        $investmentProject->load([
            'region', 'projectType', 'creator', 'executors',
            'documents', 'photos', 'issues',
            'tasks.assignee.roleModel', 'sezs', 'industrialZones', 'subsoilUsers',
        ]);

        $pptx = new PhpPresentation;
        $pptx->getDocumentProperties()
            ->setCreator('Turkistan Invest')
            ->setTitle($investmentProject->name)
            ->setSubject('Инвестициялық жоба');

        $slide = $pptx->getActiveSlide();
        $this->buildProjectSlide($slide, $investmentProject);

        $projectName = preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $investmentProject->name);
        $fileName = 'pres_'.$investmentProject->id.'_'.time().'.pptx';
        $filePath = storage_path('app/private/'.$fileName);

        $writer = IOFactory::createWriter($pptx, 'PowerPoint2007');
        $writer->save($filePath);

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'download.presentation',
            category: 'download',
            action: 'Жоба презентациясы жүктелді',
            subject: $investmentProject,
            properties: [
                'project_name' => $investmentProject->name,
            ]
        );

        $downloadName = 'Презентация_'.$projectName.'.pptx';

        return response()->download($filePath, $downloadName)->deleteFileAfterSend(true);
    }

    public function destroy(InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'project.deleted',
            category: 'project',
            action: 'Жоба жойылды: "'.$investmentProject->name.'"',
            subject: $investmentProject,
            properties: [
                'project_name' => $investmentProject->name,
            ]
        );

        $investmentProject->delete();

        return redirect()->back()->with('success', 'Жоба жойылды.');
    }

    /**
     * Generate a single PPTX with one slide per project.
     */
    public function bulkPresentation(Request $request)
    {
        $validated = $request->validate([
            'project_ids' => 'required|array|min:1',
            'project_ids.*' => 'integer|distinct|exists:investment_projects,id',
        ]);

        $projectIds = $validated['project_ids'];
        $query = InvestmentProject::with([
            'region', 'projectType', 'creator', 'executors',
            'documents', 'photos', 'issues',
            'tasks.assignee.roleModel', 'sezs', 'industrialZones', 'subsoilUsers',
        ])->whereIn('id', $projectIds);

        $user = $request->user();
        $roleName = $user?->load('roleModel')->roleModel?->name;
        if ($roleName !== 'superadmin') {
            $query->active();
        }

        $this->projectAccess->scopeVisible($query, $user);

        if ($this->isIspolnitelUser($user)) {
            $query->where(function ($projectQuery) use ($user) {
                $projectQuery->where('created_by', $user->id)
                    ->orWhereHas('executors', function ($executorQuery) use ($user) {
                        $executorQuery->where('users.id', $user->id);
                    });
            });
        }

        abort_unless(
            (clone $query)->count() === count($projectIds),
            403,
            'Сұралған жобалардың бір бөлігіне қол жеткізуге рұқсат жоқ.'
        );

        $projects = $query->get();

        if ($projects->isEmpty()) {
            return redirect()->back();
        }

        $pptx = new PhpPresentation;
        $pptx->getDocumentProperties()
            ->setCreator('Turkistan Invest')
            ->setTitle('Жобалар презентациялары');

        $isFirst = true;
        foreach ($projects as $project) {
            if ($isFirst) {
                $slide = $pptx->getActiveSlide();
                $isFirst = false;
            } else {
                $slide = $pptx->createSlide();
            }
            $this->buildProjectSlide($slide, $project);
        }

        $fileName = 'presentations_'.time().'.pptx';
        $filePath = storage_path('app/private/'.$fileName);

        $writer = IOFactory::createWriter($pptx, 'PowerPoint2007');
        $writer->save($filePath);

        foreach ($projects as $project) {
            KpiLog::activity(
                projectId: $project->id,
                event: 'download.bulk_presentation',
                category: 'download',
                action: 'Жоба топтық презентация құрамында жүктелді',
                subject: $project,
                properties: [
                    'project_name' => $project->name,
                    'details' => [
                        'Топтағы жобалар саны' => $projects->count(),
                    ],
                ]
            );
        }

        $downloadName = 'Жобалар_презентациялары.pptx';

        return response()->download($filePath, $downloadName)->deleteFileAfterSend(true);
    }

    /**
     * Generate a PPTX file for a project and return the file path.
     */
    protected function generatePresentationFile(InvestmentProject $project): ?string
    {
        $pptx = new PhpPresentation;
        $pptx->getDocumentProperties()
            ->setCreator('Turkistan Invest')
            ->setTitle($project->name);

        $slide = $pptx->getActiveSlide();
        $this->buildProjectSlide($slide, $project);

        $fileName = 'pres_'.$project->id.'_'.time().'.pptx';
        $filePath = storage_path('app/private/'.$fileName);

        $writer = IOFactory::createWriter($pptx, 'PowerPoint2007');
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Build a single slide for a project on the given slide object.
     */
    protected function buildProjectSlide($slide, InvestmentProject $project): void
    {
        $white = 'FFFFFF';
        $darkGray = '333333';
        $midGray = '666666';
        $blue = '1565C0';
        $red = 'C62828';

        $addText = function (RichText $shape, string $text, int $size, string $color, bool $bold = false) {
            $run = $shape->createTextRun($text);
            $run->getFont()
                ->setSize($size)
                ->setColor(new Color('FF'.$color))
                ->setBold($bold)
                ->setName('Arial');

            return $run;
        };

        $fillSlide = function ($slide, string $color) {
            $bg = new BackgroundColor;
            $bg->setColor(new Color('FF'.$color));
            $slide->setBackground($bg);
        };

        $formatCurrency = function ($amount) {
            if (! $amount) {
                return 'Не указано';
            }
            $num = (float) $amount;
            if ($num >= 1_000_000_000) {
                $val = $num / 1_000_000_000;

                return number_format($val, 1, ',', ' ').' млрд ₸';
            }
            if ($num >= 1_000_000) {
                $val = $num / 1_000_000;

                return number_format($val, 1, ',', ' ').' млн ₸';
            }

            return number_format($num, 0, ',', ' ').' ₸';
        };

        $fillSlide($slide, $white);

        $leftX = 15;
        $leftW = 530;
        $rightX = 560;
        $rightW = 385;

        // ── HEADER ───────────────────────────────────────────────
        $logoPath = public_path('apple-touch-icon.png');
        if (file_exists($logoPath)) {
            try {
                $logoImg = $slide->createDrawingShape();
                $logoImg->setPath($logoPath);
                $logoImg->setWidth(50)->setHeight(50);
                $logoImg->setOffsetX($leftX)->setOffsetY(4);
            } catch (\Exception $e) {
            }
        }

        $titleName = mb_strtoupper($project->name);
        $titleShape = $slide->createRichTextShape();
        $titleShape->setHeight(30)->setWidth(930)->setOffsetX($leftX)->setOffsetY(6);
        $titleShape->getActiveParagraph()->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);
        $addText($titleShape, $titleName, 14, $blue, true);

        if ($project->company_name) {
            $companyShape = $slide->createRichTextShape();
            $companyShape->setHeight(20)->setWidth(930)->setOffsetX($leftX)->setOffsetY(34);
            $companyShape->getActiveParagraph()->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                ->setVertical(Alignment::VERTICAL_CENTER);
            $addText($companyShape, '(«'.$project->company_name.'»)', 10, $midGray, false);
        }

        $blueLine = $slide->createRichTextShape();
        $blueLine->setHeight(2)->setWidth(930)->setOffsetX($leftX)->setOffsetY(56);
        $blueLine->getFill()->setFillType(Fill::FILL_SOLID)->setStartColor(new Color('FF'.$blue));

        // ══════════════════════════════════════════════════════════
        // LEFT COLUMN — top: О ПРОЕКТЕ, bottom: ТЕКУЩАЯ СИТУАЦИЯ
        // ══════════════════════════════════════════════════════════
        $yLeft = 66;

        $sectionHeader = $slide->createRichTextShape();
        $sectionHeader->setHeight(24)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
        $addText($sectionHeader, 'ЖОБА ТУРАЛЫ', 12, $blue, true);
        $yLeft += 26;

        $infoItems = [
            ['Жоба бастамашысы', $project->company_name ?? 'Көрсетілмеген'],
            ['Құны', $formatCurrency($project->total_investment)],
            ['Саласы', $project->projectType?->name ?? 'Көрсетілмеген'],
            ['Жоба қуаттылығы', $project->capacity ? $project->capacity : '—'],
            ['Жұмыс орындары', $project->jobs_count ? $project->jobs_count.' адам' : '—'],
        ];

        $locationParts = [];
        if ($project->region?->name) {
            $locationParts[] = $project->region->name;
        }
        $sectorNames = collect();
        if ($project->sezs) {
            $sectorNames = $sectorNames->merge($project->sezs->pluck('name'));
        }
        if ($project->industrialZones) {
            $sectorNames = $sectorNames->merge($project->industrialZones->pluck('name'));
        }
        if ($project->subsoilUsers) {
            $sectorNames = $sectorNames->merge($project->subsoilUsers->pluck('name'));
        }
        if ($sectorNames->isNotEmpty()) {
            $locationParts[] = implode(', ', $sectorNames->toArray());
        }
        $locationStr = ! empty($locationParts) ? implode(', ', $locationParts) : 'Көрсетілмеген';

        $infoItems[] = ['Орналасуы', $locationStr];
        $infoItems[] = ['Іске асыру мерзімі', ($project->start_date?->format('Y') ?? '—').'-'.($project->end_date?->format('Y') ?? '—').' жж.'];

        $charsPerLine = 55;
        $singleLineH = 18;

        foreach ($infoItems as $item) {
            $fullText = $item[0].': '.$item[1];
            $lines = max(1, (int) ceil(mb_strlen($fullText) / $charsPerLine));
            $rowH = $lines * $singleLineH + 4;

            $row = $slide->createRichTextShape();
            $row->setHeight($rowH)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
            $row->getActiveParagraph()->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);
            $row->setAutoFit(RichText::AUTOFIT_NORMAL);
            $addText($row, $item[0].': ', 11, $darkGray, true);
            $addText($row, $item[1], 11, $darkGray, false);
            $yLeft += $rowH;
        }

        // ── ТЕКУЩАЯ СИТУАЦИЯ (left column, below project info) ──
        $yLeft += 12;

        $statusHeader = $slide->createRichTextShape();
        $statusHeader->setHeight(24)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
        $addText($statusHeader, 'АҒЫМДАҒЫ ЖАҒДАЙЫ', 12, $blue, true);
        $yLeft += 26;

        if ($project->current_status) {
            $maxStatusY = 560; // Leave space for infra below
            $availableH = max(40, $maxStatusY - $yLeft);
            $statusText = $project->current_status;

            $statusShape = $slide->createRichTextShape();
            $statusShape->setHeight($availableH)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
            $statusShape->getActiveParagraph()->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);
            $statusShape->setAutoFit(RichText::AUTOFIT_NORMAL);
            $addText($statusShape, $statusText, 10, $darkGray, false);

            // Approximate yLeft bump
            $lines = max(1, (int) ceil(mb_strlen($statusText) / 80));
            $yLeft += ($lines * 16) + 30; // Buffer
        } else {
            $noStatus = $slide->createRichTextShape();
            $noStatus->setHeight(16)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
            $addText($noStatus, 'Ағымдағы жағдай көрсетілмеген', 9, $midGray, false);
            $yLeft += 30;
        }

        // ── ПОТРЕБНОСТЬ В ИНФРАСТРУКТУРЕ (Moved to left side) ─────────────────────────────
        $infrastructure = $project->infrastructure;
        // Draw even if there is no infra (to match the image design, "Қажет етпейді")
        $infraHeader = $slide->createRichTextShape();
        $infraHeader->setHeight(24)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
        $addText($infraHeader, 'ИНФРАҚҰРЫЛЫМ ҚАЖЕТТІЛІГІ', 12, $blue, true);
        $yLeft += 28;

        $infraItems = [
            ['key' => 'gas',         'label' => 'Газ'],
            ['key' => 'water',       'label' => 'Су'],
            ['key' => 'electricity', 'label' => 'Электр қуаты'],
            ['key' => 'land',        'label' => 'Жер телімі'],
        ];

        $colCount = count($infraItems);
        $colW = (int) (($leftW - ($colCount - 1) * 4) / $colCount);
        $colX = $leftX;

        foreach ($infraItems as $item) {
            $val = $infrastructure[$item['key']] ?? null;
            $isNeeded = is_array($val) && ($val['needed'] ?? false);

            $headerCell = $slide->createRichTextShape();
            $headerCell->setHeight(24)->setWidth($colW)->setOffsetX($colX)->setOffsetY($yLeft);
            // $headerCell->getFill()->setFillType(Fill::FILL_SOLID)->setStartColor(new Color('FFE3F2FD'));
            $headerCell->getActiveParagraph()->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_CENTER);
            $addText($headerCell, $item['label'], 10, $darkGray, false);

            // Add top border manually by creating a thin shape or just no border to match picture

            $valueCell = $slide->createRichTextShape();
            $valueCell->setHeight(24)->setWidth($colW)->setOffsetX($colX)->setOffsetY($yLeft + 24);
            // $valueCell->getFill()->setFillType(Fill::FILL_SOLID)->setStartColor(new Color('FFFAFAFA'));
            $valueCell->getActiveParagraph()->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_CENTER);

            if ($isNeeded) {
                // If capacity is empty, it means needed but capacity not stated properly, we fallback to image text
                $addText($valueCell, ($val['capacity'] ?? '') ?: 'Қажет', 10, $darkGray, false);
            } else {
                $addText($valueCell, 'Қажет етпейді', 10, $darkGray, false);
            }

            $colX += $colW + 4;
        }

        $yLeft += 56;

        // ══════════════════════════════════════════════════════════
        // RIGHT COLUMN — top: Photo, bottom: Issues
        // ══════════════════════════════════════════════════════════
        $yRight = 66;

        // ── PHOTO ────────────────────────────────────────────────
        $imgMaxW = $rightW;
        $imgMaxH = 240;

        $renderPhoto = $project->photos->where('photo_type', 'render')->first();
        $actualImgH = 0;
        if ($renderPhoto) {
            $filePath = Storage::disk('public')->path($renderPhoto->file_path);
            if (file_exists($filePath)) {
                try {
                    $imgShape = $slide->createDrawingShape();
                    $imgShape->setPath($filePath);
                    $origW = $imgShape->getWidth();
                    $origH = $imgShape->getHeight();
                    if ($origW > 0 && $origH > 0) {
                        $ratio = min($imgMaxW / $origW, $imgMaxH / $origH);
                        $newW = (int) ($origW * $ratio);
                        $newH = (int) ($origH * $ratio);
                        $imgShape->setWidth($newW)->setHeight($newH);
                        $imgShape->setOffsetX($rightX + (int) (($imgMaxW - $newW) / 2));
                        $imgShape->setOffsetY($yRight);
                        $actualImgH = $newH;
                    }
                } catch (\Exception $e) {
                }
            }
        }

        $yRight += max($actualImgH + 15, 180);

        // ── ПРОБЛЕМНЫЕ ВОПРОСЫ ───────────────────────────────────
        $issues = $project->issues ?? collect();
        if ($issues instanceof \Illuminate\Database\Eloquent\Collection || is_array($issues)) {
            $issues = collect($issues);
        }

        $issuesHeader = $slide->createRichTextShape();
        $issuesHeader->setHeight(24)->setWidth($rightW)->setOffsetX($rightX)->setOffsetY($yRight);
        $addText($issuesHeader, 'ӨЗЕКТІ МӘСЕЛЕЛЕР', 12, $red, true);
        if ($issues->count() > 0) {
            $addText($issuesHeader, '  ('.$issues->count().')', 11, $red, true);
        }
        $yRight += 26;

        if ($issues->isNotEmpty()) {
            $maxIssuesY = 710;
            $issueFontSize = $issues->count() > 5 ? 8 : 9;
            $issueRowH = $issues->count() > 5 ? 14 : 16;

            foreach ($issues as $issue) {
                if ($yRight > $maxIssuesY) {
                    $remaining = $issues->count() - $issues->search($issue);
                    if ($remaining > 0) {
                        $moreShape = $slide->createRichTextShape();
                        $moreShape->setHeight(14)->setWidth($rightW - 10)->setOffsetX($rightX + 5)->setOffsetY($yRight);
                        $addText($moreShape, "... тағы {$remaining} мәселе", $issueFontSize, $midGray, true);
                    }
                    break;
                }

                $issueTitle = is_array($issue) ? ($issue['title'] ?? '') : ($issue->title ?? '');
                $issueSeverity = is_array($issue) ? ($issue['severity'] ?? 'medium') : ($issue->severity ?? 'medium');

                $severityColor = match ($issueSeverity) {
                    'critical', 'high' => $red,
                    'medium' => 'F57C00',
                    default => $midGray,
                };

                $issueRow = $slide->createRichTextShape();
                $issueRow->setHeight($issueRowH)->setWidth($rightW - 10)->setOffsetX($rightX + 5)->setOffsetY($yRight);
                $issueRow->getActiveParagraph()->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                    ->setVertical(Alignment::VERTICAL_TOP);
                $issueRow->setAutoFit(RichText::AUTOFIT_NORMAL);
                $addText($issueRow, '• ', $issueFontSize, $severityColor, true);
                $addText($issueRow, mb_substr($issueTitle, 0, 80), $issueFontSize, $darkGray, false);
                $yRight += $issueRowH + 2;
            }
        } else {
            $noIssues = $slide->createRichTextShape();
            $noIssues->setHeight(16)->setWidth($rightW)->setOffsetX($rightX + 5)->setOffsetY($yRight);
            $addText($noIssues, 'Проблемалық мәселелер жоқ', 9, $midGray, false);
        }
    }

    /**
     * Abort 403 if a district-scoped user tries to access a project outside their district.
     */
    protected function authorizeDistrictAccess(InvestmentProject $project): void
    {
        $user = request()->user();

        if (! $user) {
            return;
        }

        $user->loadMissing('roleModel');
        if ($user->roleModel?->name === 'moderator'
            && ! $this->projectAccess->canView($user, $project)) {
            abort(
                403,
                'Модераторға бұл жобаға қол жеткізуге рұқсат жоқ.'
            );
        }

        // Use the helper method
        if ($user->isDistrictScoped() && $project->region_id !== $user->region_id) {
            abort(403, 'Сіздің бұл жобаға қол жеткізуіңіз жоқ.');
        }

        // Akim scoped to an oblast: only projects in that oblast or its child districts
        if ($user->isOblastScopedAkim()) {
            $project->loadMissing('region');
            $projectRegion = $project->region;
            $oblastId = $user->region_id;
            $isInOblast = $projectRegion && (
                $projectRegion->id === $oblastId || $projectRegion->parent_id === $oblastId
            );
            if (! $isInOblast) {
                abort(403, 'Сіздің бұл жобаға қол жеткізуіңіз жоқ.');
            }
        }
    }

    protected function isIspolnitelUser($user): bool
    {
        if (! $user) {
            return false;
        }

        $user->loadMissing('roleModel');

        return $user->roleModel?->name === 'ispolnitel';
    }

    /**
     * Исполнитель пайдаланушыларды жобаға қосу (sync кезінде олар алынбайды).
     */
    protected function syncExecutorsWithIspolnitel(InvestmentProject $project, array $executorIds): void
    {
        $this->projectExecutors->syncProject($project, $executorIds);
    }

    protected function isProjectParticipant(InvestmentProject $project, ?int $userId): bool
    {
        if (! $userId) {
            return false;
        }

        if ((int) $project->created_by === $userId) {
            return true;
        }

        if ($project->relationLoaded('executors')) {
            return $project->executors->contains('id', $userId);
        }

        return $project->executors()->where('users.id', $userId)->exists();
    }

    public function archive(InvestmentProject $investmentProject)
    {
        $user = request()->user();
        $roleName = $user?->load('roleModel')->roleModel?->name;
        if (! in_array($roleName, ['superadmin', 'invest'])) {
            abort(403);
        }

        $investmentProject->update(['is_archived' => true]);

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'project.archived',
            category: 'project',
            action: 'Жоба архивке жіберілді',
            subject: $investmentProject,
            properties: [
                'project_name' => $investmentProject->name,
            ]
        );

        return redirect()->back()->with('success', 'Жоба архивке жіберілді.');
    }

    public function unarchive(InvestmentProject $investmentProject)
    {
        $user = request()->user();
        $roleName = $user?->load('roleModel')->roleModel?->name;
        if (! in_array($roleName, ['superadmin', 'invest'])) {
            abort(403);
        }

        $investmentProject->update(['is_archived' => false]);

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'project.unarchived',
            category: 'project',
            action: 'Жоба архивтен қайтарылды',
            subject: $investmentProject,
            properties: [
                'project_name' => $investmentProject->name,
            ]
        );

        return redirect()->back()->with('success', 'Жоба архивтен қайтарылды.');
    }

    public function archived(Request $request)
    {
        $user = $request->user();
        $roleName = $user?->load('roleModel')->roleModel?->name;
        if (! in_array($roleName, ['superadmin', 'invest', 'prokuror'], true)) {
            abort(403);
        }

        $search = $request->input('search');

        $projectsQuery = InvestmentProject::archived()->with([
            'company',
            'region',
            'projectType',
            'creator',
            'executors',
            'sezs',
            'industrialZones',
            'subsoilUsers',
        ]);
        $this->projectAccess->scopeVisible($projectsQuery, $user);

        if ($search) {
            $projectsQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%")
                    ->orWhereHas('company', function ($companyQuery) use ($search) {
                        $companyQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('bin', 'like', "%{$search}%");
                    });
            });
        }

        $projects = $projectsQuery->latest()->paginate(15)->withQueryString();

        return Inertia::render('investment-projects/archived', [
            'projects' => $projects,
            'filters' => ['search' => $search ?? ''],
        ]);
    }

    /**
     * Validate that the return URL is a safe local URL.
     * Prevents open redirect vulnerabilities.
     */
    private function isValidReturnUrl(string $url): bool
    {
        // Only allow relative URLs starting with /
        if (str_starts_with($url, '/') && ! str_starts_with($url, '//')) {
            return true;
        }

        // Allow URLs that match the app URL
        $appUrl = config('app.url');
        if ($appUrl && str_starts_with($url, $appUrl)) {
            return true;
        }

        return false;
    }
}
