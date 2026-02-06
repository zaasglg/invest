<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectIssue extends Model
{
    protected $fillable = [
        'project_id',
        'title',
        'description',
        'category',
        'severity',
        'status',
    ];

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }
}
