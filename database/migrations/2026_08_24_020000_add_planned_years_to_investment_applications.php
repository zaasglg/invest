<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->unsignedSmallInteger('planned_start_year')
                ->nullable()
                ->after('jobs_count');
            $table->unsignedSmallInteger('planned_end_year')
                ->nullable()
                ->after('planned_start_year');
        });

        DB::table('investment_applications')
            ->whereNotNull('investment_project_id')
            ->orderBy('id')
            ->get(['id', 'investment_project_id'])
            ->each(function ($application): void {
                $project = DB::table('investment_projects')
                    ->where('id', $application->investment_project_id)
                    ->first(['start_date', 'end_date']);

                if (! $project) {
                    return;
                }

                DB::table('investment_applications')
                    ->where('id', $application->id)
                    ->update([
                        'planned_start_year' => $project->start_date
                            ? Carbon::parse($project->start_date)->year
                            : null,
                        'planned_end_year' => $project->end_date
                            ? Carbon::parse($project->end_date)->year
                            : null,
                    ]);
            });
    }

    public function down(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->dropColumn([
                'planned_start_year',
                'planned_end_year',
            ]);
        });
    }
};
