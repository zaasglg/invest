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
            $table->json('infrastructure')->nullable();
            $table->json('location')->nullable(); // Using JSON for coordinates as PostGIS might not be enabled
            $table->text('description')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sezs', function (Blueprint $table) {
            $table->dropColumn(['infrastructure', 'location', 'description']);
        });
    }
};
