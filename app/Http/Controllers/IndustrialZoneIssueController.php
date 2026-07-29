<?php

namespace App\Http\Controllers;

use App\Http\Requests\StandardZoneIssueRequest;
use App\Models\IndustrialZone;
use App\Models\IndustrialZoneIssue;
use App\Services\StandardIssueWorkflowService;
use Inertia\Inertia;

class IndustrialZoneIssueController extends Controller
{
    public function __construct(
        private readonly StandardIssueWorkflowService $workflow
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
        $this->workflow->create(
            $industrialZone,
            $request->validated(),
            $request->user()?->id
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

        $this->workflow->update(
            $issue,
            $request->validated(),
            $request->user()?->id
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(IndustrialZone $industrialZone, IndustrialZoneIssue $issue)
    {
        abort_if(
            $issue->industrial_zone_id !== $industrialZone->id,
            404
        );

        $this->workflow->destroy($issue);

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }
}
