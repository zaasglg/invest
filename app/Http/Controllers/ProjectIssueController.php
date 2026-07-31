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

        $issues = $investmentProject->issues()->with('creator:id,full_name')->latest()->get();

        return Inertia::render('investment-projects/issues', [
            'project' => $investmentProject->load(['region', 'projectType']),
            'issues' => $issues,
            'participantCanCreate' => $this->participantCanCreate(
                $user,
                $investmentProject
            ),
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

        if ($user?->roleModel?->name === 'investor') {
            $validated['status'] = 'open';
        }

        $issue = $investmentProject->issues()->create([
            ...$validated,
            'created_by' => $user?->id,
        ]);

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'issue.created',
            category: 'issue',
            action: 'Проблемалық мәселе қосылды: "'.$validated['title'].'"',
            subject: $issue,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Санат' => $issue->category,
                    'Маңыздылық' => $issue->severity,
                    'Статус' => $issue->status,
                    'Сипаттама' => $issue->description,
                ],
            ]
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе қосылды.');
    }

    public function update(Request $request, InvestmentProject $investmentProject, ProjectIssue $issue)
    {
        if ($issue->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();

        if (in_array(
            $user?->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        )) {
            abort(403, 'Сізге проблемалық мәселені өзгертуге рұқсат жоқ.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        if ($issue->created_by === null) {
            $validated['created_by'] = $user?->id;
        }

        $trackedFields = [
            'title',
            'description',
            'category',
            'severity',
            'status',
        ];
        $before = $issue->only($trackedFields);
        $issue->update($validated);

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'issue.updated',
            category: 'issue',
            action: 'Проблемалық мәселе жаңартылды: "'.$issue->title.'"',
            subject: $issue,
            properties: [
                'project_name' => $investmentProject->name,
                'changes' => KpiLog::changes(
                    $before,
                    $issue->only($trackedFields),
                    [
                        'title' => 'Тақырып',
                        'description' => 'Сипаттама',
                        'category' => 'Санат',
                        'severity' => 'Маңыздылық',
                        'status' => 'Статус',
                    ]
                ),
            ]
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(InvestmentProject $investmentProject, ProjectIssue $issue)
    {
        if ($issue->project_id !== $investmentProject->id) {
            abort(404);
        }

        $user = Auth::user();

        // Project participants may add issues but cannot delete them.
        if (in_array(
            $user->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        )) {
            abort(403, 'Сізге проблемалық мәселені жоюға рұқсат жоқ.');
        }

        $issue->delete();

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'issue.deleted',
            category: 'issue',
            action: 'Проблемалық мәселе жойылды: "'.$issue->title.'"',
            subject: $issue,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Санат' => $issue->category,
                    'Маңыздылық' => $issue->severity,
                    'Статус' => $issue->status,
                    'Сипаттама' => $issue->description,
                ],
            ]
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }

    private function participantCanCreate(
        $user,
        InvestmentProject $project
    ): bool {
        if (! in_array(
            $user->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        )) {
            return false;
        }

        if (! $user->isInvolvedInProject($project)) {
            return false;
        }

        // All ispolnitel types have the same write permissions
        return true;
    }

    private function ensureCanCreateIssues($user, InvestmentProject $project): void
    {
        if (in_array(
            $user?->roleModel?->name,
            ['ispolnitel', 'investor'],
            true
        ) && ! $this->participantCanCreate($user, $project)) {
            abort(403, 'Сіз бұл жобаға проблемалық мәселе қоса алмайсыз.');
        }
    }
}
