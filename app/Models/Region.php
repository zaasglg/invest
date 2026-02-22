<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Region extends Model
{
    public const ICON_OPTIONS = [
        'factory' => 'Завод',
        'plant' => 'Промышленный комплекс',
        'energy' => 'Энергетика',
        'house' => 'Инфраструктура',
        'office' => 'Здание',
        'lab' => 'Лаборатория',
    ];

    protected $fillable = [
        'parent_id',
        'name',
        'color',
        'icon',
        'area',
        'type',
        'subtype',
        'geometry',
    ];

    protected function casts(): array
    {
        return [
            'type' => 'string',
            'color' => 'string',
            'icon' => 'string',
            'area' => 'decimal:2',
            'geometry' => 'array',
        ];
    }

    // Родительский регион (область для района)
    public function parent()
    {
        return $this->belongsTo(Region::class, 'parent_id');
    }

    // Дочерние регионы (районы для области)
    public function children()
    {
        return $this->hasMany(Region::class, 'parent_id');
    }

    // Проверка, является ли регион областью
    public function isOblast(): bool
    {
        return $this->type === 'oblast';
    }

    // Проверка, является ли регион районом
    public function isDistrict(): bool
    {
        return $this->type === 'district';
    }

    // Проверка, является ли регион городом
    public function isCity(): bool
    {
        return $this->type === 'district' && $this->subtype === 'city';
    }

    public function sezs()
    {
        return $this->hasMany(Sez::class);
    }

    public function industrialZones()
    {
        return $this->hasMany(IndustrialZone::class);
    }

    public function subsoilUsers()
    {
        return $this->hasMany(SubsoilUser::class);
    }
}
