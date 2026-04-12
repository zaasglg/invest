<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\IndustrialZonePhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class IndustrialZonePhotoController extends Controller
{
    public function index(IndustrialZone $industrialZone)
    {
        $mainGalleryPhotos = $industrialZone->photos()
            ->mainGallery()
            ->latest()
            ->get()
            ->map(function ($photo) {
                $photo->gallery_date = null;

                return $photo;
            });

        $datedGalleryPhotos = $industrialZone->photos()
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

        $renderPhotos = $industrialZone->photos()
            ->renderPhotos()
            ->latest()
            ->get();

        return Inertia::render('industrial-zones/gallery', [
            'industrialZone' => $industrialZone->load('region'),
            'mainGallery' => $mainGalleryPhotos,
            'datedGallery' => $datedGalleryPhotos,
            'renderPhotos' => $renderPhotos,
        ]);
    }

    public function store(Request $request, IndustrialZone $industrialZone)
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
            $path = $photo->store('industrial-zone-photos/'.$industrialZone->id, 'public');

            IndustrialZonePhoto::create([
                'industrial_zone_id' => $industrialZone->id,
                'file_path' => $path,
                'photo_type' => $photoType,
                'gallery_date' => $galleryDate,
                'description' => $validated['description'] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Фотосуреттер жүктелді.');
    }

    public function update(Request $request, IndustrialZone $industrialZone, IndustrialZonePhoto $photo)
    {
        $this->ensureCanManagePhotos($request);

        if ($photo->industrial_zone_id !== $industrialZone->id) {
            abort(404);
        }

        $validated = $request->validate([
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        $photo->update($validated);

        return redirect()->back()->with('success', 'Фото жаңартылды.');
    }

    public function destroy(Request $request, IndustrialZone $industrialZone, $photo)
    {
        $this->ensureCanManagePhotos($request);

        $photoModel = IndustrialZonePhoto::where('industrial_zone_id', $industrialZone->id)
            ->findOrFail($photo);

        if (Storage::disk('public')->exists($photoModel->file_path)) {
            Storage::disk('public')->delete($photoModel->file_path);
        }

        $photoModel->delete();

        return redirect()->back()->with('success', 'Фото жойылды.');
    }

    private function ensureCanManagePhotos(Request $request): void
    {
        $roleName = $request->user()?->roleModel?->name;

        if (! in_array($roleName, ['superadmin', 'invest'], true)) {
            abort(403, 'Тек super admin және invest фото өзгерте алады.');
        }
    }
}
