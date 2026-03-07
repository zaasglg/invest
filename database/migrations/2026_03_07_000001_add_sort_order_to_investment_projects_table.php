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
            $table->unsignedInteger('sort_order')->default(0)->after('region_id');
        });

        // Initialise sort_order per region based on existing id ordering
        $regionIds = DB::table('investment_projects')
            ->select('region_id')
            ->distinct()
            ->pluck('region_id');

        foreach ($regionIds as $regionId) {
            $ids = DB::table('investment_projects')
                ->where('region_id', $regionId)
                ->orderBy('id')
                ->pluck('id');

            foreach ($ids as $index => $id) {
                DB::table('investment_projects')
                    ->where('id', $id)
                    ->update(['sort_order' => $index]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
