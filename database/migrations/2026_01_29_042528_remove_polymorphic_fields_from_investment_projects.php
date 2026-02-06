<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropIndex(['investable_type', 'investable_id']);
            $table->dropColumn(['investable_type', 'investable_id']);
        });
    }

    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->string('investable_type')->nullable();
            $table->unsignedBigInteger('investable_id')->nullable();
            $table->index(['investable_type', 'investable_id']);
        });
    }
};
