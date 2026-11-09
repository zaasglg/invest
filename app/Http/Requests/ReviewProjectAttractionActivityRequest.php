<?php

namespace App\Http\Requests;

use App\Models\InvestmentProject;
use App\Models\ProjectAttractionActivity;
use App\Services\ProjectAttractionService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewProjectAttractionActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('investmentProject');
        $activity = $this->route('activity');

        return $this->user() && $project instanceof InvestmentProject
            && $activity instanceof ProjectAttractionActivity
            && app(ProjectAttractionService::class)->canReview($this->user(), $project, $activity);
    }

    public function rules(): array
    {
        return [
            'report_id' => ['nullable', 'integer'],
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'reviewer_comment' => ['nullable', 'required_if:decision,rejected', 'string', 'max:5000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'decision' => 'Тексеру шешімі',
            'reviewer_comment' => 'Тексерушінің түсіндірмесі',
        ];
    }
}
