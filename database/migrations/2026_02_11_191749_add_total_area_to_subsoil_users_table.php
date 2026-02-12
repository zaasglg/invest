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
        Schema::table('subsoil_users', function (Blueprint $table) {
            $table->decimal('total_area', 12, 2)->nullable()->after('mineral_type');
        });
    }

    public function down(): void
    {
        Schema::table('subsoil_users', function (Blueprint $table) {
            $table->dropColumn('total_area');
        });
    }
};
