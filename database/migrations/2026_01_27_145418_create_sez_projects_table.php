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
        Schema::create('sez_projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sez_id')->constrained('sezs')->onDelete('cascade');
            $table->string('name');
            $table->string('sector');
            $table->decimal('investment', 18, 2);
            $table->enum('status', ['plan', 'implementation', 'launched']);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sez_projects');
    }
};
