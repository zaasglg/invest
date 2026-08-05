<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            $table->string('action_url')->nullable()->after('message');
            $table->string('action_label')->nullable()->after('action_url');
        });
    }

    public function down(): void
    {
        Schema::table('task_notifications', function (Blueprint $table) {
            $table->dropColumn(['action_url', 'action_label']);
        });
    }
};
