<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_invest_sub_role_check');
            DB::statement(
                "ALTER TABLE users ADD CONSTRAINT users_invest_sub_role_check
                CHECK (invest_sub_role IN ('turkistan_invest', 'turkistan_invest_attraction', 'aea', 'ia', 'prom_zone'))"
            );
        } elseif ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE users MODIFY invest_sub_role
                ENUM('turkistan_invest', 'turkistan_invest_attraction', 'aea', 'ia', 'prom_zone') NULL"
            );
        }
    }

    public function down(): void
    {
        DB::table('users')
            ->where('invest_sub_role', 'turkistan_invest_attraction')
            ->update(['invest_sub_role' => 'turkistan_invest']);

        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_invest_sub_role_check');
            DB::statement(
                "ALTER TABLE users ADD CONSTRAINT users_invest_sub_role_check
                CHECK (invest_sub_role IN ('turkistan_invest', 'aea', 'ia', 'prom_zone'))"
            );
        } elseif ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE users MODIFY invest_sub_role
                ENUM('turkistan_invest', 'aea', 'ia', 'prom_zone') NULL"
            );
        }
    }
};
