<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subsoil_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subsoil_user_id')->constrained('subsoil_users')->onDelete('cascade');
            $table->string('file_path');
            $table->string('photo_type')->default('gallery');
            $table->date('gallery_date')->nullable();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('subsoil_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subsoil_user_id')->constrained('subsoil_users')->onDelete('cascade');
            $table->string('name');
            $table->string('file_path');
            $table->string('type')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subsoil_documents');
        Schema::dropIfExists('subsoil_photos');
    }
};
