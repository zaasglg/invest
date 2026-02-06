<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_sez', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained()->onDelete('cascade');
            $table->foreignId('sez_id')->constrained('sezs')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['investment_project_id', 'sez_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_sez');
    }
};
