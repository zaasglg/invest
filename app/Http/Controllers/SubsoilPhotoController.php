<?php

namespace App\Http\Controllers;

use App\Models\SubsoilPhoto;
use App\Models\SubsoilUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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

        return Inertia::render('subsoil-users/gallery', [
            'subsoilUser' => $subsoilUser->load('region'),
            'mainGallery' => $mainGalleryPhotos,
            'datedGallery' => $datedGalleryPhotos,
            'renderPhotos' => $renderPhotos,
        ]);
    }

    public function store(Request $request, SubsoilUser $subsoilUser)
    {
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
            $path = $photo->store('subsoil-photos/' . $subsoilUser->id, 'public');

            SubsoilPhoto::create([
                'subsoil_user_id' => $subsoilUser->id,
                'file_path' => $path,
                'photo_type' => $photoType,
                'gallery_date' => $galleryDate,
                'description' => $validated['description'] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Фотографии загружены.');
    }

    public function update(Request $request, SubsoilPhoto $photo)
    {
        $validated = $request->validate([
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        $photo->update($validated);

        return redirect()->back()->with('success', 'Фото обновлено.');
    }

    public function destroy(SubsoilUser $subsoilUser, $photo)
    {
        $photoModel = SubsoilPhoto::where('subsoil_user_id', $subsoilUser->id)
            ->findOrFail($photo);

        if (Storage::disk('public')->exists($photoModel->file_path)) {
            Storage::disk('public')->delete($photoModel->file_path);
        }

        $photoModel->delete();

        return redirect()->back()->with('success', 'Фото удалено.');
    }
}
