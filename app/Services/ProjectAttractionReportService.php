<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\ProjectAttractionActivity;
use App\Models\ProjectAttractionReport;
use App\Models\ProjectDocument;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ProjectAttractionReportService
{
    public function __construct(private readonly PrivateFileService $files) {}

    public function hydrateReports(InvestmentProject $project, ?User $viewer): void
    {
        $project->loadMissing('attractionActivities.reports.files', 'attractionActivities.reports.submitter:id,full_name', 'attractionActivities.reports.reviewer:id,full_name');
        $canDownload = $viewer?->canDownloadFromProject($project) ?? false;
        foreach ($project->attractionActivities as $activity) {
            foreach ($activity->reports as $report) {
                foreach ($report->files as $file) {
                    $parameters = [$project, $activity, $report, $file];
                    $file->setAttribute('download_url', $canDownload
                        ? route('investment-projects.attraction-activities.files.download', $parameters, false) : null);
                    $file->setAttribute('preview_url', $canDownload && $file->type === 'photo'
                        ? route('investment-projects.attraction-activities.files.preview', $parameters, false) : null);
                }
            }
            $activity->setRelation('latestReport', $activity->reports->first());
        }
    }

    /** Roll back stored files together with a failed database transaction. */
    public function transaction(Closure $callback): mixed
    {
        $paths = [];
        try {
            return DB::transaction(function () use ($callback, &$paths) {
                return $callback($paths);
            });
        } catch (Throwable $exception) {
            foreach ($paths as $path) {
                $this->files->delete($path);
            }
            throw $exception;
        }
    }

    public function submit(
        InvestmentProject $project,
        ProjectAttractionActivity $activity,
        User $actor,
        array $data,
        bool $alreadyCompleted,
        array &$paths
    ): ProjectAttractionReport {
        $documents = $data['documents'] ?? [];
        $photos = $data['photos'] ?? [];
        if ($documents === []) {
            throw ValidationException::withMessages(['documents' => 'Іс-шараның орындалуын растайтын кемінде бір құжат жүктеңіз.']);
        }
        app(CompletionWorkflowService::class)->ensureUploadBudget($documents, $photos);
        $report = $activity->reports()->create([
            'result' => $data['report_result'],
            'status' => $alreadyCompleted ? 'approved' : 'pending',
            'submitted_by' => $actor->id,
            'recorded_as_completed' => $alreadyCompleted,
        ]);
        foreach (['document' => $documents, 'photo' => $photos] as $type => $uploads) {
            foreach ($uploads as $file) {
                $path = $file->store('attraction-reports/'.$project->id.'/'.$report->id, 'local');
                if (! is_string($path)) {
                    throw new RuntimeException('The attraction report file could not be stored.');
                }
                $paths[] = $path;
                $report->files()->create([
                    'file_path' => $path,
                    'file_name' => $file->getClientOriginalName(),
                    'type' => $type,
                ]);
            }
        }
        if ($alreadyCompleted) {
            $this->publish($project, $activity, $report, $paths);
        }

        return $report;
    }

    public function review(
        InvestmentProject $project,
        ProjectAttractionActivity $activity,
        User $actor,
        array $data,
        array &$paths
    ): void {
        $report = $activity->reports()->where('status', 'pending')->lockForUpdate()->first();
        // Legacy submissions have no report record or attachments yet.
        if (! $report) {
            if (! empty($data['report_id'])) {
                throw ValidationException::withMessages(['report_id' => 'Есеп өзгерді. Іс-шараны қайта ашып тексеріңіз.']);
            }

            return;
        }
        if ((int) ($data['report_id'] ?? 0) !== (int) $report->id) {
            throw ValidationException::withMessages(['report_id' => 'Есеп өзгерді. Іс-шараны қайта ашып тексеріңіз.']);
        }
        $report->update([
            'status' => $data['decision'],
            'reviewed_by' => $actor->id,
            'reviewed_at' => $activity->reviewed_at,
            'reviewer_comment' => $data['reviewer_comment'] ?? null,
        ]);
        if ($data['decision'] === 'approved') {
            $this->publish($project, $activity, $report, $paths);
        }
    }

    private function publish(
        InvestmentProject $project,
        ProjectAttractionActivity $activity,
        ProjectAttractionReport $report,
        array &$paths
    ): void {
        foreach ($report->files()->get() as $file) {
            $extension = pathinfo($file->file_name, PATHINFO_EXTENSION);
            $path = 'project-documents/'.$project->id.'/'.Str::uuid().($extension !== '' ? '.'.$extension : '');
            if (! $this->files->copyToPrivate($file->file_path, $path)) {
                throw new RuntimeException("Attraction report file [{$file->id}] could not be copied.");
            }
            $paths[] = $path;
            ProjectDocument::create([
                'project_id' => $project->id,
                'name' => $file->file_name,
                'file_path' => $path,
                'type' => $extension ?: $file->type,
                'is_completed' => true,
                'uploaded_by' => $report->submitted_by,
                'source' => 'attraction_activity',
                'source_attraction_activity_id' => $activity->id,
                'source_attraction_report_id' => $report->id,
                'recorded_as_completed' => $report->recorded_as_completed,
                'source_task_title' => $activity->next_action,
                'task_assigned_at' => $activity->created_at,
                'task_assigned_by' => $activity->created_by,
                'submitted_at' => $report->created_at,
                // Historical entry is explicitly marked on its report; do not
                // fabricate a review by either the creator or the assignee.
                'approved_by' => $report->reviewed_by,
                'approved_at' => $report->reviewed_at,
            ]);
        }
    }
}
