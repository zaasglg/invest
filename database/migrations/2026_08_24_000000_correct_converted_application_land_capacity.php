<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->adjustRequiredArea(1);
    }

    public function down(): void
    {
        $this->adjustRequiredArea(-1);
    }

    private function adjustRequiredArea(int $direction): void
    {
        DB::table('investment_applications')
            ->where('status', 'converted_to_project')
            ->whereNotNull('investment_project_id')
            ->whereNotNull('requested_area')
            ->whereNotNull('approved_area')
            ->orderBy('id')
            ->get([
                'investment_project_id',
                'requested_area',
                'approved_area',
            ])
            ->groupBy('investment_project_id')
            ->each(function ($applications, $projectId) use ($direction): void {
                $requiredAreaDelta = $applications->sum(
                    fn ($application): float => (float) $application->requested_area
                        - (float) $application->approved_area
                );

                if ($requiredAreaDelta === 0.0) {
                    return;
                }

                $project = DB::table('investment_projects')
                    ->where('id', $projectId)
                    ->first(['infrastructure']);

                if (! $project) {
                    return;
                }

                $infrastructure = is_array($project->infrastructure)
                    ? $project->infrastructure
                    : json_decode($project->infrastructure ?? '[]', true);

                if (! is_array($infrastructure)) {
                    $infrastructure = [];
                }

                $land = is_array($infrastructure['land'] ?? null)
                    ? $infrastructure['land']
                    : [];
                $land['needed'] = true;
                $land['required_capacity'] = (float) ($land['required_capacity'] ?? 0)
                    + ($requiredAreaDelta * $direction);
                $infrastructure['land'] = $land;

                DB::table('investment_projects')
                    ->where('id', $projectId)
                    ->update([
                        'infrastructure' => json_encode(
                            $infrastructure,
                            JSON_UNESCAPED_UNICODE
                        ),
                        'updated_at' => now(),
                    ]);
            });
    }
};
