<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->boolean('production_not_applicable')
                ->default(false)
                ->after('jobs_count');
        });

        Schema::create('project_production_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')
                ->constrained('investment_projects')
                ->cascadeOnDelete();
            $table->string('product_name');
            $table->decimal('planned_quantity', 20, 3)->nullable();
            $table->string('unit', 32);
            $table->string('custom_unit', 50)->nullable();
            $table->decimal('planned_amount', 20, 2)->nullable();
            $table->string('period', 16);
            $table->string('legacy_value', 500)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['project_id', 'sort_order']);
        });

        Schema::create('project_production_facts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_plan_id')
                ->constrained('project_production_plans')
                ->cascadeOnDelete();
            $table->string('period_key', 20);
            $table->unsignedSmallInteger('reporting_year')->nullable();
            $table->unsignedTinyInteger('period_number')->nullable();
            $table->decimal('actual_quantity', 20, 3);
            $table->decimal('actual_amount', 20, 2);
            $table->text('notes')->nullable();
            $table->foreignId('reported_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['production_plan_id', 'period_key'],
                'production_fact_period_unique'
            );
        });

        DB::table('investment_projects')
            ->whereNotNull('capacity')
            ->where('capacity', '<>', '')
            ->orderBy('id')
            ->chunkById(200, function ($projects): void {
                $now = now();
                $rows = [];

                foreach ($projects as $project) {
                    $legacyValue = trim((string) $project->capacity);
                    $period = preg_match(
                        '/жыл|год|year/ui',
                        $legacyValue
                    ) ? 'year' : 'project';

                    $rows[] = [
                        'project_id' => $project->id,
                        'product_name' => $project->name,
                        'planned_quantity' => null,
                        'unit' => 'other',
                        'custom_unit' => null,
                        'planned_amount' => null,
                        'period' => $period,
                        'legacy_value' => $legacyValue,
                        'sort_order' => 0,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($rows !== []) {
                    DB::table('project_production_plans')->insert($rows);
                }
            });

        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropColumn('capacity');
        });
    }

    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->string('capacity', 500)->nullable();
        });

        DB::table('project_production_plans')
            ->whereNotNull('legacy_value')
            ->orderBy('id')
            ->get()
            ->each(function ($plan): void {
                DB::table('investment_projects')
                    ->where('id', $plan->project_id)
                    ->whereNull('capacity')
                    ->update(['capacity' => $plan->legacy_value]);
            });

        Schema::dropIfExists('project_production_facts');
        Schema::dropIfExists('project_production_plans');

        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropColumn('production_not_applicable');
        });
    }
};
