<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            $table->foreignId('attraction_activity_id')->nullable()->index()
                ->constrained('project_attraction_activities')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('attraction_activity_id');
        });
    }
};
