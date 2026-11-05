<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProjectAttractionActivityRequest;
use App\Http\Requests\ReportProjectAttractionActivityRequest;
use App\Http\Requests\ReviewProjectAttractionActivityRequest;
use App\Models\InvestmentProject;
use App\Models\ProjectAttractionActivity;
use App\Services\ProjectAttractionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ProjectAttractionActivityController extends Controller
{
    public function __construct(private readonly ProjectAttractionService $attraction) {}

    public function store(ProjectAttractionActivityRequest $request, InvestmentProject $investmentProject): RedirectResponse
    {
        $this->attraction->save($request->user(), $investmentProject, $request->validated());

        return back()->with('success', 'Инвестор тарту жұмысы қосылды.');
    }

    public function update(ProjectAttractionActivityRequest $request, InvestmentProject $investmentProject, ProjectAttractionActivity $activity): RedirectResponse
    {
        $this->attraction->save($request->user(), $investmentProject, $request->validated(), $activity);

        return back()->with('success', 'Инвестор тарту жұмысы жаңартылды.');
    }

    public function destroy(Request $request, InvestmentProject $investmentProject, ProjectAttractionActivity $activity): RedirectResponse
    {
        $this->attraction->delete($request->user(), $investmentProject, $activity);

        return back()->with('success', 'Жазба жойылды.');
    }

    public function report(ReportProjectAttractionActivityRequest $request, InvestmentProject $investmentProject, ProjectAttractionActivity $activity): RedirectResponse
    {
        $this->attraction->report($request->user(), $investmentProject, $activity, $request->validated());

        return back()->with('success', $request->validated('status') === 'pending_review'
            ? 'Орындалу нәтижесі тексеруге жіберілді.' : 'Іс-шара орындалуда деп белгіленді.');
    }

    public function review(ReviewProjectAttractionActivityRequest $request, InvestmentProject $investmentProject, ProjectAttractionActivity $activity): RedirectResponse
    {
        $this->attraction->review($request->user(), $investmentProject, $activity, $request->validated());

        return back()->with('success', $request->validated('decision') === 'approved'
            ? 'Іс-шараның орындалуы расталды.' : 'Нәтиже толықтыруға қайтарылды.');
    }
}
