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
        Schema::create('investment_projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('region_id')->constrained()->onDelete('cascade');
            $table->string('sector');
            $table->decimal('total_investment', 18, 2);
            $table->enum('status', ['plan', 'implementation', 'launched', 'suspended']);
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('investment_projects');
    }
};
