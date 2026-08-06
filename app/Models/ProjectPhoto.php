<?php

namespace App\Models;

use App\Models\Concerns\HasLogicalDeletion;
use Illuminate\Database\Eloquent\Model;

class ProjectPhoto extends Model
{
    use HasLogicalDeletion;

    protected $fillable = [
        'project_id',
        'file_path',
        'photo_type',
        'gallery_date',
        'description',
        'uploaded_by',
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

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // Область видимости для основной галереи
    public function scopeMainGallery($query)
    {
        return $query->whereNull('gallery_date')->where('photo_type', 'gallery');
    }

    // Область видимости для рендеров (будущий вид)
    public function scopeRenderPhotos($query)
    {
        return $query->where('photo_type', 'render');
    }

    // Область видимости для галереи по дате
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('gallery_date', $date);
    }
}
