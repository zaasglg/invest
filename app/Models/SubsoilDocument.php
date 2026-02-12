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
    ];

    public function subsoilUser()
    {
        return $this->belongsTo(SubsoilUser::class);
    }
}
