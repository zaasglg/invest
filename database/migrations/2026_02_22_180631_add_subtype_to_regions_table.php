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
        Schema::table('regions', function (Blueprint $table) {
            $table->string('subtype')->nullable()->after('type');
        });

        // Set default subtype for existing district records
        \DB::table('regions')->where('type', 'district')->whereNull('subtype')->update(['subtype' => 'district']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('regions', function (Blueprint $table) {
            $table->dropColumn('subtype');
        });
    }
};
