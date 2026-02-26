<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sezs', function (Blueprint $table) {
            $table->dropColumn('investment_total');
        });

        Schema::table('industrial_zones', function (Blueprint $table) {
            $table->dropColumn('investment_total');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sezs', function (Blueprint $table) {
            $table->decimal('investment_total', 18, 2)->nullable()->after('total_area');
        });

        Schema::table('industrial_zones', function (Blueprint $table) {
            $table->decimal('investment_total', 18, 2)->nullable()->after('total_area');
        });
    }
};
