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
        $handover->accept($request->user(), $investmentProject);

        return back()->with('success', 'Жоба сүйемелдеуге қабылданды.');
    }
}
