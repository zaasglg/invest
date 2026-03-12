<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            // Make task_id nullable so subsoil notifications don't need a project_task
            $table->foreignId('task_id')->nullable()->change();

            // Add subsoil_task_id for subsoil-related notifications
            $table->foreignId('subsoil_task_id')
                ->nullable()
                ->after('task_id')
                ->constrained('subsoil_tasks')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            $table->dropForeign(['subsoil_task_id']);
            $table->dropColumn('subsoil_task_id');
        });
    }
};
