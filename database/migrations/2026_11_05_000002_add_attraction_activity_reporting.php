<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_attraction_activities', function (Blueprint $table) {
            $table->string('status')->default('planned');
            $table->text('report_result')->nullable();
            $table->timestamp('reported_at')->nullable();
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reviewer_comment')->nullable();
            $table->index(['project_id', 'status', 'next_action_due_date'], 'attraction_activity_status_due_index');
        });
    }

    public function down(): void
    {
        Schema::table('project_attraction_activities', function (Blueprint $table) {
            $table->dropIndex('attraction_activity_status_due_index');
            $table->dropConstrainedForeignId('reported_by');
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn(['status', 'report_result', 'reported_at', 'reviewed_at', 'reviewer_comment']);
        });
    }
};
