<?php

namespace App\Http\Controllers;

use App\Http\Requests\StandardZoneIssueRequest;
use App\Models\PromZone;
use App\Models\PromZoneIssue;
use App\Services\StandardIssueWorkflowService;
use Inertia\Inertia;

class PromZoneIssueController extends Controller
{
    public function __construct(
        private readonly StandardIssueWorkflowService $workflow
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
        $this->workflow->create(
            $promZone,
            $request->validated(),
            $request->user()?->id
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе қосылды.');
    }

    public function update(
        StandardZoneIssueRequest $request,
        PromZone $promZone,
        PromZoneIssue $issue
    ) {
        abort_if($issue->prom_zone_id !== $promZone->id, 404);

        $this->workflow->update(
            $issue,
            $request->validated(),
            $request->user()?->id
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(PromZone $promZone, PromZoneIssue $issue)
    {
        abort_if($issue->prom_zone_id !== $promZone->id, 404);

        $this->workflow->destroy($issue);

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }
}
