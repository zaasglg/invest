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
        $issues = $subsoilUser->issues()->latest()->get();

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

        $subsoilUser->issues()->create($validated);

        return redirect()->back()->with('success', 'Проблемный вопрос добавлен.');
    }

    public function update(Request $request, SubsoilUser $subsoilUser, SubsoilIssue $issue)
    {
        $validated = $request->validate([
            'description' => 'required|string',
            'severity' => 'required|in:medium,high',
            'status' => 'required|in:open,resolved',
        ]);

        $issue->update($validated);

        return redirect()->back()->with('success', 'Проблемный вопрос обновлен.');
    }

    public function destroy(SubsoilUser $subsoilUser, SubsoilIssue $issue)
    {
        $issue->delete();

        return redirect()->back()->with('success', 'Проблемный вопрос удален.');
    }
}
