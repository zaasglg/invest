<?php

namespace App\Console\Commands;

use App\Models\InvestmentProject;
use App\Models\ProjectAttractionActivity;
use App\Models\TaskNotification;
use App\Services\InvestmentProjectAccessService;
use App\Services\ProjectAttractionService;
use Illuminate\Console\Command;

class NotifyAttractionDeadlines extends Command
{
    protected $signature = 'attraction:notify-deadlines';

    protected $description = 'Инвестор тарту іс-шаралары мен қайта байланысу мерзімін еске салу';

    public function handle(ProjectAttractionService $activities, InvestmentProjectAccessService $access): int
    {
        ProjectAttractionActivity::with(['project', 'responsible.roleModel'])
            ->whereHas('project', fn ($query) => $query->active()->where('status', 'plan')->where('attraction_stage', '!=', 'declined'))
            ->whereIn('status', ['planned', 'in_progress'])
            ->whereDate('next_action_due_date', '<=', today()->addDay())->chunkById(100, function ($rows) use ($activities) {
                foreach ($rows as $activity) {
                    if (! $activity->responsible || ! $activities->canReport($activity->responsible, $activity->project, $activity)) {
                        continue;
                    }
                    $type = $activity->next_action_due_date->lt(today()) ? 'attraction_overdue' : 'attraction_due_soon';
                    TaskNotification::firstOrCreate([
                        'dedupe_key' => "{$type}:{$activity->id}:{$activity->responsible_id}:".today()->toDateString(),
                    ], [
                        'user_id' => $activity->responsible_id,
                        'project_id' => $activity->project_id,
                        'attraction_activity_id' => $activity->id,
                        'type' => $type,
                        'message' => ($type === 'attraction_overdue' ? 'Іс-шараның мерзімі өтті: ' : 'Іс-шараның мерзімі жақындады: ')
                            .$activity->next_action.' (Жоба: '.$activity->project->name.'). Мерзімі: '.$activity->next_action_due_date->format('d.m.Y'),
                        'action_url' => route('investment-projects.show', $activity->project_id, false).'#project-attraction',
                        'action_label' => 'Іс-шараға өту',
                    ]);
                }
            });

        InvestmentProject::active()->where('status', 'plan')->where('attraction_stage', 'paused')
            ->whereDate('attraction_resume_on', '<=', today()->addDay())->with(['curators.roleModel', 'creator.roleModel'])
            ->chunkById(100, function ($projects) use ($access) {
                foreach ($projects as $project) {
                    $recipients = $project->curators->push($project->creator)->filter()->unique('id');
                    foreach ($recipients as $recipient) {
                        if (! $access->canManage($recipient, $project)) {
                            continue;
                        }
                        TaskNotification::firstOrCreate([
                            'dedupe_key' => "attraction_resume:{$project->id}:{$recipient->id}:".today()->toDateString(),
                        ], [
                            'user_id' => $recipient->id, 'project_id' => $project->id,
                            'type' => 'attraction_resume',
                            'message' => 'Инвестормен қайта байланысу: '.$project->name.'. Мерзімі: '.$project->attraction_resume_on->format('d.m.Y'),
                            'action_url' => route('investment-projects.show', $project, false).'#project-attraction',
                            'action_label' => 'Жобаға өту',
                        ]);
                    }
                }
            });

        return self::SUCCESS;
    }
}
