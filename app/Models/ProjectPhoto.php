<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectPhoto extends Model
{
    protected $fillable = [
        'project_id',
        'file_path',
        'gallery_date',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'gallery_date' => 'date',
        ];
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    // Область видимости для основной галереи
    public function scopeMainGallery($query)
    {
        return $query->whereNull('gallery_date');
    }

    // Область видимости для галереи по дате
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('gallery_date', $date);
    }
}
