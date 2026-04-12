<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sez_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sez_id')->constrained('sezs')->onDelete('cascade');
            $table->string('file_path');
            $table->string('photo_type')->default('gallery');
            $table->date('gallery_date')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('industrial_zone_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('industrial_zone_id')->constrained('industrial_zones')->onDelete('cascade');
            $table->string('file_path');
            $table->string('photo_type')->default('gallery');
            $table->date('gallery_date')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('prom_zone_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prom_zone_id')->constrained('prom_zones')->onDelete('cascade');
            $table->string('file_path');
            $table->string('photo_type')->default('gallery');
            $table->date('gallery_date')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prom_zone_photos');
        Schema::dropIfExists('industrial_zone_photos');
        Schema::dropIfExists('sez_photos');
    }
};
