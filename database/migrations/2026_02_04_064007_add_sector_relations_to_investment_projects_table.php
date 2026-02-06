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
        Schema::table('investment_projects', function (Blueprint $table) {
            // Удаляем старое текстовое поле sector
            $table->dropColumn('sector');
            
            // Добавляем nullable foreign keys для связи с СЭЗ, ИЗ и недропользователями
            $table->foreignId('sez_id')->nullable()->constrained('sezs')->onDelete('set null');
            $table->foreignId('industrial_zone_id')->nullable()->constrained('industrial_zones')->onDelete('set null');
            $table->foreignId('subsoil_user_id')->nullable()->constrained('subsoil_users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropForeign(['sez_id']);
            $table->dropForeign(['industrial_zone_id']);
            $table->dropForeign(['subsoil_user_id']);
            
            $table->dropColumn(['sez_id', 'industrial_zone_id', 'subsoil_user_id']);
            
            // Возвращаем старое поле
            $table->string('sector');
        });
    }
};
