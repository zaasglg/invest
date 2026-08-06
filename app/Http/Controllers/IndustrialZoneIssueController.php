<?php

namespace App\Http\Controllers;

use App\Http\Requests\StandardZoneIssueRequest;
use App\Models\IndustrialZone;
use App\Models\IndustrialZoneIssue;
use App\Services\SectorActivityLogService;
use App\Services\StandardIssueWorkflowService;
use Inertia\Inertia;

class IndustrialZoneIssueController extends Controller
{
    public function __construct(
        private readonly StandardIssueWorkflowService $workflow,
        private readonly SectorActivityLogService $activity
    ) {}

    public function index(IndustrialZone $industrialZone)
    {
        $issues = $industrialZone->issues()->with('creator:id,full_name')->latest()->get();

        return Inertia::render('industrial-zones/issues', [
            'industrialZone' => $industrialZone->load('region'),
            'issues' => $issues,
        ]);
    }

    public function store(
        StandardZoneIssueRequest $request,
        IndustrialZone $industrialZone
    ) {
        $issue = $this->workflow->create(
            $industrialZone,
            $request->validated(),
            $request->user()?->id
        );

        $this->activity->record(
            auditable: $industrialZone,
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
        IndustrialZone $industrialZone,
        IndustrialZoneIssue $issue
    ) {
        abort_if(
            $issue->industrial_zone_id !== $industrialZone->id,
            404
        );

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
            auditable: $industrialZone,
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

    public function destroy(IndustrialZone $industrialZone, IndustrialZoneIssue $issue)
    {
        abort_if(
            $issue->industrial_zone_id !== $industrialZone->id,
            404
        );

        $this->activity->record(
            auditable: $industrialZone,
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
