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
        Schema::create('project_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('investment_projects')->onDelete('cascade');
            $table->string('file_path');
            $table->date('gallery_date')->nullable(); // NULL = Main Gallery, Date = Specific Date Gallery
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_photos');
    }
};
