<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Services\ProjectAttractionHandoverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectAttractionHandoverController extends Controller
{
    public function __invoke(Request $request, InvestmentProject $investmentProject, ProjectAttractionHandoverService $handover): RedirectResponse
    {
        $user = $request->user();
        $handover->accept($user, $investmentProject);

        if ($user->isTurkistanInvestAttraction()) {
            return redirect()
                ->route('attraction-handovers.index')
                ->with('success', 'Жоба қабылданып, сүйемелдеу резервіне жіберілді.');
        }

        return back()->with('success', 'Жоба сүйемелдеуге қабылданды.');
    }
}
