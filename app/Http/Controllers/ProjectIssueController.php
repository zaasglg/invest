<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Models\ProjectIssue;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectIssueController extends Controller
{
    public function index(InvestmentProject $investmentProject)
    {
        $issues = $investmentProject->issues()->latest()->get();

        return Inertia::render('investment-projects/issues', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'issues' => $issues,
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

        return redirect()->back()->with('success', 'Проблемный вопрос добавлен.');
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

        return redirect()->back()->with('success', 'Проблемный вопрос обновлен.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectIssue $issue)
    {
        $issue->delete();

        return redirect()->back()->with('success', 'Проблемный вопрос удален.');
    }
}
