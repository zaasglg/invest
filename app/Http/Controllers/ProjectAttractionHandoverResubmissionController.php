<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Services\ProjectAttractionHandoverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectAttractionHandoverResubmissionController extends Controller
{
    public function __invoke(
        Request $request,
        InvestmentProject $investmentProject,
        ProjectAttractionHandoverService $handover
    ): RedirectResponse {
        $handover->resubmitReturned($request->user(), $investmentProject);

        return to_route('attraction-handovers.index')
            ->with('success', 'Жоба сүйемелдеу резервіне қайта жіберілді.');
    }
}
