<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            $table->foreignId('project_id')->nullable()->constrained('investment_projects')->cascadeOnDelete();
            $table->string('dedupe_key')->nullable()->unique();
            $table->string('telegram_status', 20)->default('not_requested');
            $table->unsignedSmallInteger('telegram_attempts')->default(0);
            $table->timestamp('telegram_next_attempt_at')->nullable();
            $table->timestamp('telegram_sent_at')->nullable();
            $table->string('telegram_last_error')->nullable();
            $table->index(['telegram_status', 'telegram_next_attempt_at']);
        });
    }

    public function down(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
            $table->dropUnique(['dedupe_key']);
            $table->dropColumn('dedupe_key');
            $table->dropIndex(['telegram_status', 'telegram_next_attempt_at']);
            $table->dropColumn(['telegram_status', 'telegram_attempts', 'telegram_next_attempt_at', 'telegram_sent_at', 'telegram_last_error']);
        });
    }
};
