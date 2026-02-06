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
        Schema::dropIfExists('sez_plots');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('sez_plots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sez_id')->constrained('sezs')->onDelete('cascade');
            $table->string('cadastral_number');
            $table->decimal('area', 10, 2);
            $table->enum('status', ['vacant', 'occupied', 'reserved']);
            $table->jsonb('geometry')->nullable();
            $table->timestamps();
        });
    }
};
