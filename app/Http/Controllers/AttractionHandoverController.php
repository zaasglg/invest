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

        $receiptMode = $request->hasAny(['project', 'recipient', 'signature']);
        if ($receiptMode) {
            abort_unless(
                $request->integer('project') > 0
                && $request->integer('recipient') === (int) $user->id
                && $request->hasValidSignature(false),
                403
            );

            $query = InvestmentProject::query()
                ->active()
                ->whereKey($request->integer('project'))
                ->select([
                    'id',
                    'name',
                    'status',
                    'attraction_stage',
                    'company_id',
                    'company_name',
                    'region_id',
                    'project_type_id',
                    'total_investment',
                    'investor_country_code',
                    'attraction_handover_to_id',
                    'attraction_handover_requested_at',
                    'attraction_handover_requested_by',
                    'attraction_handover_accepted_at',
                    'attraction_handover_accepted_by',
                    'attraction_handover_rejected_at',
                    'attraction_handover_rejected_by',
                    'attraction_handover_rejection_reason',
                    'updated_at',
                ]);
        } else {
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
        }

        $stats = [
            'total_projects' => (clone $query)->count(),
            'total_investment' => (float) (clone $query)
                ->sum('total_investment'),
        ];

        $projects = $query
            ->with([
                'company:id,legal_form,name,status',
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
        $projects->getCollection()->each(function (
            InvestmentProject $project
        ) use ($receiptMode, $user): void {
            $project->setAttribute('handover_receipt', $receiptMode);
            $project->setAttribute(
                'can_view',
                ! $receiptMode && $this->access->canView($user, $project)
            );
            $project->setAttribute(
                'can_manage',
                ! $receiptMode && $this->access->canManage($user, $project)
            );
        });

        return Inertia::render('investment-projects/handovers', [
            'projects' => $projects,
            'stats' => $stats,
            'receiptMode' => $receiptMode,
        ]);
    }
}
