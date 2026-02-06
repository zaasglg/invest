<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectTask extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'description',
        'assigned_to',
        'due_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
        ];
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function assignee()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
