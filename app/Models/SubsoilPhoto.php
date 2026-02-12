<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsoilPhoto extends Model
{
    protected $fillable = [
        'subsoil_user_id',
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

    public function subsoilUser()
    {
        return $this->belongsTo(SubsoilUser::class);
    }

    public function scopeMainGallery($query)
    {
        return $query->whereNull('gallery_date')->where('photo_type', 'gallery');
    }

    public function scopeRenderPhotos($query)
    {
        return $query->where('photo_type', 'render');
    }

    public function scopeForDate($query, $date)
    {
        return $query->whereDate('gallery_date', $date);
    }
}
