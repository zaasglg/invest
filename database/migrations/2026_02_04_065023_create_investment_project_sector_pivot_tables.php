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
        // Pivot table for investment_projects and sezs
        Schema::create('investment_project_sez', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained('investment_projects')->onDelete('cascade');
            $table->foreignId('sez_id')->constrained('sezs')->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['investment_project_id', 'sez_id']);
        });

        // Pivot table for investment_projects and industrial_zones
        Schema::create('investment_project_industrial_zone', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained('investment_projects')->onDelete('cascade');
            $table->foreignId('industrial_zone_id')->constrained('industrial_zones')->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['investment_project_id', 'industrial_zone_id']);
        });

        // Pivot table for investment_projects and subsoil_users
        Schema::create('investment_project_subsoil_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained('investment_projects')->onDelete('cascade');
            $table->foreignId('subsoil_user_id')->constrained('subsoil_users')->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['investment_project_id', 'subsoil_user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investment_project_subsoil_user');
        Schema::dropIfExists('investment_project_industrial_zone');
        Schema::dropIfExists('investment_project_sez');
    }
};
