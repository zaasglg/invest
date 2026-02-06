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
        Schema::create('sez_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sez_id')->constrained('sezs')->onDelete('cascade');
            $table->string('title');
            $table->text('description');
            $table->string('category')->nullable();
            $table->enum('severity', ['low', 'medium', 'high', 'critical']);
            $table->enum('status', ['open', 'in_progress', 'resolved'])->default('open');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sez_issues');
    }
};
