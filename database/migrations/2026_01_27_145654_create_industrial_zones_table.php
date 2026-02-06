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
        Schema::create('industrial_zones', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('region_id')->constrained('regions')->onDelete('cascade');
            $table->enum('status', ['active', 'developing', 'planned']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('industrial_zones');
    }
};
