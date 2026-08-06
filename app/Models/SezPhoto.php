<?php

namespace App\Models;

use App\Models\Concerns\HasLogicalDeletion;
use Illuminate\Database\Eloquent\Model;

class SezPhoto extends Model
{
    use HasLogicalDeletion;

    protected $fillable = [
        'sez_id',
        'file_path',
        'photo_type',
        'gallery_date',
        'description',
        'is_deleted',
        'deleted_by',
        'deleted_at',
    ];

    protected function casts(): array
    {
        return [
            'gallery_date' => 'date',
            'is_deleted' => 'boolean',
            'deleted_at' => 'datetime',
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
