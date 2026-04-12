<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromZonePhoto extends Model
{
    protected $fillable = [
        'prom_zone_id',
        'file_path',
        'photo_type',
        'gallery_date',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'gallery_date' => 'date',
        ];
    }

    public function promZone()
    {
        return $this->belongsTo(PromZone::class);
    }

    public function scopeMainGallery($query)
    {
        return $query->whereNull('gallery_date')->where('photo_type', 'gallery');
    }

    public function scopeRenderPhotos($query)
    {
        return $query->where('photo_type', 'render');
    }
}
