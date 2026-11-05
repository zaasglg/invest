<?php

namespace App\Http\Requests;

use App\Models\InvestmentProject;
use App\Services\ProjectAttractionService;
use App\Support\ProjectAttractionStages;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProjectAttractionActivityRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('investmentProject');

        return $this->user() && $project instanceof InvestmentProject
            && app(ProjectAttractionService::class)->canManage($this->user(), $project);
    }

    public function rules(): array
    {
        $responsibleIds = app(ProjectAttractionService::class)
            ->responsibleUsers($this->route('investmentProject'), $this->user())
            ->pluck('id')->all();

        return [
            'status' => ['sometimes', 'required', Rule::in(['planned', 'in_progress', 'cancelled'])],
            'attraction_stage' => ['required', 'string', Rule::in(array_keys(ProjectAttractionStages::LABELS))],
            'event_name' => ['nullable', 'required_with:event_date,result', 'string', 'max:1000'],
            'event_date' => ['nullable', 'required_with:event_name,result', 'date', 'before_or_equal:today'],
            'result' => ['nullable', 'required_with:event_name,event_date', 'string', 'max:10000'],
            'next_action' => ['required', 'string', 'max:1000'],
            'next_action_due_date' => ['required', 'date'],
            'responsible_id' => ['required', 'integer', Rule::in($responsibleIds)],
        ];
    }

    public function attributes(): array
    {
        return [
            'attraction_stage' => 'Инвестор тарту кезеңі',
            'event_name' => 'Соңғы өткізілген іс-шара',
            'event_date' => 'Іс-шара күні',
            'result' => 'Іс-шара нәтижесі',
            'next_action' => 'Келесі іс-шара',
            'next_action_due_date' => 'Орындалу мерзімі',
            'responsible_id' => 'Жауапты адам',
            'status' => 'Іс-шара мәртебесі',
        ];
    }
}
