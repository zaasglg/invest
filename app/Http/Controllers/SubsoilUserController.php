<?php

namespace App\Http\Controllers;

use App\Models\Region;
use App\Models\SubsoilUser;
use App\Models\User;
use App\Services\PrivateFileService;
use App\Services\SectorActivityLogService;
use App\Services\SubsoilIndexAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use ZipArchive;

class SubsoilUserController extends Controller
{
    public function __construct(
        private readonly PrivateFileService $files
    ) {}

    public function index(
        Request $request,
        SubsoilIndexAnalyticsService $analytics
    ) {
        $filters = $request->only([
            'search',
            'region_id',
            'license_status',
            'mineral_type',
        ]);
        $data = $analytics->build($request->user(), $filters);

        return Inertia::render('subsoil-users/index', [
            'subsoilUsers' => $data['subsoilUsers'],
            'summary' => $data['summary'],
            'regions' => $data['regions'],
            'mineralTypes' => $data['mineralTypes'],
            'filters' => $filters,
        ]);
    }

    public function create()
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        if ($isDistrictScoped) {
            $userRegion = Region::find($user->region_id);
            $regionIds = [$user->region_id];
            if ($userRegion && $userRegion->parent_id) {
                $regionIds[] = $userRegion->parent_id;
            }
            $regionsQuery->whereIn('id', $regionIds);
        }

