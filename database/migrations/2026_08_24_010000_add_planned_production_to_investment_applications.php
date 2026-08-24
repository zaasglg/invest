<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->boolean('production_not_applicable')
                ->default(false)
                ->after('infrastructure_requirements');
            $table->json('planned_production')
                ->nullable()
                ->after('production_not_applicable');
        });

        DB::table('investment_applications')->update([
            'production_not_applicable' => true,
        ]);
    }

    public function down(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->dropColumn([
                'production_not_applicable',
                'planned_production',
            ]);
        });
    }
};
