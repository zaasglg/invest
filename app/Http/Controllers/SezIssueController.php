<?php

namespace App\Http\Controllers;

use App\Models\Sez;
use App\Models\SezIssue;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SezIssueController extends Controller
{
    public function index(Sez $sez)
    {
        $issues = $sez->issues()->latest()->get();

        return Inertia::render('sezs/issues', [
            'sez' => $sez->load('region'),
            'issues' => $issues,
        ]);
    }

    public function store(Request $request, Sez $sez)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        $sez->issues()->create($validated);

        return redirect()->back()->with('success', 'Проблемный вопрос добавлен.');
    }

    public function update(Request $request, Sez $sez, SezIssue $issue)
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

    public function destroy(Sez $sez, SezIssue $issue)
    {
        $issue->delete();

        return redirect()->back()->with('success', 'Проблемный вопрос удален.');
    }
}
