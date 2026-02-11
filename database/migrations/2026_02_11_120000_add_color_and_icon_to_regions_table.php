<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('regions', function (Blueprint $table) {
            $table->string('color', 7)
                ->default('#3B82F6')
                ->after('name');
            $table->string('icon')
                ->default('factory')
                ->after('color');
        });

        DB::table('regions')
            ->whereNull('color')
            ->update(['color' => '#3B82F6']);

        DB::table('regions')
            ->whereNull('icon')
            ->update(['icon' => 'factory']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('regions', function (Blueprint $table) {
            $table->dropColumn(['color', 'icon']);
        });
    }
};

