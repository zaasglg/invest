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
        Schema::create('subsoil_plots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subsoil_user_id')->constrained('subsoil_users')->onDelete('cascade');
            $table->foreignId('region_id')->constrained('regions')->onDelete('cascade');
            $table->jsonb('geometry')->nullable(); // Using jsonb as fallback for geometry
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subsoil_plots');
    }
};
