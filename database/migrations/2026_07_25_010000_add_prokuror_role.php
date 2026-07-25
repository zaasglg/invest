<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('roles')->where('name', 'prokuror')->exists()) {
            DB::table('roles')->insert([
                'name' => 'prokuror',
                'display_name' => 'Прокурор',
                'description' => 'Барлық бөлімдерді көреді және жоба жол картасына тапсырма қоса алады',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('roles')->where('name', 'prokuror')->delete();
    }
};
