<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\ProjectPhoto;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Storage;

class ProjectPhotoController extends Controller
{
    public function index(InvestmentProject $investmentProject)
    {
        $mainGalleryPhotos = $investmentProject->photos()
            ->mainGallery()
            ->latest()
            ->get()
            ->map(function ($photo) {
                $photo->gallery_date = null;
                return $photo;
            });

        $datedGalleryPhotos = $investmentProject->photos()
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

        $renderPhotos = $investmentProject->photos()
            ->renderPhotos()
            ->latest()
            ->get();

        return Inertia::render('investment-projects/gallery', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'mainGallery' => $mainGalleryPhotos,
            'datedGallery' => $datedGalleryPhotos,
            'renderPhotos' => $renderPhotos,
        ]);
    }

    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $validated = $request->validate([
            'photos' => 'required|array|min:1',
            'photos.*' => 'required|image|max:5120', // 5MB per image
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
            'photo_type' => 'nullable|string|in:gallery,render',
        ]);

        $galleryDate = $validated['gallery_date'] ?? null;
        $photoType = $validated['photo_type'] ?? 'gallery';

        foreach ($validated['photos'] as $photo) {
            $path = $photo->store('project-photos/' . $investmentProject->id, 'public');

            ProjectPhoto::create([
                'project_id' => $investmentProject->id,
                'file_path' => $path,
                'photo_type' => $photoType,
                'gallery_date' => $galleryDate,
                'description' => $validated['description'] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Фотографии загружены.');
    }

    public function update(Request $request, ProjectPhoto $photo)
    {
        $validated = $request->validate([
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        $photo->update($validated);

        return redirect()->back()->with('success', 'Фото обновлено.');
    }

    public function destroy(Request $request, InvestmentProject $investmentProject, $photo)
    {
        // Find the photo by ID
        $photoModel = ProjectPhoto::where('project_id', $investmentProject->id)
            ->findOrFail($photo);

        // Delete file from storage
        if (Storage::disk('public')->exists($photoModel->file_path)) {
            Storage::disk('public')->delete($photoModel->file_path);
        }

        // Delete photo record
        $photoModel->delete();

        return redirect()->back()->with('success', 'Фото удалено.');
    }
}
