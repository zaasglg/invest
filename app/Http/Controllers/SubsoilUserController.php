<?php

namespace App\Http\Controllers;

use App\Models\Region;
use App\Models\SubsoilUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use ZipArchive;

class SubsoilUserController extends Controller
{
    public function index(Request $request)
    {
        $query = SubsoilUser::with('region');

        $user = auth()->user();
        if ($user && $user->isDistrictScoped()) {
            $query->where('region_id', $user->region_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('bin', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('region_id')) {
            $query->where('region_id', $request->region_id);
        }

        if ($request->filled('license_status')) {
            $query->where('license_status', $request->license_status);
        }

        if ($request->filled('mineral_type')) {
            $query->where('mineral_type', 'like', '%' . $request->mineral_type . '%');
        }

        $subsoilUsers = $query->latest()->paginate(15)->withQueryString();

        $regionsQuery = Region::query();
        if ($user && $user->isDistrictScoped()) {
            $regionsQuery->where('id', $user->region_id);
        }

        // Get distinct mineral types for filter dropdown
        $mineralTypes = SubsoilUser::distinct()->pluck('mineral_type')->filter()->sort()->values();

        return Inertia::render('subsoil-users/index', [
            'subsoilUsers' => $subsoilUsers,
            'regions' => $regionsQuery->orderBy('name')->get(),
            'mineralTypes' => $mineralTypes,
            'filters' => $request->only(['search', 'region_id', 'license_status', 'mineral_type']),
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

    public function store(Request $request)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bin' => 'required|string|max:20',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int)$value !== (int)$user->region_id) {
                        $fail('Вы можете только добавить Недропользователь в свой район.');
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

        SubsoilUser::create($validated);

        return redirect()->route('subsoil-users.index')->with('success', 'Недропользователь создан.');
    }

    public function show(SubsoilUser $subsoilUser)
    {
        $subsoilUser->load(['region', 'issues', 'documents'])
            ->loadCount('photos');

        $mainGalleryPhotos = $subsoilUser->photos()
            ->where('photo_type', 'gallery')
            ->latest()
            ->get();
        $renderPhotos = $subsoilUser->photos()->renderPhotos()->latest()->get();

        return Inertia::render('subsoil-users/show', [
            'subsoilUser' => $subsoilUser,
            'mainGallery' => $mainGalleryPhotos,
            'renderPhotos' => $renderPhotos,
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

    public function update(Request $request, SubsoilUser $subsoilUser)
    {
        $user = auth()->user();
        $isDistrictScoped = $user && $user->isDistrictScoped();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'bin' => 'required|string|max:20',
            'region_id' => [
                'required',
                'exists:regions,id',
                function ($attribute, $value, $fail) use ($user, $isDistrictScoped) {
                    if ($isDistrictScoped && (int)$value !== (int)$user->region_id) {
                        $fail('Вы можете только изменить Недропользователь в своем районе.');
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

        $subsoilUser->update($validated);

        return redirect()->route('subsoil-users.index')->with('success', 'Недропользователь обновлен.');
    }

    public function passport(SubsoilUser $subsoilUser)
    {
        $subsoilUser->load(['region', 'documents', 'photos', 'issues']);

        $zip = new ZipArchive();
        $zipFileName = 'subsoil_passport_' . $subsoilUser->id . '_' . time() . '.zip';
        $path = storage_path('app/private/' . $zipFileName);

        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Не удалось создать архив.');
        }

        // Add documents
        foreach ($subsoilUser->documents as $document) {
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
        foreach ($subsoilUser->photos as $index => $photo) {
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
            @unlink($path);
            abort(404, 'Нет файлов для скачивания.');
        }

        $zip->close();

        $downloadName = 'Паспорт_Недропользователь_' . preg_replace('/[^\p{L}\p{N}\s\-_]/u', '', $subsoilUser->name) . '.zip';

        return response()->download($path, $downloadName)->deleteFileAfterSend(true);
    }

    public function destroy(SubsoilUser $subsoilUser)
    {
        $subsoilUser->delete();

        return redirect()->back()->with('success', 'Недропользователь удален.');
    }
}
