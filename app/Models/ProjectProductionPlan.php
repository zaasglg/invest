<?php

namespace App\Models;

use App\Support\ProductionOptions;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectProductionPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'product_name',
        'planned_quantity',
        'unit',
        'custom_unit',
        'planned_amount',
        'period',
        'legacy_value',
        'sort_order',
    ];

    protected $appends = [
        'unit_label',
        'period_label',
        'is_complete',
    ];

    protected function casts(): array
    {
        return [
            'planned_quantity' => 'decimal:3',
            'planned_amount' => 'decimal:2',
            'sort_order' => 'integer',
        ];
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class, 'project_id');
    }

    public function facts()
    {
        return $this->hasMany(
            ProjectProductionFact::class,
            'production_plan_id'
        )->orderByDesc('period_key');
    }

    public function getUnitLabelAttribute(): string
    {
        return ProductionOptions::unitLabel($this->unit, $this->custom_unit);
    }

    public function getPeriodLabelAttribute(): string
    {
        return ProductionOptions::periodLabel($this->period);
    }

    public function getIsCompleteAttribute(): bool
    {
        return $this->planned_quantity !== null
            && $this->planned_amount !== null
            && ($this->unit !== 'other' || filled($this->custom_unit));
    }
}
