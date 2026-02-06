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
        Schema::create('region_ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('region_id')->constrained('regions')->onDelete('cascade');
            $table->integer('rating_score');
            $table->timestamp('calculated_at')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('region_ratings');
    }
};
