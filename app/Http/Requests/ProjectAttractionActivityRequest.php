<?php

namespace App\Http\Requests;

use App\Models\InvestmentProject;
use App\Services\ProjectAttractionService;
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
            'status' => ['exclude'],
            'attraction_stage' => ['exclude'],
            'event_name' => ['exclude'],
            'event_date' => ['exclude'],
            'result' => ['exclude'],
            'next_action' => ['required', 'string', 'max:1000'],
            'description' => ['nullable', 'string', 'max:10000'],
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
            'next_action' => 'Тақырып',
            'description' => 'Сипаттама',
            'next_action_due_date' => 'Орындалу мерзімі',
            'responsible_id' => 'Жауапты адам',
            'status' => 'Іс-шара мәртебесі',
        ];
    }
}
