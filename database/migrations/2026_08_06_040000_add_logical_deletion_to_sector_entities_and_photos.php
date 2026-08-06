<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ENTITY_TABLES = [
        'sezs',
        'industrial_zones',
        'prom_zones',
        'subsoil_users',
    ];

    private const PHOTO_TABLES = [
        'project_photos',
        'sez_photos',
        'industrial_zone_photos',
        'prom_zone_photos',
        'subsoil_photos',
    ];

    public function up(): void
    {
        foreach ([...self::ENTITY_TABLES, ...self::PHOTO_TABLES] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->boolean('is_deleted')->default(false)->index();
                $blueprint->foreignId('deleted_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();
                $blueprint->timestamp('deleted_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach ([...self::PHOTO_TABLES, ...self::ENTITY_TABLES] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropConstrainedForeignId('deleted_by');
                $blueprint->dropColumn(['is_deleted', 'deleted_at']);
            });
        }
    }
};
