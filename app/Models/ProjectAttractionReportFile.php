<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectAttractionReportFile extends Model
{
    protected $fillable = ['file_path', 'file_name', 'type'];

    protected $hidden = ['file_path'];

    public function report()
    {
        return $this->belongsTo(ProjectAttractionReport::class, 'report_id');
    }
}
