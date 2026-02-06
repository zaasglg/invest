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
        Schema::create('industrial_plots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('industrial_zone_id')->constrained('industrial_zones')->onDelete('cascade');
            $table->decimal('area', 10, 2);
            $table->enum('status', ['free', 'occupied']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('industrial_plots');
    }
};
