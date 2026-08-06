<?php

namespace App\Http\Controllers;

use App\Models\SubsoilIssue;
use App\Models\SubsoilUser;
use App\Services\SectorActivityLogService;
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

    public function store(
        Request $request,
        SubsoilUser $subsoilUser,
        SectorActivityLogService $activity
    ) {
        $validated = $request->validate([
            'description' => 'required|string',
            'severity' => 'required|in:medium,high',
            'status' => 'required|in:open,resolved',
        ]);

        $issue = $subsoilUser->issues()->create([
            ...$validated,
            'created_by' => $request->user()?->id,
        ]);

        $activity->record(
            auditable: $subsoilUser,
            event: 'issue.created',
            category: 'issue',
            action: 'Проблемалық мәселе қосылды',
            subject: $issue,
            properties: ['details' => $validated]
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе қосылды.');
    }

    public function update(
        Request $request,
        SubsoilUser $subsoilUser,
        SubsoilIssue $issue,
        SectorActivityLogService $activity
    ) {
        abort_if($issue->subsoil_user_id !== $subsoilUser->id, 404);

        $validated = $request->validate([
            'description' => 'required|string',
            'severity' => 'required|in:medium,high',
            'status' => 'required|in:open,resolved',
        ]);

        $before = $issue->only(['description', 'severity', 'status']);

        if ($issue->created_by === null) {
            $validated['created_by'] = $request->user()?->id;
        }

        $issue->update($validated);

        $activity->record(
            auditable: $subsoilUser,
            event: 'issue.updated',
            category: 'issue',
            action: 'Проблемалық мәселе жаңартылды',
            subject: $issue,
            properties: [
                'changes' => $activity->changes(
                    $before,
                    $issue->fresh()->only([
                        'description',
                        'severity',
                        'status',
                    ]),
                    [
                        'description' => 'Сипаттама',
                        'severity' => 'Маңыздылық',
                        'status' => 'Күйі',
                    ]
                ),
            ]
        );

        return redirect()->back()->with('success', 'Проблемалық мәселе жаңартылды.');
    }

    public function destroy(
        SubsoilUser $subsoilUser,
        SubsoilIssue $issue,
        SectorActivityLogService $activity
    ) {
        abort_if($issue->subsoil_user_id !== $subsoilUser->id, 404);

        $activity->record(
            auditable: $subsoilUser,
            event: 'issue.deleted',
            category: 'issue',
            action: 'Проблемалық мәселе жойылды',
            subject: $issue,
            properties: [
                'details' => $issue->only([
                    'description',
                    'severity',
                    'status',
                ]),
            ]
        );

        $issue->delete();

        return redirect()->back()->with('success', 'Проблемалық мәселе жойылды.');
    }
}
