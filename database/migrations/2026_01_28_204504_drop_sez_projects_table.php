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
        Schema::dropIfExists('sez_projects');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::create('sez_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sez_id')->constrained('sezs')->onDelete('cascade');
            $table->string('name');
            $table->decimal('investment_amount', 18, 2);
            $table->enum('status', ['planned', 'active', 'completed']);
            $table->timestamps();
        });
    }
};
