<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->string('application_kind', 30)
                ->default('new_project')
                ->after('status');
            $table->foreignId('source_investment_project_id')
                ->nullable()
                ->after('application_kind')
                ->constrained('investment_projects')
                ->nullOnDelete();

            $table->index(
                ['application_kind', 'source_investment_project_id'],
                'investment_applications_kind_source_index'
            );
        });
    }

    public function down(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->dropIndex('investment_applications_kind_source_index');
            $table->dropConstrainedForeignId('source_investment_project_id');
            $table->dropColumn('application_kind');
        });
    }
};
