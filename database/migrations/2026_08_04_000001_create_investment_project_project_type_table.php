<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_project_type', function (Blueprint $table) {
            $table->foreignId('investment_project_id')
                ->constrained('investment_projects')
                ->cascadeOnDelete();
            $table->foreignId('project_type_id')
                ->constrained('project_types')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['investment_project_id', 'project_type_id'],
                'investment_project_type_unique'
            );
        });

        DB::table('investment_projects')
            ->whereNotNull('project_type_id')
            ->select(['id', 'project_type_id'])
            ->orderBy('id')
            ->chunkById(500, function ($projects): void {
                $now = now();
                $rows = $projects->map(fn ($project) => [
                    'investment_project_id' => $project->id,
                    'project_type_id' => $project->project_type_id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ])->all();

                DB::table('investment_project_project_type')
                    ->insertOrIgnore($rows);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_project_type');
    }
};
