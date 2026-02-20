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
        // Get ALL gallery photos grouped by date (newest date first)
        $allGalleryPhotos = $investmentProject->photos()
            ->where('photo_type', 'gallery')
            ->latest('gallery_date')
            ->latest()
            ->get()
            ->map(function ($photo) {
                // Normalize: photos without gallery_date use created_at date
                $photo->gallery_date = $photo->gallery_date
                    ? $photo->gallery_date->toDateString()
                    : $photo->created_at->toDateString();
                return $photo;
            });

        $datedGalleryPhotos = $allGalleryPhotos
            ->groupBy('gallery_date')
            ->sortKeysDesc()
            ->map(function ($photos) {
                return $photos->values();
            })
            ->toArray();

        // mainGallery is empty now since all photos are date-grouped
        $mainGalleryPhotos = collect();

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

        $photoType = $validated['photo_type'] ?? 'gallery';
        // Auto-set gallery_date to today for gallery photos if not specified
        $galleryDate = $validated['gallery_date'] ?? ($photoType === 'gallery' ? now()->toDateString() : null);

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

    public function update(Request $request, InvestmentProject $investmentProject, ProjectPhoto $photo)
    {
        if ($photo->project_id !== $investmentProject->id) {
            abort(404);
        }

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
