<?php

namespace App\Http\Controllers;

use App\Models\InvestmentProject;
use App\Services\ProjectAttractionHandoverService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectAttractionHandoverRejectionController extends Controller
{
    public function __invoke(
        Request $request,
        InvestmentProject $investmentProject,
        ProjectAttractionHandoverService $handover
    ): RedirectResponse {
        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:3', 'max:1000'],
        ], [
            'rejection_reason.required' => 'Кері қайтару себебін жазыңыз.',
            'rejection_reason.min' => 'Кері қайтару себебін кемінде 3 таңбамен жазыңыз.',
            'rejection_reason.max' => 'Кері қайтару себебі 1000 таңбадан аспауы керек.',
        ]);

        $user = $request->user();
        $handover->reject(
            $user,
            $investmentProject,
            $validated['rejection_reason']
        );

        return to_route(
            $user->isTurkistanInvestAttraction()
                ? 'attraction-handovers.index'
                : 'project-reserves.index'
        )->with('success', 'Жоба себебі көрсетіліп кері қайтарылды.');
    }
}
