<?php

use App\Models\InvestmentProject;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_curator', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')
                ->constrained('investment_projects')
                ->cascadeOnDelete();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['investment_project_id', 'user_id'], 'investment_project_curator_unique');
        });

        // Backfill: seed the creator (created_by) as a curator for existing projects
        $projects = DB::table('investment_projects')
            ->whereNotNull('created_by')
            ->select('id', 'created_by')
            ->get();

        $now = now();
        $rows = [];
        foreach ($projects as $project) {
            $rows[] = [
                'investment_project_id' => $project->id,
                'user_id' => $project->created_by,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (! empty($rows)) {
            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('investment_project_curator')->insertOrIgnore($chunk);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_curator');
    }
};
