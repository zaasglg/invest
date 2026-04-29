<?php

namespace App\Http\Controllers;

use App\Models\SubsoilIssue;
use App\Models\SubsoilUser;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubsoilIssueController extends Controller
{
    public function index(SubsoilUser $subsoilUser)
    {
        $issues = $subsoilUser->issues()->with('creator:id,full_name')->latest()->get();

        return Inertia::render('subsoil-users/issues', [
            'subsoilUser' => $subsoilUser->load('region'),
            'issues' => $issues,
        ]);
    }

    public function store(Request $request, SubsoilUser $subsoilUser)
    {
        $validated = $request->validate([
            'description' => 'required|string',
            'severity' => 'required|in:medium,high',
            'status' => 'required|in:open,resolved',
        ]);

        $subsoilUser->issues()->create([
            ...$validated,
            'created_by' => $request->user()?->id,
        ]);

        return redirect()->back()->with('success', 'Проблемалық мәселе қосылды.');
    }

    public function update(Request $request, SubsoilUser $subsoilUser, SubsoilIssue $issue)
    {
        $validated = $request->validate([
            'description' => 'required|string',
            'severity' => 'required|in:medium,high',
            'status' => 'required|in:open,resolved',
        ]);

        if ($issue->created_by === null) {
            $validated['created_by'] = $request->user()?->id;
        }

        $issue->update($validated);

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(SubsoilUser $subsoilUser, SubsoilIssue $issue)
    {
        $issue->delete();

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }
}
