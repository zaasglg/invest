<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectAttractionActivity;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProjectAttractionHistoryService
{
    private const LABELS = [
        'attraction.created' => 'Іс-шара берілді',
        'attraction.updated' => 'Іс-шара өзгертілді',
        'attraction.started' => 'Іс-шара орындалуда',
        'attraction.viewed' => 'Орындаушы іс-шараны көрді',
        'attraction.report_submitted' => 'Орындаушы есеп жіберді',
        'attraction.report_approved' => 'Есеп қабылданды',
        'attraction.report_rejected' => 'Есеп толықтыруға қайтарылды',
    ];

    public function __construct(private readonly InvestmentProjectAccessService $access) {}

    public function hydrate(InvestmentProject $project, ?User $viewer): void
    {
        $activities = $project->attractionActivities;
        $logs = $this->logs($project)->whereIn('subject_id', $activities->modelKeys())
            ->with('user:id,full_name')->orderBy('created_at')->orderBy('id')->get()->groupBy('subject_id');

        foreach ($activities as $activity) {
            $activityLogs = $logs->get($activity->id, collect());
            $view = $this->currentView($activity, $activityLogs);
            $activity->setAttribute('events', $this->events($activity, $activityLogs));
            $activity->setAttribute('viewed_at', $view?->created_at?->toISOString());
            $activity->setAttribute('can_mark_viewed', $viewer && ! $view && $this->canRecordView($viewer, $project, $activity));
        }
    }

    public function canRecordView(User $user, InvestmentProject $project, ProjectAttractionActivity $activity): bool
    {
        $user->loadMissing('roleModel');

        return (int) $activity->project_id === (int) $project->id
            && (int) $activity->responsible_id === (int) $user->id
            && $project->status === 'plan' && ! $project->is_archived && ! $project->is_deleted
            && in_array($user->roleModel?->name, ['superadmin', 'invest', 'moderator', 'ispolnitel', 'investor'], true)
            && $this->access->canView($user, $project)
            && (! in_array($user->roleModel?->name, ['ispolnitel', 'investor'], true)
                || $user->isInvolvedInProject($project));
    }

    public function markViewed(User $actor, InvestmentProject $project, ProjectAttractionActivity $activity): array
    {
        return DB::transaction(function () use ($actor, $project, $activity) {
            $project = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless((int) $activity->project_id === (int) $project->id, 404);
            $activity = $project->attractionActivities()->lockForUpdate()->findOrFail($activity->id);
            abort_unless($this->canRecordView($actor, $project, $activity), 403);
            $logs = $this->logs($project)->where('subject_id', $activity->id)->orderBy('id')->get();
            $view = $this->currentView($activity, $logs);

            if (! $view) {
                KpiLog::activity(
                    projectId: $project->id,
                    event: 'attraction.viewed',
                    category: 'project',
                    action: self::LABELS['attraction.viewed'],
                    subject: $activity,
                    actor: $actor
                );
                $view = $this->logs($project)->where('subject_id', $activity->id)
                    ->where('event', 'attraction.viewed')->where('user_id', $actor->id)->latest('id')->firstOrFail();
            }

            return ['event' => $this->event($view), 'viewed_at' => $view->created_at->toISOString()];
        });
    }

    private function logs(InvestmentProject $project): Builder
    {
        return KpiLog::query()->where('project_id', $project->id)
            ->where('subject_type', 'ProjectAttractionActivity')->whereIn('event', array_keys(self::LABELS));
    }

    private function currentView(ProjectAttractionActivity $activity, Collection $logs): ?KpiLog
    {
        $boundary = $logs->filter(function (KpiLog $log) {
            if ($log->event !== 'attraction.updated') {
                return false;
            }
            if (($log->properties['definition_changed'] ?? false) === true) {
                return true;
            }
            $before = $log->properties['before'] ?? [];
            $after = $log->properties['after'] ?? [];
            foreach (['responsible_id', 'next_action', 'description', 'next_action_due_date'] as $field) {
                if (array_key_exists($field, $before) && array_key_exists($field, $after)
                    && (string) $before[$field] !== (string) $after[$field]) {
                    return true;
                }
            }

            return in_array($before['status'] ?? null, ['pending_review', 'completed', 'cancelled'], true)
                && in_array($after['status'] ?? null, ['planned', 'in_progress'], true);
        })->max('id') ?? 0;

        return $logs->first(fn (KpiLog $log) => $log->event === 'attraction.viewed'
            && $log->id > $boundary && (int) $log->user_id === (int) $activity->responsible_id);
    }

    private function events(ProjectAttractionActivity $activity, Collection $logs): array
    {
        $events = $logs->map(fn (KpiLog $log) => [...$this->event($log), '_order' => $log->id]);
        if (! $logs->contains('event', 'attraction.created') && $activity->created_at) {
            $events->push($this->fallback($activity, 'created', $activity->created_at, $activity->creator?->full_name));
        }
        if ($activity->reported_at && ! $this->hasEventAt($logs, 'attraction.report_submitted', $activity->reported_at)) {
            $events->push($this->fallback($activity, 'report_submitted', $activity->reported_at, $activity->reporter?->full_name));
        }
        $reviewType = match ($activity->status) {
            'completed' => 'report_approved',
            'in_progress' => 'report_rejected',
            default => null,
        };
        if ($reviewType && $activity->reviewed_at && ! $this->hasEventAt($logs, 'attraction.'.$reviewType, $activity->reviewed_at)) {
            $events->push($this->fallback($activity, $reviewType, $activity->reviewed_at, $activity->reviewer?->full_name));
        }

        return $events->sortBy([['created_at', 'asc'], ['_order', 'asc']])
            ->map(fn (array $event) => array_diff_key($event, ['_order' => true]))->values()->all();
    }

    private function hasEventAt(Collection $logs, string $type, CarbonInterface $date): bool
    {
        return $logs->contains(fn (KpiLog $log) => $log->event === $type
            && $log->created_at?->greaterThanOrEqualTo($date));
    }

    private function fallback(ProjectAttractionActivity $activity, string $type, CarbonInterface $date, ?string $actor): array
    {
        $comment = match ($type) {
            'report_submitted' => in_array($activity->status, ['pending_review', 'completed'], true) ? $activity->report_result : null,
            'report_approved', 'report_rejected' => $activity->reviewer_comment,
            default => null,
        };

        return [
            'id' => "legacy-{$activity->id}-{$type}",
            'type' => 'attraction.'.$type,
            'label' => self::LABELS['attraction.'.$type],
            'actor_name' => $actor ?: 'Қолданушы көрсетілмеген',
            'created_at' => $date->toISOString(),
            ...is_string($comment) && $comment !== '' ? ['comment' => $comment] : [],
            '_order' => 0,
        ];
    }

    private function event(KpiLog $log): array
    {
        $comment = match ($log->event) {
            'attraction.report_submitted' => $log->properties['details']['Орындалу нәтижесі'] ?? null,
            'attraction.report_approved', 'attraction.report_rejected' => $log->properties['details']['Тексерушінің түсіндірмесі'] ?? null,
            default => null,
        };

        return [
            'id' => (string) $log->id,
            'type' => $log->event,
            'label' => self::LABELS[$log->event],
            'actor_name' => $log->properties['actor_name'] ?? $log->user?->full_name ?? 'Қолданушы көрсетілмеген',
            'created_at' => $log->created_at->toISOString(),
            ...is_string($comment) && $comment !== '' ? ['comment' => $comment] : [],
        ];
    }
}
