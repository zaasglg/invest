<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_application_project_type', function (Blueprint $table) {
            $table->foreignId('investment_application_id')
                ->constrained('investment_applications')
                ->cascadeOnDelete();
            $table->foreignId('project_type_id')
                ->constrained('project_types')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['investment_application_id', 'project_type_id'],
                'investment_application_type_unique'
            );
        });

        $projectTypes = DB::table('project_types')
            ->get(['id', 'name'])
            ->keyBy(fn ($type) => mb_strtolower(trim($type->name)));

        DB::table('investment_applications')
            ->select(['id', 'activity_sector'])
            ->orderBy('id')
            ->chunkById(500, function ($applications) use ($projectTypes): void {
                $now = now();
                $rows = $applications->flatMap(function ($application) use (
                    $projectTypes,
                    $now
                ) {
                    $names = collect(explode(',', $application->activity_sector))
                        ->map(fn (string $name) => mb_strtolower(trim($name)))
                        ->filter()
                        ->unique();

                    return $names
                        ->map(fn (string $name) => $projectTypes->get($name))
                        ->filter()
                        ->map(fn ($type) => [
                            'investment_application_id' => $application->id,
                            'project_type_id' => $type->id,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                })->all();

                if ($rows !== []) {
                    DB::table('investment_application_project_type')
                        ->insertOrIgnore($rows);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_application_project_type');
    }
};
