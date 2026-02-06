<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KpiLog extends Model
{
    protected $fillable = [
        'user_id',
        'project_id',
        'action',
        'score',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class);
    }
}
