<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->boolean('is_deleted')->default(false);
            $table->foreignId('deleted_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('deleted_at')->nullable();

            $table->index(
                ['is_deleted', 'deleted_at'],
                'investment_projects_deleted_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropIndex('investment_projects_deleted_index');
            $table->dropConstrainedForeignId('deleted_by');
            $table->dropColumn(['is_deleted', 'deleted_at']);
        });
    }
};
