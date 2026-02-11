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

        $projects = $projectsQuery->latest()->paginate(15)->withQueryString();

        return Inertia::render('investment-projects/index', [
            'projects' => $projects,
            'regions' => Region::select('id', 'name')->orderBy('name')->get(),
            'projectTypes' => ProjectType::select('id', 'name')->orderBy('name')->get(),
            'users' => User::select('id', 'full_name')->orderBy('full_name')->get(),
            'sezs' => Sez::select('id', 'name')->orderBy('name')->get(),
            'industrialZones' => IndustrialZone::select('id', 'name')->orderBy('name')->get(),
            'subsoilUsers' => SubsoilUser::select('id', 'name')->orderBy('name')->get(),
            'filters' => $filters,
        ]);
    }

    public function create()
    {
        $regions = Region::all();
        $projectTypes = ProjectType::all();
        $users = User::all();
        $sezList = Sez::select('id', 'name', 'region_id', 'location')->get();
        $industrialZones = IndustrialZone::select('id', 'name', 'region_id', 'location')->get();
        $subsoilUsers = SubsoilUser::select('id', 'name', 'region_id', 'location')->get();

        return Inertia::render('investment-projects/create', [
            'regions' => $regions,
            'projectTypes' => $projectTypes,
            'users' => $users,
            'sezList' => $sezList,
            'industrialZones' => $industrialZones,
            'subsoilUsers' => $subsoilUsers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'region_id' => 'required|exists:regions,id',
            'project_type_id' => 'required|exists:project_types,id',
            'sector' => 'required|array',
            'sector.*' => 'string',
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
            'sezs',
            'industrialZones',
            'subsoilUsers',
        ])
            ->withCount('photos')
            ->find($id);

        // Get main gallery photos
        $mainGalleryPhotos = $project ? $project->photos()->mainGallery()->latest()->get() : collect();

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

        return Inertia::render('investment-projects/show', [
            'project' => $project,
            'mainGallery' => $mainGalleryPhotos,
        ]);
    }

    public function edit(InvestmentProject $investmentProject)
    {
        $investmentProject->load(['sezs', 'industrialZones', 'subsoilUsers']);
        $regions = Region::all();
        $projectTypes = ProjectType::all();
        $users = User::all();
        $sezList = Sez::select('id', 'name', 'region_id', 'location')->get();
        $industrialZones = IndustrialZone::select('id', 'name', 'region_id', 'location')->get();
        $subsoilUsers = SubsoilUser::select('id', 'name', 'region_id', 'location')->get();

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
            'projectTypes' => $projectTypes,
            'users' => $users,
            'sezList' => $sezList,
            'industrialZones' => $industrialZones,
            'subsoilUsers' => $subsoilUsers,
        ]);
    }

    public function update(Request $request, InvestmentProject $investmentProject)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'region_id' => 'required|exists:regions,id',
            'project_type_id' => 'required|exists:project_types,id',
            'sector' => 'required|array',
            'sector.*' => 'string',
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
        $investmentProject->delete();

        return redirect()->back()->with('success', 'Проект удален.');
    }
}
