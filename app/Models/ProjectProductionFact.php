<?php

namespace App\Models;

use App\Support\ProductionOptions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectProductionFact extends Model
{
    use HasFactory;

    protected $fillable = [
        'production_plan_id',
        'period_key',
        'reporting_year',
        'period_number',
        'actual_quantity',
        'actual_amount',
        'notes',
        'reported_by',
    ];

    protected $appends = ['period_label'];

    protected function casts(): array
    {
        return [
            'reporting_year' => 'integer',
            'period_number' => 'integer',
            'actual_quantity' => 'decimal:3',
            'actual_amount' => 'decimal:2',
        ];
    }

    public function plan()
    {
        return $this->belongsTo(
            ProjectProductionPlan::class,
            'production_plan_id'
        );
    }

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function getPeriodLabelAttribute(): string
    {
        if ($this->period_key === 'project') {
            $period = 'project';
        } elseif (str_contains($this->period_key, '-Q')) {
            $period = 'quarter';
        } elseif (preg_match('/^\d{4}-\d{2}$/', $this->period_key)) {
            $period = 'month';
        } else {
            $period = 'year';
        }

        return ProductionOptions::factPeriodLabel(
            $period,
            $this->reporting_year,
            $this->period_number
        );
    }
}
