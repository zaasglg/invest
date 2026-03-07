<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubsoilTask extends Model
{
    protected $fillable = [
        'subsoil_user_id',
        'title',
        'description',
        'assigned_to',
        'created_by',
        'start_date',
        'due_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
        ];
    }

    public function subsoilUser()
    {
        return $this->belongsTo(SubsoilUser::class);
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
