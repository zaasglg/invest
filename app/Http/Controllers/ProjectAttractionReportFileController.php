<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectAttractionActivity;
use App\Models\ProjectAttractionReport;
use App\Models\ProjectAttractionReportFile;
use App\Services\PrivateFileService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProjectAttractionReportFileController extends Controller
{
    public function __construct(private readonly PrivateFileService $files) {}

    public function download(InvestmentProject $investmentProject, ProjectAttractionActivity $activity, ProjectAttractionReport $report, ProjectAttractionReportFile $file): StreamedResponse
    {
        $this->authorizeFile($investmentProject, $activity, $report, $file);
        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'download.attraction_report_file',
            category: 'download',
            action: 'Іс-шара нәтижесінің файлы жүктелді: "'.$file->file_name.'"',
            subject: $file,
            properties: ['details' => ['Іс-шара' => $activity->next_action, 'Файл атауы' => $file->file_name]]
        );

        return $this->files->download($file->file_path, $file->file_name);
    }

    public function preview(InvestmentProject $investmentProject, ProjectAttractionActivity $activity, ProjectAttractionReport $report, ProjectAttractionReportFile $file): StreamedResponse
    {
        $this->authorizeFile($investmentProject, $activity, $report, $file);
        abort_unless($file->type === 'photo', 404);

        return $this->files->inline($file->file_path, $file->file_name);
    }

    private function authorizeFile(InvestmentProject $project, ProjectAttractionActivity $activity, ProjectAttractionReport $report, ProjectAttractionReportFile $file): void
    {
        abort_unless((int) $activity->project_id === (int) $project->id
            && (int) $report->activity_id === (int) $activity->id
            && (int) $file->report_id === (int) $report->id, 404);
        abort_unless(request()->user()?->canDownloadFromProject($project), 403, 'Сізде бұл файлды жүктеуге рұқсат жоқ.');
    }
}
