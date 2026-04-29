<?php

namespace App\Http\Controllers;

use App\Models\PromZone;
use App\Models\PromZoneIssue;
use Illuminate\Http\Request;
use Inertia\Inertia;

class PromZoneIssueController extends Controller
{
    public function index(PromZone $promZone)
    {
        $issues = $promZone->issues()->with('creator:id,full_name')->latest()->get();

        return Inertia::render('prom-zones/issues', [
            'promZone' => $promZone->load('region'),
            'issues' => $issues,
        ]);
    }

    public function store(Request $request, PromZone $promZone)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        $promZone->issues()->create([
            ...$validated,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->back()->with('success', 'Проблемалық мәселе қосылды.');
    }

    public function update(Request $request, PromZone $promZone, PromZoneIssue $issue)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'nullable|string|max:100',
            'severity' => 'required|in:low,medium,high,critical',
            'status' => 'required|in:open,in_progress,resolved',
        ]);

        if ($issue->created_by === null) {
            $validated['created_by'] = $request->user()?->id;
        }

        $issue->update($validated);

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(PromZone $promZone, PromZoneIssue $issue)
    {
        $issue->delete();

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }
}
