<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectPhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ProjectPhotoController extends Controller
{
    public function index(InvestmentProject $investmentProject)
    {
        $user = Auth::user();

        // Ispolnitel who is not involved cannot access gallery page
        if ($user->roleModel?->name === 'ispolnitel' && ! $user->isInvolvedInProject($investmentProject)) {
            abort(403, 'Сіз бұл жобаға қатыспайсыз.');
        }

        $canDownload = $user->canDownloadFromProject($investmentProject);

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
            'canDownload' => $canDownload,
            'ispolnitelCanWrite' => $this->ispolnitelCanWrite($user, $investmentProject),
        ]);
    }

    public function download(InvestmentProject $investmentProject, ProjectPhoto $photo)
    {
        if ($photo->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();

        if (! $user->canDownloadFromProject($investmentProject)) {
            abort(403, 'Сіздің бұл жобаның фотосуреттеріне қол жеткізуіңіз жоқ.');
        }

        if (! Storage::disk('public')->exists($photo->file_path)) {
            abort(404, 'Файл табылмады.');
        }

        return Storage::disk('public')->download($photo->file_path);
    }

    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $user = Auth::user();

        $this->ensureCanWritePhotos($user, $investmentProject);

        $validated = $request->validate([
            'photos' => 'required|array|min:1',
            'photos.*' => 'required|image|max:5120', // 5MB per image
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
            'photo_type' => 'nullable|string|in:gallery,render',
        ]);

        $photoType = $validated['photo_type'] ?? 'gallery';
        $galleryDate = null;

        if ($photoType === 'gallery') {
            $galleryDate = $this->isSuperAdmin($user)
                ? ($validated['gallery_date'] ?? now()->toDateString())
                : now()->toDateString();
        }

        foreach ($validated['photos'] as $photo) {
            $path = $photo->store('project-photos/'.$investmentProject->id, 'public');

            ProjectPhoto::create([
                'project_id' => $investmentProject->id,
                'file_path' => $path,
                'photo_type' => $photoType,
                'gallery_date' => $galleryDate,
                'description' => $validated['description'] ?? null,
            ]);
        }

        KpiLog::log($investmentProject->id, 'Фотосуреттер жүктелді (' . count($validated['photos']) . ' фото)');

        return redirect()->back()->with('success', 'Фотосуреттер жүктелді.');
    }

    public function update(Request $request, InvestmentProject $investmentProject, ProjectPhoto $photo)
    {
        if ($photo->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();

        $this->ensureCanWritePhotos($user, $investmentProject);

        $validated = $request->validate([
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        $payload = [];

        if ($request->exists('description')) {
            $payload['description'] = $validated['description'] ?? null;
        }

        if ($request->exists('gallery_date')) {
            if (! $this->isSuperAdmin($user)) {
                abort(403, 'Тек супер админ фото күнін өзгерте алады.');
            }

            $payload['gallery_date'] = $validated['gallery_date'] ?? null;
        }

        if (! empty($payload)) {
            $photo->update($payload);
        }

        KpiLog::log($investmentProject->id, 'Фото мәліметтері жаңартылды');

        return redirect()->back()->with('success', 'Фото жаңартылды.');
    }

    public function destroy(Request $request, InvestmentProject $investmentProject, $photo)
    {
        $user = Auth::user();

        $this->ensureCanWritePhotos($user, $investmentProject);

        // Ispolnitel cannot delete photos
        if ($user->roleModel?->name === 'ispolnitel') {
            abort(403, 'Сізге фотоны жоюға рұқсат жоқ.');
        }

        // Find the photo by ID
        $photoModel = ProjectPhoto::where('project_id', $investmentProject->id)
            ->findOrFail($photo);

        // Delete file from storage
        if (Storage::disk('public')->exists($photoModel->file_path)) {
            Storage::disk('public')->delete($photoModel->file_path);
        }

        // Delete photo record
        $photoModel->delete();

        KpiLog::log($investmentProject->id, 'Фото жойылды');

        return redirect()->back()->with('success', 'Фото жойылды.');
    }

    private function ispolnitelCanWrite($user, InvestmentProject $project): bool
    {
        if ($user->roleModel?->name !== 'ispolnitel') {
            return false;
        }

        if (! $user->isInvolvedInProject($project)) {
            return false;
        }

        // Both district and oblast ispolnitel have the same write permissions
        return true;
    }

    private function ensureCanWritePhotos($user, InvestmentProject $project): void
    {
        if ($user->roleModel?->name === 'ispolnitel' && ! $this->ispolnitelCanWrite($user, $project)) {
            abort(403, 'Сіз бұл жобаға фото жүктей алмайсыз.');
        }
    }

    private function isSuperAdmin($user): bool
    {
        return $user->roleModel?->name === 'superadmin';
    }
}
