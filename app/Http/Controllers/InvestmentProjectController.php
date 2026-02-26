<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\ProjectType;
use App\Models\Region;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Models\User;
use App\Services\GeminiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use PhpOffice\PhpPresentation\PhpPresentation;
use PhpOffice\PhpPresentation\IOFactory;
use PhpOffice\PhpPresentation\Style\Alignment;
use PhpOffice\PhpPresentation\Style\Color;
use PhpOffice\PhpPresentation\Style\Fill;
use PhpOffice\PhpPresentation\Shape\RichText;
use PhpOffice\PhpPresentation\Slide\Background\Color as BackgroundColor;
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
            'infrastructure' => 'nullable|array',
            'infrastructure.gas' => 'nullable|array',
            'infrastructure.water' => 'nullable|array',
            'infrastructure.electricity' => 'nullable|array',
            'infrastructure.land' => 'nullable|array',
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
            'infrastructure' => 'nullable|array',
            'infrastructure.gas' => 'nullable|array',
            'infrastructure.water' => 'nullable|array',
            'infrastructure.electricity' => 'nullable|array',
            'infrastructure.land' => 'nullable|array',
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

    /**
     * Generate a PPTX presentation for all projects in the same region.
     * Each project gets its own slide within a single PPTX file.
     */
    public function presentation(InvestmentProject $investmentProject)
    {
        // Load the single project with all relations
        $investmentProject->load([
            'region', 'projectType', 'creator', 'executors',
            'documents', 'photos', 'issues',
            'tasks.assignee.roleModel', 'sezs', 'industrialZones', 'subsoilUsers',
        ]);

        $pptx = new PhpPresentation();
        $pptx->getDocumentProperties()
            ->setCreator('Turkistan Invest')
            ->setTitle($investmentProject->name)
            ->setSubject('Инвестиционный проект');

        $slide = $pptx->getActiveSlide();
        $this->buildProjectSlide($slide, $investmentProject);

        $projectName = preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $investmentProject->name);
        $fileName = 'pres_' . $investmentProject->id . '_' . time() . '.pptx';
        $filePath = storage_path('app/private/' . $fileName);

        $writer = IOFactory::createWriter($pptx, 'PowerPoint2007');
        $writer->save($filePath);

        $downloadName = 'Презентация_' . $projectName . '.pptx';

        return response()->download($filePath, $downloadName)->deleteFileAfterSend(true);
    }

    public function destroy(InvestmentProject $investmentProject)
    {
        $this->authorizeDistrictAccess($investmentProject);

        $investmentProject->delete();

        return redirect()->back()->with('success', 'Проект удален.');
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
        $projects = InvestmentProject::with([
            'region', 'projectType', 'creator', 'executors',
            'documents', 'photos', 'issues',
            'tasks.assignee.roleModel', 'sezs', 'industrialZones', 'subsoilUsers',
        ])->whereIn('id', $projectIds)->get();

        if ($projects->isEmpty()) {
            abort(404, 'Проекты не найдены.');
        }

        $pptx = new PhpPresentation();
        $pptx->getDocumentProperties()
            ->setCreator('Turkistan Invest')
            ->setTitle('Презентации проектов');

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

        $fileName = 'presentations_' . time() . '.pptx';
        $filePath = storage_path('app/private/' . $fileName);

        $writer = IOFactory::createWriter($pptx, 'PowerPoint2007');
        $writer->save($filePath);

        $downloadName = 'Презентации_проектов.pptx';

        return response()->download($filePath, $downloadName)->deleteFileAfterSend(true);
    }

    /**
     * Generate a PPTX file for a project and return the file path.
     */
    protected function generatePresentationFile(InvestmentProject $project): ?string
    {
        $pptx = new PhpPresentation();
        $pptx->getDocumentProperties()
            ->setCreator('Turkistan Invest')
            ->setTitle($project->name);

        $slide = $pptx->getActiveSlide();
        $this->buildProjectSlide($slide, $project);

        $fileName = 'pres_' . $project->id . '_' . time() . '.pptx';
        $filePath = storage_path('app/private/' . $fileName);

        $writer = IOFactory::createWriter($pptx, 'PowerPoint2007');
        $writer->save($filePath);

        return $filePath;
    }

    /**
     * Build a single slide for a project on the given slide object.
     */
    protected function buildProjectSlide($slide, InvestmentProject $project): void
    {
        $gemini = app(GeminiService::class);

        $white    = 'FFFFFF';
        $darkGray = '333333';
        $midGray  = '666666';
        $blue     = '1565C0';

        $addText = function (RichText $shape, string $text, int $size, string $color, bool $bold = false) {
            $run = $shape->createTextRun($text);
            $run->getFont()
                ->setSize($size)
                ->setColor(new Color('FF' . $color))
                ->setBold($bold)
                ->setName('Arial');
            return $run;
        };

        $fillSlide = function ($slide, string $color) {
            $bg = new BackgroundColor();
            $bg->setColor(new Color('FF' . $color));
            $slide->setBackground($bg);
        };

        $formatCurrency = function ($amount) {
            if (!$amount) return 'Не указано';
            return number_format((float) $amount, 0, ',', ' ') . ' ₸';
        };

        $taskStatusLabels = [
            'new' => 'Новая', 'in_progress' => 'Исполняется',
            'done' => 'Выполнено', 'rejected' => 'Время прошло',
        ];

        $fillSlide($slide, $white);

        $leftX = 15;
        $leftW = 530;
        $rightX = 560;
        $rightW = 385;

        // ── HEADER ───────────────────────────────────────────────
        $logoPath = public_path('apple-touch-icon.png');
        $logoW = 50;
        if (file_exists($logoPath)) {
            try {
                $logoImg = $slide->createDrawingShape();
                $logoImg->setPath($logoPath);
                $logoImg->setWidth(50)->setHeight(50);
                $logoImg->setOffsetX($leftX)->setOffsetY(4);
            } catch (\Exception $e) {}
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
            $addText($companyShape, '(«' . $project->company_name . '»)', 10, $midGray, false);
        }

        $blueLine = $slide->createRichTextShape();
        $blueLine->setHeight(2)->setWidth(930)->setOffsetX($leftX)->setOffsetY(56);
        $blueLine->getFill()->setFillType(Fill::FILL_SOLID)->setStartColor(new Color('FF' . $blue));

        // ── LEFT COLUMN ──────────────────────────────────────────
        $yLeft = 66;

        $sectionHeader = $slide->createRichTextShape();
        $sectionHeader->setHeight(24)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
        $addText($sectionHeader, 'ЖОБА ТУРАЛЫ', 12, $blue, true);
        $yLeft += 26;

        $infoItems = [
            ['Жоба бастамашысы', $project->company_name ?? 'Көрсетілмеген'],
            ['Құны', $formatCurrency($project->total_investment)],
            ['Саласы', $project->projectType?->name ?? 'Көрсетілмеген'],
            ['Жобаның қуаттылығы', $project->description ? $gemini->summarizeForSlide($project->description, 120) : '—'],
            ['Жұмыс орындары', '—'],
            ['Орналасқан жері', $project->region?->name ?? 'Көрсетілмеген'],
            ['Іске қосу мерзімі', ($project->start_date?->format('Y') ?? '—') . '-' . ($project->end_date?->format('Y') ?? '—')],
        ];

        // Approximate characters per line at font size 11 within $leftW
        $charsPerLine = 55;
        $singleLineH = 18; // height of one line of text at size 11

        foreach ($infoItems as $item) {
            $fullText = $item[0] . ': ' . $item[1];
            $lines = max(1, (int) ceil(mb_strlen($fullText) / $charsPerLine));
            $rowH = $lines * $singleLineH + 4;

            $row = $slide->createRichTextShape();
            $row->setHeight($rowH)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
            $row->getActiveParagraph()->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);
            $row->setAutoFit(RichText::AUTOFIT_NORMAL);
            $addText($row, $item[0] . ': ', 11, $darkGray, true);
            $addText($row, $item[1], 11, $darkGray, false);
            $yLeft += $rowH;
        }

        $yLeft += 8;

        // ── АҒЫМДАҒЫ ЖАҒДАЙЫ ────────────────────────────────────
        $roadmapHeader = $slide->createRichTextShape();
        $roadmapHeader->setHeight(20)->setWidth($leftW)->setOffsetX($leftX)->setOffsetY($yLeft);
        $addText($roadmapHeader, 'АҒЫМДАҒЫ ЖАҒДАЙЫ', 11, $blue, true);
        $yLeft += 22;

        $tasks = $project->tasks->sortBy('created_at')
            ->reject(fn($task) => in_array($task->status, ['done', 'new']));

        // Calculate available space: leave ~160px for stats + description at bottom
        $maxTasksY = 520;
        // Auto-scale: use smaller font if many tasks
        $taskCount = $tasks->count();
        $taskFontSize = $taskCount > 6 ? 8 : 9;
        $assigneeFontSize = $taskCount > 6 ? 7 : 8;
        $taskRowH = $taskCount > 6 ? 14 : 16;
        $assigneeRowH = $taskCount > 6 ? 12 : 14;
        $taskGap = $taskCount > 6 ? 2 : 3;

        if ($tasks->isNotEmpty()) {
            foreach ($tasks as $task) {
                if ($yLeft > $maxTasksY) {
                    // Show "and X more..." label
                    $remaining = $tasks->count() - $tasks->search($task);
                    if ($remaining > 0) {
                        $moreShape = $slide->createRichTextShape();
                        $moreShape->setHeight(14)->setWidth($leftW - 10)->setOffsetX($leftX + 5)->setOffsetY($yLeft);
                        $addText($moreShape, "... тағы {$remaining} тапсырма", $taskFontSize, $midGray, true);
                        $yLeft += 16;
                    }
                    break;
                }

                $statusLabel = $taskStatusLabels[$task->status] ?? $task->status;
                $statusColor = match($task->status) {
                    'done' => '2E7D32',
                    'in_progress' => 'F57C00',
                    'rejected' => 'C62828',
                    default => $midGray,
                };

                $taskText = '• ' . $task->title;

                $taskRow = $slide->createRichTextShape();
                $taskRow->setHeight($taskRowH)->setWidth($leftW - 10)->setOffsetX($leftX + 5)->setOffsetY($yLeft);
                $taskRow->getActiveParagraph()->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                    ->setVertical(Alignment::VERTICAL_TOP);
                $taskRow->setAutoFit(RichText::AUTOFIT_NORMAL);
                $addText($taskRow, $taskText, $taskFontSize, $darkGray, false);
                $addText($taskRow, '  [' . $statusLabel . ']', $taskFontSize - 1, $statusColor, true);
                $yLeft += $taskRowH;

                if ($task->assignee) {
                    $assigneeText = $task->assignee->position ?? 'Орындаушы';
                    $assigneeName = $task->assignee->full_name ?? $task->assignee->name;

                    $assigneeRow = $slide->createRichTextShape();
                    $assigneeRow->setHeight($assigneeRowH)->setWidth($leftW - 20)->setOffsetX($leftX + 15)->setOffsetY($yLeft);
                    $assigneeRow->getActiveParagraph()->getAlignment()
                        ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                        ->setVertical(Alignment::VERTICAL_CENTER);
                    $addText($assigneeRow, $assigneeText . ' (' . $assigneeName . ')', $assigneeFontSize, $blue, false);
                    $yLeft += $assigneeRowH;
                }

                $yLeft += $taskGap;
            }
        } else {
            $noTasks = $slide->createRichTextShape();
            $noTasks->setHeight(16)->setWidth($leftW)->setOffsetX($leftX + 5)->setOffsetY($yLeft);
            $addText($noTasks, 'Дорожная карта бос', 9, $midGray, false);
            $yLeft += 16;
        }

        // ── RIGHT COLUMN ─────────────────────────────────────────
        $yRight = 66;

        $imgMaxW = $rightW;
        $imgMaxH = 280;

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
                        $newW = (int)($origW * $ratio);
                        $newH = (int)($origH * $ratio);
                        $imgShape->setWidth($newW)->setHeight($newH);
                        $imgShape->setOffsetX($rightX + (int)(($imgMaxW - $newW) / 2));
                        $imgShape->setOffsetY($yRight);
                        $actualImgH = $newH;
                    }
                } catch (\Exception $e) {}
            }
        }

        $yRight += max($actualImgH + 15, 200);

        // ── ИНФРАҚҰРЫЛЫМ ҚАЖЕТТІЛІГІ ─────────────────────────────
        $infrastructure = $project->infrastructure;
        $hasInfra = $infrastructure && is_array($infrastructure) &&
            collect($infrastructure)->contains(fn($v) => is_array($v) && ($v['needed'] ?? false));

        if ($hasInfra) {
            $infraHeader = $slide->createRichTextShape();
            $infraHeader->setHeight(24)->setWidth($rightW)->setOffsetX($rightX)->setOffsetY($yRight);
            $addText($infraHeader, 'ИНФРАҚҰРЫЛЫМ ҚАЖЕТТІЛІГІ', 12, $blue, true);
            $yRight += 28;

            $infraItems = [
                ['key' => 'gas',         'label' => 'Газ'],
                ['key' => 'water',       'label' => 'Су'],
                ['key' => 'electricity', 'label' => 'Электр қуаты'],
                ['key' => 'land',        'label' => 'Жер телімі'],
            ];

            $colCount = count($infraItems);
            $colW = (int)(($rightW - ($colCount - 1) * 4) / $colCount);
            $colX = $rightX;

            foreach ($infraItems as $item) {
                $val = $infrastructure[$item['key']] ?? null;
                $isNeeded = is_array($val) && ($val['needed'] ?? false);

                $headerCell = $slide->createRichTextShape();
                $headerCell->setHeight(24)->setWidth($colW)->setOffsetX($colX)->setOffsetY($yRight);
                $headerCell->getFill()->setFillType(Fill::FILL_SOLID)->setStartColor(new Color('FFE3F2FD'));
                $headerCell->getActiveParagraph()->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);
                $addText($headerCell, $item['label'], 10, $blue, true);

                $valueCell = $slide->createRichTextShape();
                $valueCell->setHeight(24)->setWidth($colW)->setOffsetX($colX)->setOffsetY($yRight + 24);
                $valueCell->getFill()->setFillType(Fill::FILL_SOLID)->setStartColor(new Color('FFFAFAFA'));
                $valueCell->getActiveParagraph()->getAlignment()
                    ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                    ->setVertical(Alignment::VERTICAL_CENTER);

                if ($isNeeded) {
                    $addText($valueCell, ($val['capacity'] ?? '') ?: 'Қажет', 10, $darkGray, false);
                } else {
                    $addText($valueCell, '—', 10, $midGray, false);
                }

                $colX += $colW + 4;
            }

            $yRight += 52; // header row (24) + value row (24) + spacing (4)
        }

        // ── AI STATISTICS — task analysis ─────────────────────
        $statsY = max($yLeft, $yRight) + 6;

        $totalTasks = $project->tasks->count();
        $doneTasks = $project->tasks->where('status', 'done')->count();
        $inProgressTasks = $project->tasks->where('status', 'in_progress')->count();
        $newTasks = $project->tasks->where('status', 'new')->count();
        $rejectedTasks = $project->tasks->where('status', 'rejected')->count();
        $donePercent = $totalTasks > 0 ? round(($doneTasks / $totalTasks) * 100) : 0;

        // Try AI-powered analysis first
        $aiStats = $gemini->generateProjectStats([
            'project_name' => $project->name,
            'total_tasks' => $totalTasks,
            'done' => $doneTasks,
            'in_progress' => $inProgressTasks,
            'new' => $newTasks,
            'rejected' => $rejectedTasks,
            'done_percent' => $donePercent,
            'total_investment' => $project->total_investment,
            'start_date' => $project->start_date?->format('Y-m-d'),
            'end_date' => $project->end_date?->format('Y-m-d'),
        ]);

        // Fallback to manual stats if AI is unavailable
        if (! $aiStats) {
            $statusText = $donePercent >= 70 ? 'жақсы' : ($donePercent >= 40 ? 'орташа' : 'нашар');
            $aiStats = "Жалпы тапсырмалар: {$totalTasks} | Орындалды: {$doneTasks} ({$donePercent}%) | Орындалмады: " . ($totalTasks - $doneTasks) . " | Жағдайы: {$statusText}";
        }

        if ($statsY < 640 && $totalTasks > 0) {
            $statsHeader = $slide->createRichTextShape();
            $statsHeader->setHeight(18)->setWidth(930)->setOffsetX($leftX)->setOffsetY($statsY);
            $addText($statsHeader, 'ЖОБА СТАТИСТИКАСЫ (AI)', 10, $blue, true);
            $statsY += 20;

            $statsShape = $slide->createRichTextShape();
            $statsShape->setHeight(36)->setWidth(930)->setOffsetX($leftX)->setOffsetY($statsY);
            $statsShape->getActiveParagraph()->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);
            $statsShape->setAutoFit(RichText::AUTOFIT_NORMAL);
            $addText($statsShape, $aiStats, 9, $darkGray, false);
            $statsY += 40;
        }

        // ── DESCRIPTION — full-width at bottom ───────────────────
        $descY = $statsY + 4;
        if ($project->description && $descY < 680) {
            // Limit description length based on remaining space
            $remainingH = 720 - $descY - 10;
            $maxDescChars = $remainingH > 60 ? 300 : ($remainingH > 30 ? 150 : 80);
            $descText = $gemini->summarizeForSlide($project->description, $maxDescChars);
            $descH = min($remainingH, max(30, (int)(mb_strlen($descText) * 0.4)));

            $descShape = $slide->createRichTextShape();
            $descShape->setHeight($descH)->setWidth(930)->setOffsetX($leftX)->setOffsetY($descY);
            $descShape->getActiveParagraph()->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_TOP);
            $descShape->setAutoFit(RichText::AUTOFIT_NORMAL);
            $addText($descShape, 'СИПАТТАМАСЫ: ', 9, $blue, true);
            $addText($descShape, $descText, 9, $darkGray, false);
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
            abort(403, 'Вам не разрешено участвовать в этом проекте.');
        }
    }
}
