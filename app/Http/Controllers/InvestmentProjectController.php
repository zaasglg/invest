<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            'region',
            'projectType',
            'creator',
            'executors',
            'sezs',
            'industrialZones',
            'subsoilUsers',
        ]);

        // Region-scope: invest sees only their district's projects
        // Ispolnitel sees ALL projects (no district or participation filter)
        $user = $request->user();
        if ($user && $user->isDistrictScoped() && ! $this->isIspolnitelUser($user)) {
            $projectsQuery->where('region_id', $user->region_id);
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $projectsQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%");
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

        $stats = [
            'total_projects' => $totalProjects,
            'total_investment' => $totalInvestment,
            'status_counts' => [
                'launched' => $statusCounts['launched'] ?? 0,
                'implementation' => $statusCounts['implementation'] ?? 0,
                'suspended' => $statusCounts['suspended'] ?? 0,
                'plan' => $statusCounts['plan'] ?? 0,
            ],
        ];

        $projects = $projectsQuery->orderBy('sort_order', 'asc')->latest()->paginate(15)->withQueryString();
        // dd(Region::where('type','district')->orderBy('name')->get());
        return Inertia::render('investment-projects/index', [
            'projects' => $projects,
            'stats' => $stats,
            'regions' => Region::where('type','district')->orderBy('sort_order')->get(),
            'projectTypes' => ProjectType::select('id', 'name')->orderBy('name')->get(),
            'users' => User::select('id', 'full_name', 'region_id', 'baskarma_type', 'position')->orderBy('full_name')->get(),
            'sezs' => Sez::select('id', 'name', 'region_id')->orderBy('name')->get(),
            'industrialZones' => IndustrialZone::select('id', 'name', 'region_id')->orderBy('name')->get(),
            'subsoilUsers' => SubsoilUser::select('id', 'name', 'region_id')->orderBy('name')->get(),
            'filters' => $filters,
        ]);
    }

    public function moveToPage(Request $request, InvestmentProject $investmentProject)
    {
        $request->validate([
            'target_page' => 'required|integer|min:1',
        ]);

        $targetPage = $request->target_page;
        $perPage = 15;

        $targetIndex = ($targetPage - 1) * $perPage;

        $projects = InvestmentProject::active()->orderBy('sort_order', 'asc')->orderBy('created_at', 'desc')->where('id', '!=', $investmentProject->id)->get();
        $projects->splice($targetIndex, 0, [$investmentProject]);

        $index = 1;
        foreach ($projects as $p) {
            $p->update(['sort_order' => $index++]);
        }

        return redirect()->back()->with('success', 'Жобаның орны ауыстырылды.');
    }

    public function reorder(Request $request)
    {
        $user = $request->user();
        $role = $user?->load('roleModel')->roleModel?->name;
        
        if (!in_array($role, ['superadmin', 'invest'])) {
            abort(403);
        }

        $validated = $request->validate([
            'project_ids' => 'required|array',
            'project_ids.*' => 'integer|exists:investment_projects,id',
        ]);

        $projectIds = $validated['project_ids'];
        $page = $request->input('page', 1);
        $perPage = 15;
        $offset = ($page - 1) * $perPage;

        foreach ($projectIds as $index => $id) {
            InvestmentProject::where('id', $id)->update(['sort_order' => $offset + $index]);
        }

        return response()->noContent();
    }

    public function create()
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        $sezQuery = Sez::select('id', 'name', 'region_id', 'location');
        $izQuery = IndustrialZone::select('id', 'name', 'region_id', 'location');

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
        }

        $regions = $regionsQuery->get();
        $projectTypes = ProjectType::all();
        $users = User::with('roleModel:id,name,display_name')
            ->select('id', 'full_name', 'region_id', 'role_id', 'baskarma_type', 'position')
            ->orderBy('full_name')
            ->get();
        $sezList = $sezQuery->get();
        $industrialZones = $izQuery->get();

        // Get invest-role users for curator selection (superadmin only)
        $isSuperAdmin = $user && $user->roleModel?->name === 'superadmin';
        $investUsers = [];
        if ($isSuperAdmin) {
            $investUsers = User::with('roleModel:id,name,display_name')
                ->whereHas('roleModel', fn ($q) => $q->where('name', 'invest'))
                ->select('id', 'full_name', 'region_id')
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
            'isSuperAdmin' => $isSuperAdmin,
            'investUsers' => $investUsers,
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'required|string|max:255',
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
            'sector' => ['nullable', 'array'],
            'sector.*' => [
                'string',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if (! $isDistrictScoped) {
                        return;
                    }

                    $parsed = $this->parseSector($value);
                    $type = $parsed['type'];
                    $id = $parsed['id'];

                    if ($type === 'sez') {
                        if (! Sez::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("АЭА ({$id}) сіздің ауданыңызда емес.");
                        }
                    } elseif ($type === 'industrial_zone') {
                        if (! IndustrialZone::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("ИА ({$id}) сіздің ауданыңызда емес.");
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
            'created_by' => 'nullable|exists:users,id',
        ]);

        // Superadmin can assign curator (created_by), otherwise use authenticated user
        $isSuperAdmin = $user && $user->roleModel?->name === 'superadmin';
        if ($isSuperAdmin && ! empty($validated['created_by'])) {
            // Keep the selected curator
        } else {
            $validated['created_by'] = auth()->id();
        }

        // Парсим массив sectors
        $sectors = $validated['sector'] ?? [];
        $sezIds = [];
        $izIds = [];

        foreach ($sectors as $sector) {
            $parsed = $this->parseSector($sector);
            if ($parsed['type'] === 'sez') {
                $sezIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'industrial_zone') {
                $izIds[] = $parsed['id'];
            }
        }

        $executorIds = $validated['executor_ids'] ?? [];
        unset($validated['executor_ids'], $validated['sector']);

        $project = InvestmentProject::create($validated);

        // Sync executors
        if (! empty($executorIds)) {
            $project->executors()->sync($executorIds);
        }

        // Sync many-to-many связи с секторами
        $project->sezs()->sync($sezIds);
        $project->industrialZones()->sync($izIds);

        KpiLog::log($project->id, 'Жаңа жоба құрылды: "' . $project->name . '"');

        return redirect()->route('investment-projects.index')->with('success', 'Жоба құрылды.');
    }

    public function show($id)
    {
        $project = InvestmentProject::with([
            'region',
            'projectType',
            'creator',
            'executors',
            'documents',
            'issues',
            'tasks.assignee.roleModel',
            'tasks.completions.submitter',
            'tasks.completions.reviewer',
            'tasks.completions.files',
            'sezs',
            'industrialZones',
            'subsoilUsers',
        ])
            ->withCount('photos')
            ->find($id);

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
                if (! in_array($archiveRole, ['superadmin', 'invest'])) {
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
                'company_name' => 'Demo Company Ltd.',
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
            ->orderBy('full_name');

        // Invest can assign tasks to all ispolnitel accounts.
        if ($user?->roleModel?->name === 'invest') {
            $assignableUsersQuery->whereHas('roleModel', function ($roleQuery) {
                $roleQuery->where('name', 'ispolnitel');
            });
        } elseif ($user && $user->isDistrictScoped()) {
            $assignableUsersQuery->where(function ($query) use ($user) {
                // Users in same region
                $query->where('region_id', $user->region_id)
                    // Or all ispolnitel users
                    ->orWhere(function ($q) {
                        $q->whereHas('roleModel', function ($roleQuery) {
                            $roleQuery->where('name', 'ispolnitel');
                        });
                    });
            });
        }

        $canDownload = $user && is_object($project) ? $user->canDownloadFromProject($project) : true;

        // Check if ispolnitel is involved in the project
        $roleName = $user?->roleModel?->name;
        $isInvolved = true;
        if ($roleName === 'ispolnitel' && is_object($project)) {
            $isInvolved = $user->isInvolvedInProject($project);
        }

        // Check if project is in ispolnitel's own district
        $isOwnDistrict = false;
        if ($roleName === 'ispolnitel' && is_object($project) && $user->region_id) {
            $isOwnDistrict = (int) $project->region_id === (int) $user->region_id;
        }
        return Inertia::render('investment-projects/show', [
            'project' => $project,
            'mainGallery' => $mainGalleryPhotos,
            'renderPhotos' => $renderPhotos,
            'users' => $assignableUsersQuery->get(),
            'canDownload' => $canDownload,
            'isInvolved' => $isInvolved,
            'isOwnDistrict' => $isOwnDistrict,
        ]);
    }

    public function edit(InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $investmentProject->load(['sezs', 'industrialZones']);

        $regionsQuery = Region::query();
        $sezQuery = Sez::select('id', 'name', 'region_id', 'location');
        $izQuery = IndustrialZone::select('id', 'name', 'region_id', 'location');

        if ($isDistrictScoped) {
            $regionsQuery->where('id', $user->region_id);
            $sezQuery->where('region_id', $user->region_id);
            $izQuery->where('region_id', $user->region_id);
        }

        $regions = $regionsQuery->get();
        $projectTypes = ProjectType::all();
        $users = User::with('roleModel:id,name,display_name')
            ->select('id', 'full_name', 'region_id', 'role_id', 'baskarma_type', 'position')
            ->orderBy('full_name')
            ->get();
        $sezList = $sezQuery->get();
        $industrialZones = $izQuery->get();

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

        $projectData = $investmentProject->load(['region', 'projectType', 'creator', 'executors', 'documents'])
            ->loadCount('photos')
            ->toArray();

        $projectData['sector'] = $sector;

        // Get invest-role users for curator selection (superadmin only)
        $isSuperAdmin = $user && $user->roleModel?->name === 'superadmin';
        $investUsers = [];
        if ($isSuperAdmin) {
            $investUsers = User::with('roleModel:id,name,display_name')
                ->whereHas('roleModel', fn ($q) => $q->where('name', 'invest'))
                ->select('id', 'full_name', 'region_id')
                ->orderBy('full_name')
                ->get();
        }

        return Inertia::render('investment-projects/edit', [
            'project' => $projectData,
            'regions' => $regions,
            'isDistrictScoped' => $isDistrictScoped,
            'userRegionId' => $isDistrictScoped ? $user->region_id : null,
            'projectTypes' => $projectTypes,
            'users' => $users,
            'sezList' => $sezList,
            'industrialZones' => $industrialZones,
            'isSuperAdmin' => $isSuperAdmin,
            'investUsers' => $investUsers,
        ]);
    }

    public function updateStatus(Request $request, InvestmentProject $investmentProject)
    {
        $validated = $request->validate([
            'current_status' => 'nullable|string',
        ]);

        $investmentProject->update(['current_status' => $validated['current_status']]);

        KpiLog::log($investmentProject->id, 'Ағымдағы жағдайы жаңартылды');

        return redirect()->back()->with('success', 'Ағымдағы жағдайы жаңартылды.');
    }

    public function logs(InvestmentProject $investmentProject)
    {
        $user = request()->user();

        if ($user?->roleModel?->name !== 'superadmin') {
            abort(403);
        }

        $logs = KpiLog::where('project_id', $investmentProject->id)
            ->with('user:id,full_name')
            ->latest()
            ->paginate(10);

        return Inertia::render('investment-projects/logs', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'logs' => $logs,
        ]);
    }

    public function update(Request $request, InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'required|string|max:255',
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
            'sector' => ['nullable', 'array'],
            'sector.*' => [
                'string',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if (! $isDistrictScoped) {
                        return;
                    }

                    $parsed = $this->parseSector($value);
                    $type = $parsed['type'];
                    $id = $parsed['id'];

                    if ($type === 'sez') {
                        if (! Sez::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("АЭА ({$id}) сіздің ауданыңызда емес.");
                        }
                    } elseif ($type === 'industrial_zone') {
                        if (! IndustrialZone::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("ИА ({$id}) сіздің ауданыңызда емес.");
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
            'created_by' => 'nullable|exists:users,id',
            'return_to' => 'nullable|string',
        ]);

        // Superadmin can change curator (created_by)
        $isSuperAdmin = $user && $user->roleModel?->name === 'superadmin';
        if (! $isSuperAdmin) {
            unset($validated['created_by']);
        }

        $returnTo = $validated['return_to'] ?? '';
        unset($validated['return_to']);

        // Парсим массив sectors в формате ["sez-1", "industrial_zone-5"]
        $sectors = $validated['sector'] ?? [];
        $sezIds = [];
        $izIds = [];

        foreach ($sectors as $sector) {
            $parsed = $this->parseSector($sector);
            if ($parsed['type'] === 'sez') {
                $sezIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'industrial_zone') {
                $izIds[] = $parsed['id'];
            }
        }

        $executorIds = $validated['executor_ids'] ?? [];
        unset($validated['executor_ids'], $validated['sector']);

        $investmentProject->update($validated);

        // Sync executors
        $investmentProject->executors()->sync($executorIds);

        // Sync many-to-many связи с секторами
        $investmentProject->sezs()->sync($sezIds);
        $investmentProject->industrialZones()->sync($izIds);

        KpiLog::log($investmentProject->id, 'Жоба мәліметтері жаңартылды');

        if (!empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'Жоба жаңартылды.');
        }

        return redirect()->route('investment-projects.show', $investmentProject->id)->with('success', 'Жоба жаңартылды.');
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
            'subsoilUsers',
        ]);

        $zip = new ZipArchive;
        $zipFileName = 'passport_'.$investmentProject->id.'_'.time().'.zip';
        $zipPath = storage_path('app/private/'.$zipFileName);

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Мұрағатты құру мүмкін болмады.');
        }

        // Add documents
        foreach ($investmentProject->documents as $document) {
            $filePath = Storage::disk('public')->path($document->file_path);
            if (file_exists($filePath)) {
                $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);
                $docName = $document->name;
                if ($extension && ! str_ends_with(mb_strtolower($docName), '.'.mb_strtolower($extension))) {
                    $docName .= '.'.$extension;
                }
                $zip->addFile($filePath, 'Құжаттар/'.$docName);
            }
        }

        // Add photos
        foreach ($investmentProject->photos as $index => $photo) {
            $filePath = Storage::disk('public')->path($photo->file_path);
            if (file_exists($filePath)) {
                $extension = pathinfo($photo->file_path, PATHINFO_EXTENSION) ?: 'jpg';
                $photoName = ($index + 1).'.'.$extension;
                if ($photo->description) {
                    $photoName = ($index + 1).'_'.preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $photo->description).'.'.$extension;
                }
                $zip->addFile($filePath, 'Фото/'.$photoName);
            }
        }

        if ($zip->count() === 0) {
            $zip->close();
            @unlink($zipPath);
            abort(404, 'Жүктеуге файлдар жоқ.');
        }

        $zip->close();

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

        $downloadName = 'Презентация_'.$projectName.'.pptx';

        return response()->download($filePath, $downloadName)->deleteFileAfterSend(true);
    }

    public function destroy(InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        KpiLog::log($investmentProject->id, 'Жоба жойылды: "' . $investmentProject->name . '"');

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
            'project_ids.*' => 'integer|exists:investment_projects,id',
        ]);

        $projectIds = $validated['project_ids'];
        $query = InvestmentProject::with([
            'region', 'projectType', 'creator', 'executors',
            'documents', 'photos', 'issues',
            'tasks.assignee.roleModel', 'sezs', 'industrialZones', 'subsoilUsers',
        ])->whereIn('id', $projectIds);

        $user = $request->user();
        if ($user?->load('roleModel')->roleModel?->name !== 'superadmin') {
            $query->active();
        }

        if ($user && $user->isDistrictScoped()) {
            $query->where('region_id', $user->region_id);
        }

        if ($this->isIspolnitelUser($user)) {
            $query->where(function ($projectQuery) use ($user) {
                $projectQuery->where('created_by', $user->id)
                    ->orWhereHas('executors', function ($executorQuery) use ($user) {
                        $executorQuery->where('users.id', $user->id);
                    });
            });
        }

        $projects = $query->get();

        if ($projects->isEmpty()) {
            abort(404, 'Жобалар табылмады.');
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
            ['Жұмыс орындары', $project->jobs_count ? $project->jobs_count . ' адам' : '—'],
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
        $locationStr = !empty($locationParts) ? implode(', ', $locationParts) : 'Көрсетілмеген';

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

        // Use the helper method
        if ($user->isDistrictScoped() && $project->region_id !== $user->region_id) {
            abort(403, 'Сіздің бұл жобаға қол жеткізуіңіз жоқ.');
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

        KpiLog::log($investmentProject->id, 'Жоба архивке жіберілді');

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

        KpiLog::log($investmentProject->id, 'Жоба архивтен қайтарылды');

        return redirect()->back()->with('success', 'Жоба архивтен қайтарылды.');
    }

    public function archived(Request $request)
    {
        $user = $request->user();
        $roleName = $user?->load('roleModel')->roleModel?->name;
        if (! in_array($roleName, ['superadmin', 'invest'])) {
            abort(403);
        }

        $search = $request->input('search');

        $projectsQuery = InvestmentProject::archived()->with([
            'region',
            'projectType',
            'creator',
            'executors',
            'sezs',
            'industrialZones',
            'subsoilUsers',
        ]);

        if ($search) {
            $projectsQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%");
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
        if (str_starts_with($url, '/') && !str_starts_with($url, '//')) {
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
