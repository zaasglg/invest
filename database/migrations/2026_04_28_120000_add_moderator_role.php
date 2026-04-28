<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $exists = DB::table('roles')->where('name', 'moderator')->exists();

        if (! $exists) {
            DB::table('roles')->insert([
                'name' => 'moderator',
                'display_name' => 'Модератор',
                'description' => 'Тапсырмаларды қабылдайды немесе қабылдамайды',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('roles')->where('name', 'moderator')->delete();
    }
};
