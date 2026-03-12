<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subsoil_task_completions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('subsoil_tasks')->onDelete('cascade');
            $table->foreignId('submitted_by')->constrained('users')->onDelete('cascade');
            $table->text('comment')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('reviewer_comment')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('subsoil_task_completion_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('completion_id')->constrained('subsoil_task_completions')->onDelete('cascade');
            $table->text('file_path');
            $table->string('file_name');
            $table->enum('type', ['document', 'photo'])->default('document');
            $table->timestamps();
        });

        Schema::table('subsoil_documents', function (Blueprint $table) {
            $table->boolean('is_completed')->default(false)->after('type');
        });

        Schema::table('task_notifications', function (Blueprint $table) {
            $table->foreignId('subsoil_completion_id')
                ->nullable()
                ->after('completion_id')
                ->constrained('subsoil_task_completions')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            $table->dropForeign(['subsoil_completion_id']);
            $table->dropColumn('subsoil_completion_id');
        });

        Schema::table('subsoil_documents', function (Blueprint $table) {
            $table->dropColumn('is_completed');
        });

        Schema::dropIfExists('subsoil_task_completion_files');
        Schema::dropIfExists('subsoil_task_completions');
    }
};
