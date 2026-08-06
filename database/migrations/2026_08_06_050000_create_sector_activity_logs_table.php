<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sector_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('auditable_type', 100);
            $table->unsignedBigInteger('auditable_id');
            $table->string('action');
            $table->string('event', 100);
            $table->string('category', 50);
            $table->string('subject_type', 100)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();

            $table->index(
                ['auditable_type', 'auditable_id', 'created_at'],
                'sector_logs_auditable_created_idx'
            );
            $table->index(
                ['auditable_type', 'auditable_id', 'category', 'created_at'],
                'sector_logs_auditable_category_idx'
            );
            $table->index(
                ['subject_type', 'subject_id'],
                'sector_logs_subject_idx'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sector_activity_logs');
    }
};
