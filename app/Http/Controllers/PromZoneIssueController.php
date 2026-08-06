<?php

namespace App\Http\Controllers;

use App\Http\Requests\StandardZoneIssueRequest;
use App\Models\PromZone;
use App\Models\PromZoneIssue;
use App\Services\SectorActivityLogService;
use App\Services\StandardIssueWorkflowService;
use Inertia\Inertia;

class PromZoneIssueController extends Controller
{
    public function __construct(
        private readonly StandardIssueWorkflowService $workflow,
        private readonly SectorActivityLogService $activity
    ) {}

    public function index(PromZone $promZone)
    {
        $issues = $promZone->issues()->with('creator:id,full_name')->latest()->get();

        return Inertia::render('prom-zones/issues', [
            'promZone' => $promZone->load('region'),
            'issues' => $issues,
        ]);
    }

    public function store(
        StandardZoneIssueRequest $request,
        PromZone $promZone
    ) {
        $issue = $this->workflow->create(
            $promZone,
            $request->validated(),
            $request->user()?->id
        );

        $this->activity->record(
            auditable: $promZone,
            event: 'issue.created',
            category: 'issue',
            action: 'Проблемалық мәселе қосылды',
            subject: $issue,
            properties: [
                'details' => $issue->only([
                    'title',
                    'description',
                    'category',
                    'severity',
                    'status',
                ]),
            ]
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе қосылды.');
    }

    public function update(
        StandardZoneIssueRequest $request,
        PromZone $promZone,
        PromZoneIssue $issue
    ) {
        abort_if($issue->prom_zone_id !== $promZone->id, 404);

        $before = $issue->only([
            'title',
            'description',
            'category',
            'severity',
            'status',
        ]);
        $this->workflow->update(
            $issue,
            $request->validated(),
            $request->user()?->id
        );

        $this->activity->record(
            auditable: $promZone,
            event: 'issue.updated',
            category: 'issue',
            action: 'Проблемалық мәселе жаңартылды',
            subject: $issue,
            properties: [
                'changes' => $this->activity->changes(
                    $before,
                    $issue->fresh()->only([
                        'title',
                        'description',
                        'category',
                        'severity',
                        'status',
                    ]),
                    [
                        'title' => 'Тақырыбы',
                        'description' => 'Сипаттама',
                        'category' => 'Санаты',
                        'severity' => 'Маңыздылық',
                        'status' => 'Күйі',
                    ]
                ),
            ]
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(PromZone $promZone, PromZoneIssue $issue)
    {
        abort_if($issue->prom_zone_id !== $promZone->id, 404);

        $this->activity->record(
            auditable: $promZone,
            event: 'issue.deleted',
            category: 'issue',
            action: 'Проблемалық мәселе жойылды',
            subject: $issue,
            properties: [
                'details' => $issue->only([
                    'title',
                    'description',
                    'category',
                    'severity',
                    'status',
                ]),
            ]
        );

        $this->workflow->destroy($issue);

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }
}
