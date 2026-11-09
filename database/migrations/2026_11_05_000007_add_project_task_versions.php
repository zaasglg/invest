<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            $table->unsignedInteger('definition_version')->default(1);
        });
        Schema::table('task_completions', function (Blueprint $table) {
            $table->unsignedInteger('task_definition_version')->default(1);
        });
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->timestamp('planning_started_at')->nullable();
        });

        DB::table('investment_projects')
            ->where('status', 'plan')
            ->orWhereIn('id', DB::table('project_attraction_activities')->select('project_id'))
            ->update(['planning_started_at' => DB::raw('COALESCE(created_at, CURRENT_TIMESTAMP)')]);
    }

    public function down(): void
    {
        Schema::table('task_completions', fn (Blueprint $table) => $table->dropColumn('task_definition_version'));
        Schema::table('project_tasks', fn (Blueprint $table) => $table->dropColumn('definition_version'));
        Schema::table('investment_projects', fn (Blueprint $table) => $table->dropColumn('planning_started_at'));
    }
};
