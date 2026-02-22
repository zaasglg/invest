<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
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

        $projectsQuery = InvestmentProject::with([
            'region',
            'projectType',
            'creator',
            'executors',
            'sezs',
            'industrialZones',
            'subsoilUsers',
        ]);

        // Region-scope: ispolnitel and district baskarma see only their district's projects
        $user = $request->user();
        if ($user && $user->isDistrictScoped()) {
            $projectsQuery->where('region_id', $user->region_id);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $projectsQuery->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('company_name', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['region_id'])) {
            $projectsQuery->where('region_id', (int) $filters['region_id']);
        }

        if (!empty($filters['project_type_id'])) {
            $projectsQuery->where('project_type_id', (int) $filters['project_type_id']);
        }

        if (!empty($filters['status'])) {
            $projectsQuery->where('status', $filters['status']);
        }

        if (!empty($filters['executor_id'])) {
            $executorId = (int) $filters['executor_id'];
            $projectsQuery->whereHas('executors', function ($query) use ($executorId) {
                $query->where('users.id', $executorId);
            });
        }

        if (!empty($filters['sector_type'])) {
            $sectorType = $filters['sector_type'];
            $sectorId = !empty($filters['sector_id']) ? (int) $filters['sector_id'] : null;

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

        if (!empty($filters['min_investment'])) {
            $projectsQuery->where('total_investment', '>=', (float) $filters['min_investment']);
        }

        if (!empty($filters['max_investment'])) {
            $projectsQuery->where('total_investment', '<=', (float) $filters['max_investment']);
        }

        if (!empty($filters['start_date_from'])) {
            $projectsQuery->whereDate('start_date', '>=', $filters['start_date_from']);
        }

        if (!empty($filters['start_date_to'])) {
            $projectsQuery->whereDate('start_date', '<=', $filters['start_date_to']);
        }

        if (!empty($filters['end_date_from'])) {
            $projectsQuery->whereDate('end_date', '>=', $filters['end_date_from']);
        }

        if (!empty($filters['end_date_to'])) {
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
            ]
        ];

        $projects = $projectsQuery->latest()->paginate(15)->withQueryString();

        return Inertia::render('investment-projects/index', [
            'projects' => $projects,
            'stats' => $stats,
            'regions' => Region::select('id', 'name')->orderBy('name')->get(),
            'projectTypes' => ProjectType::select('id', 'name')->orderBy('name')->get(),
            'users' => User::select('id', 'full_name', 'region_id', 'baskarma_type', 'position')->orderBy('full_name')->get(),
            'sezs' => Sez::select('id', 'name')->orderBy('name')->get(),
            'industrialZones' => IndustrialZone::select('id', 'name')->orderBy('name')->get(),
            'subsoilUsers' => SubsoilUser::select('id', 'name')->orderBy('name')->get(),
            'filters' => $filters,
        ]);
    }

    public function create()
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        $sezQuery = Sez::select('id', 'name', 'region_id', 'location');
        $izQuery = IndustrialZone::select('id', 'name', 'region_id', 'location');
        $subsoilQuery = SubsoilUser::select('id', 'name', 'region_id', 'location');

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
            $subsoilQuery->where('region_id', $user->region_id);
        }

        $regions = $regionsQuery->get();
        $projectTypes = ProjectType::all();
        $users = User::with('roleModel:id,name,display_name')
            ->select('id', 'full_name', 'region_id', 'role_id', 'baskarma_type', 'position')
            ->orderBy('full_name')
            ->get();
        $sezList = $sezQuery->get();
        $industrialZones = $izQuery->get();
        $subsoilUsers = $subsoilQuery->get();

        return Inertia::render('investment-projects/create', [
            'regions' => $regions,
            'isDistrictScoped' => $isDistrictScoped,
            'userRegionId' => $isDistrictScoped ? $user->region_id : null,
            'projectTypes' => $projectTypes,
            'users' => $users,
            'sezList' => $sezList,
            'industrialZones' => $industrialZones,
            'subsoilUsers' => $subsoilUsers,
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int)$value !== (int)$user->region_id) {
                        $fail('Вы можете добавить проект только в свой район.');
                    }
                },
            ],
            'project_type_id' => 'required|exists:project_types,id',
            'sector' => ['required', 'array'],
            'sector.*' => [
                'string',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if (!$isDistrictScoped) return;

                    $parsed = $this->parseSector($value);
                    $type = $parsed['type'];
                    $id = $parsed['id'];

                    if ($type === 'sez') {
                        if (!Sez::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("СЭЗ ({$id}) не находится в вашем районе.");
                        }
                    } elseif ($type === 'industrial_zone') {
                        if (!IndustrialZone::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("Индустриальный район ({$id}) не находится в вашем районе.");
                        }
                    } elseif ($type === 'subsoil') {
                        if (!SubsoilUser::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("Недропользователь ({$id}) не находится в вашем районе.");
                        }
                    }
                }
            ],
            'total_investment' => 'nullable|numeric|min:0',
            'status' => 'required|in:plan,implementation,launched,suspended',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'executor_ids' => 'nullable|array',
            'executor_ids.*' => 'exists:users,id',
            'geometry' => 'nullable|array',
        ]);

        $validated['created_by'] = auth()->id();

        // Парсим массив sectors
        $sectors = $validated['sector'] ?? [];
        $sezIds = [];
        $izIds = [];
        $subsoilIds = [];

        foreach ($sectors as $sector) {
            $parsed = $this->parseSector($sector);
            if ($parsed['type'] === 'sez') {
                $sezIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'industrial_zone') {
                $izIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'subsoil') {
                $subsoilIds[] = $parsed['id'];
            }
        }

        $executorIds = $validated['executor_ids'] ?? [];
        unset($validated['executor_ids'], $validated['sector']);

        $project = InvestmentProject::create($validated);

        // Sync executors
        if (!empty($executorIds)) {
            $project->executors()->sync($executorIds);
        }

        // Sync many-to-many связи с секторами
        $project->sezs()->sync($sezIds);
        $project->industrialZones()->sync($izIds);
        $project->subsoilUsers()->sync($subsoilIds);

        return redirect()->route('investment-projects.index')->with('success', 'Проект создан.');
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
        if ($project) {
            $this->authorizeDistrictAccess($project);
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

        if (!$project) {
            // Demo fallback data
            $project = [
                'id' => (int) $id,
                'name' => 'Демо проект ' . $id,
                'company_name' => 'Demo Company Ltd.',
                'description' => 'Это демонстрационный проект, сгенерированный автоматически, так как запись в базе данных не найдена. Здесь будет подробное описание инвестиционного проекта, его целей, задач и ожидаемых результатов.',
                'region' => ['name' => 'Туркестанская область'],
                'project_type' => ['name' => 'Производство'],
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

        // Logic for assignable users for tasks
        // District scoped users can assign to:
        // 1. Users in their own region
        // 2. Regional management users
        $user = request()->user();
        $assignableUsersQuery = User::select('id', 'full_name', 'role_id', 'baskarma_type', 'region_id', 'position')
            ->with('roleModel:id,name,display_name')
            ->orderBy('full_name');

        if ($user && $user->isDistrictScoped()) {
            $assignableUsersQuery->where(function ($query) use ($user) {
                // Users in same region
                $query->where('region_id', $user->region_id)
                    // Or regional management
                    ->orWhere(function ($q) {
                         $q->whereHas('roleModel', function ($roleQuery) {
                             $roleQuery->where('name', 'baskarma');
                         })->where('baskarma_type', 'oblast');
                    });
            });
        }

        return Inertia::render('investment-projects/show', [
            'project' => $project,
            'mainGallery' => $mainGalleryPhotos,
            'renderPhotos' => $renderPhotos,
            'users' => $assignableUsersQuery->get(),
        ]);
    }

    public function edit(InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $investmentProject->load(['sezs', 'industrialZones', 'subsoilUsers']);

        $regionsQuery = Region::query();
        $sezQuery = Sez::select('id', 'name', 'region_id', 'location');
        $izQuery = IndustrialZone::select('id', 'name', 'region_id', 'location');
        $subsoilQuery = SubsoilUser::select('id', 'name', 'region_id', 'location');

        if ($isDistrictScoped) {
            $regionsQuery->where('id', $user->region_id);
            $sezQuery->where('region_id', $user->region_id);
            $izQuery->where('region_id', $user->region_id);
            $subsoilQuery->where('region_id', $user->region_id);
        }

        $regions = $regionsQuery->get();
        $projectTypes = ProjectType::all();
        $users = User::with('roleModel:id,name,display_name')
            ->select('id', 'full_name', 'region_id', 'role_id', 'baskarma_type', 'position')
            ->orderBy('full_name')
            ->get();
        $sezList = $sezQuery->get();
        $industrialZones = $izQuery->get();
        $subsoilUsers = $subsoilQuery->get();

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
        
        // Загружаем всех недропользователей
        foreach ($investmentProject->subsoilUsers as $su) {
            $sector[] = "subsoil-{$su->id}";
        }

        $projectData = $investmentProject->load(['region', 'projectType', 'creator', 'executors', 'documents'])
            ->loadCount('photos')
            ->toArray();
        
        $projectData['sector'] = $sector;

        return Inertia::render('investment-projects/edit', [
            'project' => $projectData,
            'regions' => $regions,
            'isDistrictScoped' => $isDistrictScoped,
            'userRegionId' => $isDistrictScoped ? $user->region_id : null,
            'projectTypes' => $projectTypes,
            'users' => $users,
            'sezList' => $sezList,
            'industrialZones' => $industrialZones,
            'subsoilUsers' => $subsoilUsers,
        ]);
    }

    public function update(Request $request, InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int)$value !== (int)$user->region_id) {
                        $fail('Изменить проект можно только в своем районе.');
                    }
                },
            ],
            'project_type_id' => 'required|exists:project_types,id',
            'sector' => ['required', 'array'],
            'sector.*' => [
                'string',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if (!$isDistrictScoped) return;

                    $parsed = $this->parseSector($value);
                    $type = $parsed['type'];
                    $id = $parsed['id'];

                    if ($type === 'sez') {
                        if (!Sez::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("СЭЗ ({$id}) не находится в вашем районе.");
                        }
                    } elseif ($type === 'industrial_zone') {
                        if (!IndustrialZone::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("Индустриальный район ({$id}) не находится в вашем районе.");
                        }
                    } elseif ($type === 'subsoil') {
                        if (!SubsoilUser::where('id', $id)->where('region_id', $user->region_id)->exists()) {
                            $fail("Недропользователь ({$id}) не находится в вашем районе.");
                        }
                    }
                }
            ],
            'total_investment' => 'nullable|numeric|min:0',
            'status' => 'required|in:plan,implementation,launched,suspended',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'executor_ids' => 'nullable|array',
            'executor_ids.*' => 'exists:users,id',
            'geometry' => 'nullable|array',
        ]);

        // Парсим массив sectors в формате ["sez-1", "industrial_zone-5", "subsoil-3"]
        $sectors = $validated['sector'] ?? [];
        $sezIds = [];
        $izIds = [];
        $subsoilIds = [];

        foreach ($sectors as $sector) {
            $parsed = $this->parseSector($sector);
            if ($parsed['type'] === 'sez') {
                $sezIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'industrial_zone') {
                $izIds[] = $parsed['id'];
            } elseif ($parsed['type'] === 'subsoil') {
                $subsoilIds[] = $parsed['id'];
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
        $investmentProject->subsoilUsers()->sync($subsoilIds);

        return redirect()->route('investment-projects.index')->with('success', 'Проект обновлен.');
    }

    private function parseSector(string $sector): array
    {
        // Формат: "sez-1", "industrial_zone-5", "subsoil-3"
        if (strpos($sector, '-') !== false) {
            [$type, $id] = explode('-', $sector, 2);
            return ['type' => $type, 'id' => (int)$id];
        }
        
        return ['type' => null, 'id' => null];
    }

    public function passport(InvestmentProject $investmentProject)
    {
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

        $zip = new ZipArchive();
        $zipFileName = 'passport_' . $investmentProject->id . '_' . time() . '.zip';
        $zipPath = storage_path('app/private/' . $zipFileName);

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Не удалось создать архив.');
        }

        // Add documents
        foreach ($investmentProject->documents as $document) {
            $filePath = Storage::disk('public')->path($document->file_path);
            if (file_exists($filePath)) {
                $extension = pathinfo($document->file_path, PATHINFO_EXTENSION);
                $docName = $document->name;
                if ($extension && !str_ends_with(mb_strtolower($docName), '.' . mb_strtolower($extension))) {
                    $docName .= '.' . $extension;
                }
                $zip->addFile($filePath, 'Документы/' . $docName);
            }
        }

        // Add photos
        foreach ($investmentProject->photos as $index => $photo) {
            $filePath = Storage::disk('public')->path($photo->file_path);
            if (file_exists($filePath)) {
                $extension = pathinfo($photo->file_path, PATHINFO_EXTENSION) ?: 'jpg';
                $photoName = ($index + 1) . '.' . $extension;
                if ($photo->description) {
                    $photoName = ($index + 1) . '_' . preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $photo->description) . '.' . $extension;
                }
                $zip->addFile($filePath, 'Фото/' . $photoName);
            }
        }

        if ($zip->count() === 0) {
            $zip->close();
            @unlink($zipPath);
            abort(404, 'Нет файлов для скачивания.');
        }

        $zip->close();

        $downloadName = 'Паспорт_' . preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $investmentProject->name) . '.zip';

        return response()->download($zipPath, $downloadName)->deleteFileAfterSend(true);
    }

    public function destroy(InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        $investmentProject->delete();

        return redirect()->back()->with('success', 'Проект удален.');
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
            abort(403, 'Вам не разрешено участвовать в этом проекте.');
        }
    }
}
