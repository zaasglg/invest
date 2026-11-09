<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_project_user', function (Blueprint $table) {
            $table->string('assignment_source', 16)->default('manual');
        });

        // Legacy automatic district memberships had no provenance. Preserve
        // assigned work and cross-district memberships as explicit access.
        DB::table('investment_project_user')
            ->whereExists(function ($query) {
                $query->selectRaw('1')->from('users')
                    ->join('roles', 'roles.id', '=', 'users.role_id')
                    ->join('investment_projects', 'investment_projects.region_id', '=', 'users.region_id')
                    ->whereColumn('users.id', 'investment_project_user.user_id')
                    ->whereColumn('investment_projects.id', 'investment_project_user.investment_project_id')
                    ->where('roles.name', 'ispolnitel')->where('users.baskarma_type', 'district');
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')->from('project_tasks')
                    ->whereColumn('project_tasks.project_id', 'investment_project_user.investment_project_id')
                    ->whereColumn('project_tasks.assigned_to', 'investment_project_user.user_id');
            })
            ->whereNotExists(function ($query) {
                $query->selectRaw('1')->from('project_attraction_activities')
                    ->whereColumn('project_attraction_activities.project_id', 'investment_project_user.investment_project_id')
                    ->whereColumn('project_attraction_activities.responsible_id', 'investment_project_user.user_id');
            })->update(['assignment_source' => 'automatic']);

        DB::table('investment_project_user')->where('assignment_source', 'automatic')
            ->whereIn('investment_project_id', DB::table('investment_projects')->where('status', 'plan')->select('id'))
            ->delete();
    }

    public function down(): void
    {
        Schema::table('investment_project_user', function (Blueprint $table) {
            $table->dropColumn('assignment_source');
        });
    }
};
