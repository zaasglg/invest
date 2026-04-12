<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SezPhoto extends Model
{
    protected $fillable = [
        'sez_id',
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

    public function sez()
    {
        return $this->belongsTo(Sez::class);
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
