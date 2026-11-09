<?php

namespace App\Support;

use App\Models\InvestmentProject;
use Illuminate\Validation\ValidationException;

final class ProjectAttractionStages
{
    public const LABELS = [
        'potential' => 'Әлеуетті инвестициялық жоба',
        'negotiation' => 'Инвестормен келіссөздер',
        'conditions' => 'Іске асыру шарттарын пысықтау',
        'land_infrastructure' => 'Жер учаскесі мен инфрақұрылымды іріктеу',
        'agreements' => 'Уағдаластықтарға қол жеткізу',
        'handover' => 'Сүйемелдеуге беру',
        'declined' => 'Инвестордың бас тартуы',
        'paused' => 'Уақытша тоқтату',
    ];

    public static function assertAvailableForActivity(InvestmentProject $project, string $stage): void
    {
        if ($project->attraction_handover_requested_at && ! $project->attraction_handover_accepted_at
            && $project->attraction_stage === 'handover' && $stage !== 'handover') {
            throw ValidationException::withMessages([
                'attraction_stage' => 'Сүйемелдеуге беру сұрауын өзгерту үшін жоба деректерін өзгерту бөлімін пайдаланыңыз.',
            ]);
        }

        $missing = match ($stage) {
            'handover' => $project->attraction_stage !== 'handover'
                || ! $project->attraction_handover_to_id
                || ! $project->attraction_handover_requested_at,
            'declined' => blank($project->attraction_decline_reason),
            'paused' => ! $project->attraction_resume_on,
            default => false,
        };

        if ($missing) {
            throw ValidationException::withMessages([
                'attraction_stage' => 'Осы кезең үшін жоба деректерін өзгерту бөлімінде қабылдаушыны, бас тарту себебін немесе қайта байланысу күнін толтырыңыз.',
            ]);
        }
    }

    public static function canRestore(InvestmentProject $project, string $stage): bool
    {
        return match ($stage) {
            'handover' => $project->attraction_handover_to_id !== null && $project->attraction_handover_requested_at !== null,
            'declined' => filled($project->attraction_decline_reason),
            'paused' => $project->attraction_resume_on !== null,
            default => array_key_exists($stage, self::LABELS),
        };
    }
}
