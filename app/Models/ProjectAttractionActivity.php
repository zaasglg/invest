<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectAttractionActivity extends Model
{
    public const STATUSES = ['planned', 'in_progress', 'pending_review', 'completed', 'cancelled'];

    protected $fillable = [
        'attraction_stage',
        'event_name',
        'event_date',
        'result',
        'next_action',
        'next_action_due_date',
        'responsible_id',
        'created_by',
        'status',
        'report_result',
        'reported_at',
        'reported_by',
        'reviewed_at',
        'reviewed_by',
        'reviewer_comment',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date:Y-m-d',
            'next_action_due_date' => 'date:Y-m-d',
            'reported_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function responsible()
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
