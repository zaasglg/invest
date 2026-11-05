<?php

namespace App\Support;

final class ProjectAttractionDetailRules
{
    public static function rules(): array
    {
        return [
            'attraction_handover_to_id' => ['exclude_unless:status,plan', 'exclude_unless:attraction_stage,handover', 'nullable', 'required_if:attraction_stage,handover', 'integer', 'exists:users,id'],
            'attraction_decline_reason' => ['exclude_unless:status,plan', 'nullable', 'required_if:attraction_stage,declined', 'string', 'max:10000'],
            'attraction_resume_on' => ['exclude_unless:status,plan', 'nullable', 'required_if:attraction_stage,paused', 'date'],
        ];
    }
}
