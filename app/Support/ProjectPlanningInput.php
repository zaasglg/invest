<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class ProjectPlanningInput
{
    public static function prepare(Request $request): void
    {
        if (! $request->has('investment_amount_type')) {
            $request->merge([
                'investment_amount_type' => $request->input('status') === 'plan'
                    && blank($request->input('total_investment')) ? 'unknown' : 'exact',
            ]);
        }

        if ($request->input('investment_amount_type') === 'unknown') {
            $request->merge(['total_investment' => null]);
        }
    }

    public static function rules(Request $request): array
    {
        $planned = $request->input('status') === 'plan';

        return [
            'company_id' => [Rule::requiredIf(! $planned), 'nullable', 'integer', 'exists:companies,id'],
            'project_type_ids' => [$planned ? 'nullable' : 'required_without:project_type_id', 'array', $planned ? 'min:0' : 'min:1'],
            'investment_amount_type' => ['required', Rule::in($planned ? ['exact', 'estimated', 'unknown'] : ['exact', 'estimated'])],
            'total_investment' => [Rule::requiredIf($request->input('investment_amount_type') !== 'unknown'), 'nullable', 'numeric', 'min:0'],
        ];
    }
}
