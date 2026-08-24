<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectType extends Model
{
    protected $fillable = [
        'name',
    ];

    public function projects()
    {
        return $this->belongsToMany(
            InvestmentProject::class,
            'investment_project_project_type'
        )->withTimestamps();
    }

    public function primaryProjects()
    {
        return $this->hasMany(InvestmentProject::class);
    }

    public function applications()
    {
        return $this->belongsToMany(
            InvestmentApplication::class,
            'investment_application_project_type'
        )->withTimestamps();
    }
}
