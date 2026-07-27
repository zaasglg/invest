<?php

namespace App\Http\Controllers;

use App\Http\Requests\StandardZoneIssueRequest;
use App\Models\Sez;
use App\Models\SezIssue;
use App\Services\StandardIssueWorkflowService;
use Inertia\Inertia;

class SezIssueController extends Controller
{
    public function __construct(
        private readonly StandardIssueWorkflowService $workflow
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
        $this->workflow->create(
            $sez,
            $request->validated(),
            $request->user()?->id
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе қосылды.');
    }

    public function update(
        StandardZoneIssueRequest $request,
        Sez $sez,
        SezIssue $issue
    ) {
        abort_if($issue->sez_id !== $sez->id, 404);

        $this->workflow->update(
            $issue,
            $request->validated(),
            $request->user()?->id
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(Sez $sez, SezIssue $issue)
    {
        abort_if($issue->sez_id !== $sez->id, 404);

        $this->workflow->destroy($issue);

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }
}
