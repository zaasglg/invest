<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Services\InvestmentProjectAccessService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AttractionHandoverController extends Controller
{
    public function __construct(
        private readonly InvestmentProjectAccessService $access
    ) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user()->loadMissing('roleModel');
        abort_unless($user->isTurkistanInvestAttraction(), 403);

        $query = InvestmentProject::query()
            ->active()
            ->where('status', 'plan')
            ->where('attraction_stage', 'handover')
            ->where(function (Builder $assigned) use ($user): void {
                $assigned
                    ->where('attraction_handover_requested_by', $user->id)
                    ->orWhere('attraction_handover_to_id', $user->id);
            });
        $this->access->scopeVisible($query, $user);

        $stats = [
            'total_projects' => (clone $query)->count(),
            'total_investment' => (float) (clone $query)
                ->sum('total_investment'),
        ];

        $projects = $query
            ->with([
                'company:id,legal_form,name',
                'region:id,name',
                'projectType:id,name',
                'projectTypes:id,name',
                'sezs:id,name',
                'industrialZones:id,name',
                'promZones:id,name',
                'subsoilUsers:id,name',
                'attractionHandoverTo:id,full_name',
                'attractionHandoverRequester:id,full_name',
                'attractionHandoverRejector:id,full_name',
            ])
            ->orderByDesc('attraction_handover_requested_at')
            ->orderByDesc('attraction_handover_rejected_at')
            ->latest('updated_at')
            ->paginate(15)
            ->withQueryString();
        $projects->getCollection()->each(
            fn (InvestmentProject $project) => $project->setAttribute(
                'can_manage',
                $this->access->canManage($user, $project)
            )
        );

        return Inertia::render('investment-projects/handovers', [
            'projects' => $projects,
            'stats' => $stats,
        ]);
    }
}
