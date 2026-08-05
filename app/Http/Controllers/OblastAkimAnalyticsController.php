<?php

namespace App\Http\Controllers;

use App\Services\OblastAkimAnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OblastAkimAnalyticsController extends Controller
{
    public function __construct(
        private readonly OblastAkimAnalyticsService $analytics
    ) {}

    public function __invoke(Request $request): Response
    {
        abort_unless(
            $request->user()?->isOblastScopedAkim(),
            403,
            'Бұл бөлім тек облыстық әкімге қолжетімді.'
        );

        return Inertia::render('akim-analytics/index', [
            'analytics' => $this->analytics->build($request->user()),
        ]);
    }
}
