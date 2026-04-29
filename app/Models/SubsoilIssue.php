<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsoilIssue extends Model
{
    protected $fillable = [
        'subsoil_user_id',
        'description',
        'severity',
        'status',
        'created_by',
    ];

    public function subsoilUser()
    {
        return $this->belongsTo(SubsoilUser::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
