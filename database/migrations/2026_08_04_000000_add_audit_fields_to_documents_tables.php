<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_documents', function (Blueprint $table) {
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source', 32)->default('manual');
            $table->foreignId('source_task_id')->nullable()->constrained('project_tasks')->nullOnDelete();
            $table->foreignId('source_completion_id')->nullable()->constrained('task_completions')->nullOnDelete();
            $table->string('source_task_title')->nullable();
            $table->timestamp('task_assigned_at')->nullable();
            $table->foreignId('task_assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('deleted_at')->nullable();

            $table->index(
                ['project_id', 'is_deleted', 'is_completed'],
                'project_documents_state_index'
            );
        });

        Schema::table('subsoil_documents', function (Blueprint $table) {
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('source', 32)->default('manual');
            $table->foreignId('source_task_id')->nullable()->constrained('subsoil_tasks')->nullOnDelete();
            $table->foreignId('source_completion_id')->nullable()->constrained('subsoil_task_completions')->nullOnDelete();
            $table->string('source_task_title')->nullable();
            $table->timestamp('task_assigned_at')->nullable();
            $table->foreignId('task_assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->boolean('is_deleted')->default(false);
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('deleted_at')->nullable();

            $table->index(
                ['subsoil_user_id', 'is_deleted', 'is_completed'],
                'subsoil_documents_state_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('subsoil_documents', function (Blueprint $table) {
            $table->dropIndex('subsoil_documents_state_index');
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropConstrainedForeignId('approved_by');
            $table->dropConstrainedForeignId('task_assigned_by');
            $table->dropConstrainedForeignId('source_completion_id');
            $table->dropConstrainedForeignId('source_task_id');
            $table->dropConstrainedForeignId('uploaded_by');
            $table->dropColumn([
                'source',
                'source_task_title',
                'task_assigned_at',
                'submitted_at',
                'approved_at',
                'is_deleted',
                'deleted_at',
            ]);
        });

        Schema::table('project_documents', function (Blueprint $table) {
            $table->dropIndex('project_documents_state_index');
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropConstrainedForeignId('approved_by');
            $table->dropConstrainedForeignId('task_assigned_by');
            $table->dropConstrainedForeignId('source_completion_id');
            $table->dropConstrainedForeignId('source_task_id');
            $table->dropConstrainedForeignId('uploaded_by');
            $table->dropColumn([
                'source',
                'source_task_title',
                'task_assigned_at',
                'submitted_at',
                'approved_at',
                'is_deleted',
                'deleted_at',
            ]);
        });
    }
};
