<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsoilDocument extends Model
{
    protected $fillable = [
        'subsoil_user_id',
        'name',
        'file_path',
        'type',
        'is_completed',
    ];

    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
        ];
    }

    public function subsoilUser()
    {
        return $this->belongsTo(SubsoilUser::class);
    }
}
