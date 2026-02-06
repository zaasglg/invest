<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('investment_project_sez');
        Schema::dropIfExists('investment_project_industrial_zone');
        Schema::dropIfExists('investment_project_subsoil_user');
    }

    public function down(): void
    {
        // Recreate tables if needed
        Schema::create('investment_project_sez', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained()->onDelete('cascade');
            $table->foreignId('sez_id')->constrained('sezs')->onDelete('cascade');
            $table->timestamps();
            $table->unique(['investment_project_id', 'sez_id']);
        });

        Schema::create('investment_project_industrial_zone', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained()->onDelete('cascade');
            $table->foreignId('industrial_zone_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            $table->unique(['investment_project_id', 'industrial_zone_id'], 'ip_iz_unique');
        });

        Schema::create('investment_project_subsoil_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained()->onDelete('cascade');
            $table->foreignId('subsoil_user_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            $table->unique(['investment_project_id', 'subsoil_user_id'], 'ip_su_unique');
        });
    }
};
