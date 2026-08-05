<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProjectProductionFactRequest;
use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Services\ProjectProductionService;
use Illuminate\Validation\ValidationException;

class ProjectProductionFactController extends Controller
{
    public function __construct(
        private readonly ProjectProductionService $production
    ) {}

    public function store(
        StoreProjectProductionFactRequest $request,
        InvestmentProject $investmentProject
    ) {
        abort_unless(
            $this->production->canReport(
                $request->user(),
                $investmentProject
            ),
            403
        );

        if ($investmentProject->status !== 'launched') {
            throw ValidationException::withMessages([
                'production_plan_id' => 'Нақты өндіріс есебі тек іске қосылған жобаға енгізіледі.',
            ]);
        }

        $validated = $request->validated();
        $plan = $investmentProject->productionPlans()
            ->findOrFail($validated['production_plan_id']);
        $fact = $this->production->saveFact(
            $plan,
            $validated,
            $request->user()
        );

        KpiLog::activity(
            projectId: $investmentProject->id,
            event: 'production.fact.saved',
            category: 'project',
            action: 'Нақты өндіріс есебі сақталды: '.$plan->product_name,
            subject: $fact,
            properties: [
                'project_name' => $investmentProject->name,
                'details' => [
                    'Өнім немесе нәтиже' => $plan->product_name,
                    'Есептік кезең' => $fact->period_label,
                    'Нақты көлем' => $fact->actual_quantity.' '.$plan->unit_label,
                    'Нақты сома' => $fact->actual_amount,
                ],
            ]
        );

        return back()->with('success', 'Нақты өндіріс есебі сақталды.');
    }
}
