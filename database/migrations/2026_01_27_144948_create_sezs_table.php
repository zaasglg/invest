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
        Schema::create('sezs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('region_id')->constrained('regions')->onDelete('cascade');
            $table->decimal('total_area', 10, 2);
            $table->decimal('investment_total', 18, 2);
            $table->enum('status', ['active', 'developing']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sezs');
    }
};
