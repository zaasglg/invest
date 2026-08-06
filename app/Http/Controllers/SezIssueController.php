<?php

namespace App\Http\Controllers;

use App\Http\Requests\StandardZoneIssueRequest;
use App\Models\Sez;
use App\Models\SezIssue;
use App\Services\SectorActivityLogService;
use App\Services\StandardIssueWorkflowService;
use Inertia\Inertia;

class SezIssueController extends Controller
{
    public function __construct(
        private readonly StandardIssueWorkflowService $workflow,
        private readonly SectorActivityLogService $activity
    ) {}

    public function index(Sez $sez)
    {
        $issues = $sez->issues()->with('creator:id,full_name')->latest()->get();

        return Inertia::render('sezs/issues', [
            'sez' => $sez->load('region'),
            'issues' => $issues,
        ]);
    }

    public function store(StandardZoneIssueRequest $request, Sez $sez)
    {
        $issue = $this->workflow->create(
            $sez,
            $request->validated(),
            $request->user()?->id
        );

        $this->activity->record(
            auditable: $sez,
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
        Sez $sez,
        SezIssue $issue
    ) {
        abort_if($issue->sez_id !== $sez->id, 404);

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
            auditable: $sez,
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

    public function destroy(Sez $sez, SezIssue $issue)
    {
        abort_if($issue->sez_id !== $sez->id, 404);

        $this->activity->record(
            auditable: $sez,
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
