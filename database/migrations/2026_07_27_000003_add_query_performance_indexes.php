<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->index(
                ['region_id', 'is_archived', 'sort_order'],
                'investment_projects_region_archive_sort_idx'
            );
            $table->index(
                ['is_archived', 'status'],
                'investment_projects_archive_status_idx'
            );
        });

        Schema::table('project_tasks', function (Blueprint $table) {
            $table->index(
                ['assigned_to', 'approval_status', 'status'],
                'project_tasks_assignee_approval_status_idx'
            );
            $table->index(
                ['project_id', 'approval_status'],
                'project_tasks_project_approval_idx'
            );
        });

        Schema::table('task_completions', function (Blueprint $table) {
            $table->index(
                ['task_id', 'status'],
                'task_completions_task_status_idx'
            );
        });

        Schema::table('subsoil_tasks', function (Blueprint $table) {
            $table->index(
                ['assigned_to', 'status'],
                'subsoil_tasks_assignee_status_idx'
            );
            $table->index(
                ['subsoil_user_id', 'status'],
                'subsoil_tasks_owner_status_idx'
            );
        });

        Schema::table(
            'subsoil_task_completions',
            function (Blueprint $table) {
                $table->index(
                    ['task_id', 'status'],
                    'subsoil_task_completions_task_status_idx'
                );
            }
        );

        Schema::table('task_notifications', function (Blueprint $table) {
            $table->index(
                ['user_id', 'is_read', 'created_at'],
                'task_notifications_user_read_created_idx'
            );
        });

        Schema::table('regions', function (Blueprint $table) {
            $table->index(
                ['type', 'sort_order'],
                'regions_type_sort_order_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::table('regions', function (Blueprint $table) {
            $table->dropIndex('regions_type_sort_order_idx');
        });

        Schema::table('task_notifications', function (Blueprint $table) {
            $table->dropIndex('task_notifications_user_read_created_idx');
        });

        Schema::table(
            'subsoil_task_completions',
            function (Blueprint $table) {
                $table->dropIndex(
                    'subsoil_task_completions_task_status_idx'
                );
            }
        );

        Schema::table('subsoil_tasks', function (Blueprint $table) {
            $table->dropIndex('subsoil_tasks_assignee_status_idx');
            $table->dropIndex('subsoil_tasks_owner_status_idx');
        });

        Schema::table('task_completions', function (Blueprint $table) {
            $table->dropIndex('task_completions_task_status_idx');
        });

        Schema::table('project_tasks', function (Blueprint $table) {
            $table->dropIndex(
                'project_tasks_assignee_approval_status_idx'
            );
            $table->dropIndex('project_tasks_project_approval_idx');
        });

        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropIndex(
                'investment_projects_region_archive_sort_idx'
            );
            $table->dropIndex(
                'investment_projects_archive_status_idx'
            );
        });
    }
};
