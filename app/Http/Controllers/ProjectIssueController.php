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

        // Ispolnitel who is not involved cannot access issues page
        if ($user?->roleModel?->name === 'ispolnitel' && ! $user->isInvolvedInProject($investmentProject)) {
            abort(403, 'Сіз бұл жобаға қатыспайсыз.');
        }

        $issues = $investmentProject->issues()->latest()->get();

        return Inertia::render('investment-projects/issues', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'issues' => $issues,
            'ispolnitelCanWrite' => $this->ispolnitelCanWrite($user, $investmentProject),
        ]);
    }

    public function store(Request $request, InvestmentProject $investmentProject)
    {
        $user = Auth::user();

        $this->ensureCanCreateIssues($user, $investmentProject);

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
        if ($issue->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();

        if ($user?->roleModel?->name === 'ispolnitel') {
            abort(403, 'Сізге проблемалық мәселені өзгертуге рұқсат жоқ.');
        }

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
        if ($issue->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();

        // Ispolnitel cannot delete issues
        if ($user->roleModel?->name === 'ispolnitel') {
            abort(403, 'Сізге проблемалық мәселені жоюға рұқсат жоқ.');
        }

        KpiLog::log($investmentProject->id, 'Проблемалық мәселе жойылды: "' . $issue->title . '"');

        $issue->delete();

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }

    private function ispolnitelCanWrite($user, InvestmentProject $project): bool
    {
        if ($user->roleModel?->name !== 'ispolnitel') {
            return false;
        }

        if (! $user->isInvolvedInProject($project)) {
            return false;
        }

        // Both district and oblast ispolnitel have the same write permissions
        return true;
    }

    private function ensureCanCreateIssues($user, InvestmentProject $project): void
    {
        if ($user?->roleModel?->name === 'ispolnitel' && ! $this->ispolnitelCanWrite($user, $project)) {
            abort(403, 'Сіз бұл жобаға проблемалық мәселе қоса алмайсыз.');
        }
    }
}
