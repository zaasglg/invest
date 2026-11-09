<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesAttractionUploads;
use App\Models\InvestmentProject;
use App\Models\ProjectAttractionActivity;
use App\Services\ProjectAttractionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportProjectAttractionActivityRequest extends FormRequest
{
    use ValidatesAttractionUploads;

    public function authorize(): bool
    {
        $project = $this->route('investmentProject');
        $activity = $this->route('activity');

        return $this->user() && $project instanceof InvestmentProject
            && $activity instanceof ProjectAttractionActivity
            && app(ProjectAttractionService::class)->canReport($this->user(), $project, $activity);
    }

    public function rules(): array
    {
        return [
            ...$this->uploadRules($this->input('status') === 'pending_review'),
            'status' => ['required', Rule::in(['in_progress', 'pending_review'])],
            'report_result' => ['nullable', 'required_if:status,pending_review', 'string', 'max:10000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'status' => 'Іс-шара мәртебесі',
            'report_result' => 'Орындалу нәтижесі',
            'documents' => 'Құжаттар',
            'photos' => 'Суреттер',
        ];
    }
}
