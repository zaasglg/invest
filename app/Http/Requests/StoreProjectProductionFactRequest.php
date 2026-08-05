<?php

namespace App\Http\Requests;

use App\Models\ProjectProductionPlan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreProjectProductionFactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, array<int, string>> */
    public function rules(): array
    {
        return [
            'production_plan_id' => ['required', 'integer'],
            'reporting_year' => ['nullable', 'integer', 'between:2000,2100'],
            'period_number' => ['nullable', 'integer', 'between:1,12'],
            'actual_quantity' => ['required', 'numeric', 'min:0'],
            'actual_amount' => ['required', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $project = $this->route('investmentProject');
                $plan = $project?->productionPlans()
                    ->find($this->integer('production_plan_id'));

                if (! $plan) {
                    $validator->errors()->add(
                        'production_plan_id',
                        'Өндіріс жоспары табылмады.'
                    );

                    return;
                }

                if (! $plan->is_complete) {
                    $validator->errors()->add(
                        'production_plan_id',
                        'Алдымен бұрынғы қуаттылық дерегін толық өндіріс жоспарына ауыстырыңыз.'
                    );
                }

                $this->validatePeriod($validator, $plan);
            },
        ];
    }

    private function validatePeriod(
        Validator $validator,
        ProjectProductionPlan $plan
    ): void {
        if ($plan->period !== 'project' && ! $this->filled('reporting_year')) {
            $validator->errors()->add(
                'reporting_year',
                'Есептік жылды таңдаңыз.'
            );
        }

        if ($plan->period === 'month') {
            $month = $this->integer('period_number');
            if ($month < 1 || $month > 12) {
                $validator->errors()->add(
                    'period_number',
                    'Есептік айды таңдаңыз.'
                );
            }
        }

        if ($plan->period === 'quarter') {
            $quarter = $this->integer('period_number');
            if ($quarter < 1 || $quarter > 4) {
                $validator->errors()->add(
                    'period_number',
                    'Есептік тоқсанды таңдаңыз.'
                );
            }
        }
    }
}
