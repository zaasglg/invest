<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectDocument extends Model
{
    protected $fillable = [
        'project_id',
        'name',
        'file_path',
        'type',
    ];

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }
}
