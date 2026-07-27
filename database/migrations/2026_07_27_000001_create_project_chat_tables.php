<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')
                ->constrained('investment_projects')
                ->cascadeOnDelete();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->text('message');
            $table->timestamps();

            $table->index(
                ['investment_project_id', 'created_at'],
                'project_chat_messages_project_created_index'
            );
        });

        Schema::create('project_chat_reads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')
                ->constrained('investment_projects')
                ->cascadeOnDelete();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->foreignId('last_read_message_id')
                ->nullable()
                ->constrained('project_chat_messages')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(
                ['investment_project_id', 'user_id'],
                'project_chat_reads_project_user_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_chat_reads');
        Schema::dropIfExists('project_chat_messages');
    }
};
