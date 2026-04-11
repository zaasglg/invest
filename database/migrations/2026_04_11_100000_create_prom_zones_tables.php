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
        Schema::create('prom_zones', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('region_id')->constrained('regions')->onDelete('cascade');
            $table->enum('status', ['active', 'developing', 'planned']);
            $table->decimal('total_area', 10, 2)->nullable();
            $table->json('infrastructure')->nullable();
            $table->json('location')->nullable();
            $table->text('description')->nullable();
            $table->json('geometry')->nullable();
            $table->timestamps();
        });

        Schema::create('prom_zone_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prom_zone_id')->constrained('prom_zones')->onDelete('cascade');
            $table->string('title');
            $table->text('description');
            $table->string('category')->nullable();
            $table->enum('severity', ['low', 'medium', 'high', 'critical']);
            $table->enum('status', ['open', 'in_progress', 'resolved'])->default('open');
            $table->timestamps();
        });

        Schema::create('investment_project_prom_zone', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained('investment_projects')->onDelete('cascade');
            $table->foreignId('prom_zone_id')->constrained('prom_zones')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['investment_project_id', 'prom_zone_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investment_project_prom_zone');
        Schema::dropIfExists('prom_zone_issues');
        Schema::dropIfExists('prom_zones');
    }
};
