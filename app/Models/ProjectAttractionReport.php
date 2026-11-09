<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectAttractionReport extends Model
{
    protected $fillable = [
        'result', 'status', 'submitted_by', 'reviewed_by', 'reviewed_at',
        'reviewer_comment', 'recorded_as_completed',
    ];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime', 'recorded_as_completed' => 'boolean'];
    }

    public function activity()
    {
        return $this->belongsTo(ProjectAttractionActivity::class, 'activity_id');
    }

    public function files()
    {
        return $this->hasMany(ProjectAttractionReportFile::class, 'report_id')->orderBy('id');
    }

    public function submitter()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
