<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\ProjectIssue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ProjectIssueController extends Controller
{
    public function index(InvestmentProject $investmentProject)
    {
        $user = Auth::user();

        // Ispolnitel who is not involved cannot see issues
        if ($user?->roleModel?->name === 'ispolnitel' && ! $user->isInvolvedInProject($investmentProject)) {
            $issues = collect();
        } else {
            $issues = $investmentProject->issues()->latest()->get();
        }

        return Inertia::render('investment-projects/issues', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'issues' => $issues,
            'ispolnitelCanWrite' => $this->ispolnitelCanWrite($user, $investmentProject),
        ]);
    }

    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        $investmentProject->issues()->create($validated);

        KpiLog::log($investmentProject->id, 'Проблемалық мәселе қосылды: "' . $validated['title'] . '"');

        return redirect()->back()->with('success', 'Проблемалық мәселе қосылды.');
    }

    public function update(Request $request, InvestmentProject $investmentProject, ProjectIssue $issue)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        $issue->update($validated);

        KpiLog::log($investmentProject->id, 'Проблемалық мәселе жаңартылды: "' . $issue->title . '"');

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectIssue $issue)
    {
        KpiLog::log($investmentProject->id, 'Проблемалық мәселе жойылды: "' . $issue->title . '"');

        $issue->delete();

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }

    private function ispolnitelCanWrite($user, InvestmentProject $project): bool
    {
        return $user->roleModel?->name === 'ispolnitel'
            && $user->isInvolvedInProject($project)
            && $user->region_id
            && (int) $project->region_id === (int) $user->region_id;
    }
}
