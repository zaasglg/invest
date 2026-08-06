<?php

namespace App\Http\Controllers;

use App\Models\SubsoilPhoto;
use App\Models\SubsoilUser;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubsoilPhotoController extends Controller
{
    public function index(SubsoilUser $subsoilUser)
    {
        $mainGalleryPhotos = $subsoilUser->photos()
            ->mainGallery()
            ->latest()
            ->get()
            ->map(function ($photo) {
                $photo->gallery_date = null;

                return $photo;
            });

        $datedGalleryPhotos = $subsoilUser->photos()
            ->where('photo_type', 'gallery')
            ->whereNotNull('gallery_date')
            ->latest('gallery_date')
            ->latest()
            ->get()
            ->map(function ($photo) {
                $photo->gallery_date = $photo->gallery_date->toDateString();

                return $photo;
            })
            ->groupBy('gallery_date')
            ->map(function ($photos) {
                return $photos->values();
            })
            ->toArray();

        $renderPhotos = $subsoilUser->photos()
            ->renderPhotos()
            ->latest()
            ->get();

        $isSuperadmin = request()->user()?->roleModel?->name === 'superadmin';
        $deletedPhotos = $isSuperadmin
            ? $subsoilUser->allPhotos()
                ->onlyDeleted()
                ->with('deleter:id,full_name')
                ->latest('deleted_at')
                ->get()
            : collect();

        return Inertia::render('subsoil-users/gallery', [
            'subsoilUser' => $subsoilUser->load('region'),
            'mainGallery' => $mainGalleryPhotos,
            'datedGallery' => $datedGalleryPhotos,
            'renderPhotos' => $renderPhotos,
            'canViewDeleted' => $isSuperadmin,
            'deletedPhotos' => $deletedPhotos,
        ]);
    }

    public function store(Request $request, SubsoilUser $subsoilUser)
    {
        $this->ensureCanManagePhotos($request);

        $validated = $request->validate([
            'photos' => 'required|array|min:1',
            'photos.*' => 'required|image|max:5120',
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
            'photo_type' => 'nullable|string|in:gallery,render',
        ]);

        $galleryDate = $validated['gallery_date'] ?? null;
        $photoType = $validated['photo_type'] ?? 'gallery';

        foreach ($validated['photos'] as $photo) {
            $path = $photo->store('subsoil-photos/'.$subsoilUser->id, 'public');

            SubsoilPhoto::create([
                'subsoil_user_id' => $subsoilUser->id,
                'file_path' => $path,
                'photo_type' => $photoType,
                'gallery_date' => $galleryDate,
                'description' => $validated['description'] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Фотосуреттер жүктелді.');
    }

    public function update(Request $request, SubsoilUser $subsoilUser, SubsoilPhoto $photo)
    {
        $this->ensureCanManagePhotos($request);

        if ($photo->subsoil_user_id !== $subsoilUser->id) {
            abort(404);
        }

        abort_if($photo->is_deleted, 404);

        $validated = $request->validate([
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        $photo->update($validated);

        return redirect()->back()->with('success', 'Фото жаңартылды.');
    }

    public function destroy(Request $request, SubsoilUser $subsoilUser, $photo)
    {
        $this->ensureCanManagePhotos($request);

        $photoModel = SubsoilPhoto::where('subsoil_user_id', $subsoilUser->id)
            ->findOrFail($photo);

        abort_if($photoModel->is_deleted, 404);
        $photoModel->markAsDeletedBy($request->user());

        return redirect()->back()->with(
            'success',
            'Фото өшірілген суреттер бөліміне жіберілді.'
        );
    }

    private function ensureCanManagePhotos(Request $request): void
    {
        $roleName = $request->user()?->roleModel?->name;

        if (! in_array($roleName, ['superadmin', 'invest'], true)) {
            abort(403, 'Тек super admin және invest фото өзгерте алады.');
        }
    }
}