        return Inertia::render('subsoil-users/create', [
            'regions' => $regionsQuery->get(),
            'isDistrictScoped' => $isDistrictScoped,
            'userRegionId' => $isDistrictScoped ? $user->region_id : null,
        ]);
    }

    public function store(
        Request $request,
        SectorActivityLogService $activity
    ) {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bin' => 'nullable|string|max:20',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int) $value !== (int) $user->region_id) {
                        $fail('Жер қойнауын пайдаланушыны тек өз ауданыңызға қосуға болады.');
                    }
                },
            ],
            'mineral_type' => 'required|string|max:255',
            'total_area' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:5000',
            'license_status' => 'required|in:active,expired,suspended,illegal',
            'license_start' => 'nullable|date',
            'license_end' => 'nullable|date|after_or_equal:license_start',
            'location' => 'nullable|array',
        ]);
        $validated['bin'] = $validated['bin'] ?? 'БСН жоқ';

        $subsoilUser = SubsoilUser::create($validated);

        $activity->record(
            auditable: $subsoilUser,
            event: 'entity.created',
            category: 'entity',
            action: 'Жер қойнауын пайдаланушы құрылды',
            subject: $subsoilUser,
            properties: [
                'details' => $activity->entitySnapshot($subsoilUser),
            ]
        );

        return redirect()->route('subsoil-users.index')->with('success', 'Жер қойнауын пайдаланушы құрылды.');
    }

    public function show(SubsoilUser $subsoilUser)
    {
        $subsoilUser->load(['region', 'deleter:id,full_name', 'issues', 'issues.creator:id,full_name', 'documents', 'tasks.assignee', 'tasks.completions.submitter', 'tasks.completions.files'])
            ->loadCount('photos');

        $mainGalleryPhotos = $subsoilUser->photos()
            ->where('photo_type', 'gallery')
            ->latest()
            ->get();
        $renderPhotos = $subsoilUser->photos()->renderPhotos()->latest()->get();

        $user = request()->user();

        $assignableUsersQuery = User::select('id', 'full_name', 'role_id', 'baskarma_type', 'region_id', 'position')
            ->with('roleModel:id,name,display_name')
            ->whereHas('roleModel', function ($q) {
                $q->where('name', 'ispolnitel');
            })
            ->orderBy('full_name');

        if ($user && $user->isDistrictScoped()) {
            $assignableUsersQuery->where(function ($query) use ($user) {
                $query->where('region_id', $user->region_id)
                    ->orWhereIn('baskarma_type', ['oblast', 'additional']);
            });
        }

        return Inertia::render('subsoil-users/show', [
            'subsoilUser' => $subsoilUser,
            'mainGallery' => $mainGalleryPhotos,
            'renderPhotos' => $renderPhotos,
            'assignableUsers' => $assignableUsersQuery->get(),
        ]);
    }

    public function edit(SubsoilUser $subsoilUser)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $regionsQuery = Region::query();
        if ($isDistrictScoped) {
            $userRegion = Region::find($user->region_id);
            $regionIds = [$user->region_id];
            if ($userRegion && $userRegion->parent_id) {
                $regionIds[] = $userRegion->parent_id;
            }
            $regionsQuery->whereIn('id', $regionIds);
        }

        return Inertia::render('subsoil-users/edit', [
            'subsoilUser' => $subsoilUser->load('region'),
            'regions' => $regionsQuery->get(),
            'isDistrictScoped' => $isDistrictScoped,
        ]);
    }

    public function update(
        Request $request,
        SubsoilUser $subsoilUser,
        SectorActivityLogService $activity
    ) {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bin' => 'nullable|string|max:20',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int) $value !== (int) $user->region_id) {
                        $fail('Жер қойнауын пайдаланушыны тек өз ауданыңызда өзгертуге болады.');
                    }
                },
            ],
            'mineral_type' => 'required|string|max:255',
            'total_area' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:5000',
            'license_status' => 'required|in:active,expired,suspended,illegal',
            'license_start' => 'nullable|date',
            'license_end' => 'nullable|date|after_or_equal:license_start',
            'location' => 'nullable|array',
            'return_to' => 'nullable|string',
        ]);
        $validated['bin'] = $validated['bin'] ?? 'БСН жоқ';

        $returnTo = $validated['return_to'] ?? '';
        unset($validated['return_to']);

        $before = $activity->entitySnapshot($subsoilUser);
        $subsoilUser->update($validated);
        $subsoilUser->refresh();

        $activity->record(
            auditable: $subsoilUser,
            event: 'entity.updated',
            category: 'entity',
            action: 'Жер қойнауын пайдаланушы мәліметтері жаңартылды',
            subject: $subsoilUser,
            properties: [
                'changes' => $activity->changes(
                    $before,
                    $activity->entitySnapshot($subsoilUser),
                    $activity->entityLabels($subsoilUser)
                ),
            ]
        );

        if (! empty($returnTo) && $this->isValidReturnUrl($returnTo)) {
            return redirect($returnTo)->with('success', 'Жер қойнауын пайдаланушы жаңартылды.');
        }

        return redirect()->route('subsoil-users.show', $subsoilUser->id)->with('success', 'Жер қойнауын пайдаланушы жаңартылды.');
    }

    public function passport(
        SubsoilUser $subsoilUser,
        SectorActivityLogService $activity
    ) {
        $subsoilUser->load(['region', 'documents', 'photos', 'issues']);

        $zip = new ZipArchive;
        $zipFileName = 'subsoil_passport_'.$subsoilUser->id.'_'.time().'.zip';
        $path = storage_path('app/private/'.$zipFileName);

        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Мұрағатты құру мүмкін болмады.');
        }

        // Add documents split by completion status
        foreach ($subsoilUser->documents as $document) {
            $filePath = $this->files->path($document->file_path);
            if ($filePath !== null) {
                $docName = $this->files->archiveName(
                    $document->name,
                    $document->file_path
                );
                $folder = $document->is_completed
                    ? 'Құжаттар/Тапсырма бойынша орындалған құжаттар'
                    : 'Құжаттар/Жүктелген құжаттар';
                $zip->addFile($filePath, $folder.'/'.$docName);
            }
        }

        // Add photos split by type (gallery vs render)
        $galleryIndex = 0;
        $renderIndex = 0;
        foreach ($subsoilUser->photos as $photo) {
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
            @unlink($path);

            return redirect()->route('subsoil-users.show', $subsoilUser->id)
                ->with('error', 'Жүктеуге файлдар жоқ.');
        }

        $zip->close();

        $activity->record(
            auditable: $subsoilUser,
            event: 'passport.downloaded',
            category: 'download',
            action: 'Объект паспорты жүктелді',
            subject: $subsoilUser,
            properties: [
                'details' => [
                    'Архивтегі файл саны' => $galleryIndex + $renderIndex
                        + $subsoilUser->documents->count(),
                ],
            ]
        );

        $downloadName = 'Төлқұжат_Жер_қойнауын_пайдаланушы_'.preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $subsoilUser->name).'.zip';

        return response()->download($path, $downloadName)->deleteFileAfterSend(true);
    }

    public function deleted(Request $request)
    {
        $this->ensureSuperadmin($request);

        $search = trim((string) $request->input('search', ''));
        $query = SubsoilUser::onlyDeleted()
            ->with(['region:id,name', 'deleter:id,full_name']);

        if ($search !== '') {
            $query->where(function ($subsoilQuery) use ($search) {
                $subsoilQuery
                    ->whereLike('name', "%{$search}%")
                    ->orWhereLike('bin', "%{$search}%");
            });
        }

        $items = $query
            ->latest('deleted_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (SubsoilUser $subsoilUser) => [
                ...$subsoilUser->toArray(),
                'show_url' => route(
                    'subsoil-users.show',
                    $subsoilUser->id,
                    false
                ),
                'restore_url' => route(
                    'subsoil-users.restore-deleted',
                    $subsoilUser->id,
                    false
                ),
            ]);

        return Inertia::render('deleted-entities/index', [
            'items' => $items,
            'filters' => ['search' => $search],
            'config' => [
                'title' => 'Өшірілген жер қойнауын пайдаланушылар',
                'entityLabel' => 'Жер қойнауын пайдаланушы',
                'indexUrl' => route('subsoil-users.index', absolute: false),
                'deletedUrl' => route(
                    'subsoil-users.deleted',
                    absolute: false
                ),
            ],
        ]);
    }

    public function restoreDeleted(
        Request $request,
        int $subsoilUserId,
        SectorActivityLogService $activity
    ) {
        $this->ensureSuperadmin($request);

        $subsoilUser = SubsoilUser::onlyDeleted()
            ->findOrFail($subsoilUserId);
        $subsoilUser->restoreFromDeletion();

        $activity->record(
            auditable: $subsoilUser,
            event: 'entity.restored',
            category: 'entity',
            action: 'Жер қойнауын пайдаланушы қалпына келтірілді',
            subject: $subsoilUser
        );

        return redirect()->route('subsoil-users.deleted')->with(
            'success',
            'Жер қойнауын пайдаланушы қалпына келтірілді.'
        );
    }

    public function destroy(
        Request $request,
        SubsoilUser $subsoilUser,
        SectorActivityLogService $activity
    ) {
        abort_if($subsoilUser->is_deleted, 404);
        $subsoilUser->markAsDeletedBy($request->user());

        $activity->record(
            auditable: $subsoilUser,
            event: 'entity.deleted',
            category: 'entity',
            action: 'Жер қойнауын пайдаланушы өшірілген нысандар бөліміне жіберілді',
            subject: $subsoilUser,
            properties: [
                'details' => [
                    'Өшірілген уақыт' => $subsoilUser->deleted_at,
                ],
            ]
        );

        return redirect()->route('subsoil-users.index')->with(
            'success',
            'Жер қойнауын пайдаланушы өшірілген нысандар бөліміне жіберілді.'
        );
    }

    private function ensureSuperadmin(Request $request): void
    {
        abort_unless(
            $request->user()?->roleModel?->name === 'superadmin',
            403,
            'Өшірілген жер қойнауын пайдаланушыларды тек супер әкімші көре алады.'
        );
    }

    /**
     * Validate that the return URL is a safe local URL.
     */
    private function isValidReturnUrl(string $url): bool
    {
        if (str_starts_with($url, '/') && ! str_starts_with($url, '//')) {
            return true;
        }

        $appUrl = config('app.url');
        if ($appUrl && str_starts_with($url, $appUrl)) {
            return true;
        }

        return false;
    }
}
