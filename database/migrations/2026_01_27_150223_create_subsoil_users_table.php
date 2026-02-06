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
        Schema::create('subsoil_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('bin', 20);
            $table->foreignId('region_id')->constrained('regions')->onDelete('cascade');
            $table->string('mineral_type');
            $table->enum('license_status', ['active', 'expired', 'suspended']);
            $table->date('license_end')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subsoil_users');
    }
};
