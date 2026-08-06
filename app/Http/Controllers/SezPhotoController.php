<?php

namespace App\Http\Controllers;

use App\Models\Sez;
use App\Models\SezPhoto;
use App\Services\SectorActivityLogService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SezPhotoController extends Controller
{
    public function index(Sez $sez)
    {
        $mainGalleryPhotos = $sez->photos()
            ->mainGallery()
            ->latest()
            ->get()
            ->map(function ($photo) {
                $photo->gallery_date = null;

                return $photo;
            });

        $datedGalleryPhotos = $sez->photos()
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

        $renderPhotos = $sez->photos()
            ->renderPhotos()
            ->latest()
            ->get();

        $isSuperadmin = request()->user()?->roleModel?->name === 'superadmin';
        $deletedPhotos = $isSuperadmin
            ? $sez->allPhotos()
                ->onlyDeleted()
                ->with('deleter:id,full_name')
                ->latest('deleted_at')
                ->get()
            : collect();

        return Inertia::render('sezs/gallery', [
            'sez' => $sez->load('region'),
            'mainGallery' => $mainGalleryPhotos,
            'datedGallery' => $datedGalleryPhotos,
            'renderPhotos' => $renderPhotos,
            'canViewDeleted' => $isSuperadmin,
            'deletedPhotos' => $deletedPhotos,
        ]);
    }

    public function store(
        Request $request,
        Sez $sez,
        SectorActivityLogService $activity
    ) {
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

        $photoIds = [];
        foreach ($validated['photos'] as $photo) {
            $path = $photo->store('sez-photos/'.$sez->id, 'public');

            $createdPhoto = SezPhoto::create([
                'sez_id' => $sez->id,
                'file_path' => $path,
                'photo_type' => $photoType,
                'gallery_date' => $galleryDate,
                'description' => $validated['description'] ?? null,
            ]);
            $photoIds[] = $createdPhoto->id;
        }

        $activity->record(
            auditable: $sez,
            event: 'photo.uploaded',
            category: 'photo',
            action: 'Фотосуреттер қосылды ('.count($photoIds).' фото)',
            properties: [
                'subject_ids' => $photoIds,
                'details' => [
                    'Фото саны' => count($photoIds),
                    'Фото түрі' => $photoType,
                    'Галерея күні' => $galleryDate,
                    'Сипаттама' => $validated['description'] ?? null,
                ],
            ]
        );

        return redirect()->back()->with('success', 'Фотосуреттер жүктелді.');
    }

    public function update(
        Request $request,
        Sez $sez,
        SezPhoto $photo,
        SectorActivityLogService $activity
    ) {
        $this->ensureCanManagePhotos($request);

        if ($photo->sez_id !== $sez->id) {
            abort(404);
        }

        abort_if($photo->is_deleted, 404);

        $validated = $request->validate([
            'gallery_date' => 'nullable|date',
            'description' => 'nullable|string|max:500',
        ]);

        $before = $photo->only(['gallery_date', 'description']);
        $photo->update($validated);

        $activity->record(
            auditable: $sez,
            event: 'photo.updated',
            category: 'photo',
            action: 'Фото мәліметтері жаңартылды',
            subject: $photo,
            properties: [
                'changes' => $activity->changes(
                    $before,
                    $photo->fresh()->only(['gallery_date', 'description']),
                    [
                        'gallery_date' => 'Галерея күні',
                        'description' => 'Сипаттама',
                    ]
                ),
            ]
        );

        return redirect()->back()->with('success', 'Фото жаңартылды.');
    }

    public function destroy(
        Request $request,
        Sez $sez,
        $photo,
        SectorActivityLogService $activity
    ) {
        $this->ensureCanManagePhotos($request);

        $photoModel = SezPhoto::where('sez_id', $sez->id)
            ->findOrFail($photo);

        abort_if($photoModel->is_deleted, 404);
        $photoModel->markAsDeletedBy($request->user());

        $activity->record(
            auditable: $sez,
            event: 'photo.deleted',
            category: 'photo',
            action: 'Фото өшірілген суреттер бөліміне жіберілді',
            subject: $photoModel,
            properties: [
                'details' => [
                    'Фото түрі' => $photoModel->photo_type,
                    'Галерея күні' => $photoModel->gallery_date,
                    'Сипаттама' => $photoModel->description,
                ],
            ]
        );

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
