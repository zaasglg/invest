<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Services\ProjectAttractionHandoverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectReserveController extends Controller
{
    public function __construct(
        private readonly ProjectAttractionHandoverService $handover
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $query = $this->handover->pendingFor($user);
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
                'creator:id,full_name',
                'attractionHandoverRequester:id,full_name',
            ])
            ->orderByDesc('attraction_handover_requested_at')
            ->paginate(15)
            ->withQueryString();
        $projects->getCollection()->each(
            fn (InvestmentProject $project) => $project->setAttribute(
                'can_manage',
                $this->handover->canReviewReserve($user, $project)
            )
        );

        return Inertia::render('investment-projects/reserves', [
            'projects' => $projects,
            'stats' => $stats,
        ]);
    }

    public function accept(
        Request $request,
        InvestmentProject $investmentProject
    ): RedirectResponse {
        $this->handover->acceptReserve(
            $request->user(),
            $investmentProject
        );

        return to_route('project-reserves.index')
            ->with('success', 'Жоба сүйемелдеуге қабылданды.');
    }

    public function reject(
        Request $request,
        InvestmentProject $investmentProject
    ): RedirectResponse {
        $this->handover->authorizeReserveDecision(
            $request->user(),
            $investmentProject
        );

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:3', 'max:1000'],
        ], [
            'rejection_reason.required' => 'Кері қайтару себебін жазыңыз.',
            'rejection_reason.min' => 'Кері қайтару себебін кемінде 3 таңбамен жазыңыз.',
            'rejection_reason.max' => 'Кері қайтару себебі 1000 таңбадан аспауы керек.',
        ]);

        $this->handover->rejectReserve(
            $request->user(),
            $investmentProject,
            $validated['rejection_reason']
        );

        return to_route('project-reserves.index')
            ->with('success', 'Жоба инвестор тарту бағытына кері қайтарылды.');
    }
}
