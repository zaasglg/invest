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
        Schema::create('project_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('investment_projects')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('assigned_to')->constrained('users')->onDelete('cascade');
            $table->date('due_date')->nullable();
            $table->enum('status', ['new', 'in_progress', 'done', 'rejected'])->default('new');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_tasks');
    }
};
