<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\IndustrialZoneIssue;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IndustrialZoneIssueController extends Controller
{
    public function index(IndustrialZone $industrialZone)
    {
        $issues = $industrialZone->issues()->latest()->get();

        return Inertia::render('industrial-zones/issues', [
            'industrialZone' => $industrialZone->load('region'),
            'issues' => $issues,
        ]);
    }

    public function store(Request $request, IndustrialZone $industrialZone)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        $industrialZone->issues()->create($validated);

        return redirect()->back()->with('success', 'Проблемный вопрос добавлен.');
    }

    public function update(Request $request, IndustrialZone $industrialZone, IndustrialZoneIssue $issue)
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

    public function destroy(IndustrialZone $industrialZone, IndustrialZoneIssue $issue)
    {
        $issue->delete();

        return redirect()->back()->with('success', 'Проблемный вопрос удален.');
    }
}
