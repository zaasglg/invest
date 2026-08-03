<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_photos', function (Blueprint $table) {
            $table->foreignId('uploaded_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->index(
                ['project_id', 'uploaded_by', 'photo_type', 'created_at'],
                'project_photos_weekly_executor_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('project_photos', function (Blueprint $table) {
            $table->dropIndex('project_photos_weekly_executor_index');
            $table->dropConstrainedForeignId('uploaded_by');
        });
    }
};
