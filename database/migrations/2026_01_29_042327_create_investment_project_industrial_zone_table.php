<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_industrial_zone', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained()->onDelete('cascade');
            $table->foreignId('industrial_zone_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['investment_project_id', 'industrial_zone_id'], 'ip_iz_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_industrial_zone');
    }
};
