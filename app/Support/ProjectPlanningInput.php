<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

final class ProjectPlanningInput
{
    public static function rules(Request $request): array
    {
        $planned = $request->input('status') === 'plan';

        return [
            'company_id' => [Rule::requiredIf(! $planned), 'nullable', 'integer', 'exists:companies,id'],
            'project_type_ids' => [$planned ? 'nullable' : 'required_without:project_type_id', 'array', $planned ? 'min:0' : 'min:1'],
            'total_investment' => ['required', 'numeric', 'min:0'],
        ];
    }
}
