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
        Schema::table('subsoil_users', function (Blueprint $table) {
            $table->date('license_start')->nullable();
            $table->json('location')->nullable(); // Coordinates
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subsoil_users', function (Blueprint $table) {
            $table->dropColumn(['license_start', 'location']);
        });
    }
};
