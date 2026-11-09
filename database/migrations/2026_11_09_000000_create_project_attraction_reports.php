<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_attraction_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained('project_attraction_activities')->cascadeOnDelete();
            $table->text('result');
            $table->string('status', 24)->default('pending');
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('reviewer_comment')->nullable();
            $table->boolean('recorded_as_completed')->default(false);
            $table->timestamps();
        });
        Schema::create('project_attraction_report_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_id')->constrained('project_attraction_reports')->cascadeOnDelete();
            $table->string('file_path');
            $table->string('file_name');
            $table->string('type', 16);
            $table->timestamps();
        });
        Schema::table('project_documents', function (Blueprint $table) {
            $table->boolean('recorded_as_completed')->default(false);
            $table->foreignId('source_attraction_activity_id')->nullable()->constrained('project_attraction_activities')->nullOnDelete();
            $table->foreignId('source_attraction_report_id')->nullable()->constrained('project_attraction_reports')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('project_documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_attraction_activity_id');
            $table->dropConstrainedForeignId('source_attraction_report_id');
            $table->dropColumn('recorded_as_completed');
        });
        Schema::dropIfExists('project_attraction_report_files');
        Schema::dropIfExists('project_attraction_reports');
    }
};
