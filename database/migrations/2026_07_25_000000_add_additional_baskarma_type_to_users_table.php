<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_baskarma_type_check');
            DB::statement(
                "ALTER TABLE users ADD CONSTRAINT users_baskarma_type_check
                CHECK (baskarma_type IN ('oblast', 'district', 'additional'))"
            );
        } elseif ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE users MODIFY baskarma_type
                ENUM('oblast', 'district', 'additional') NULL"
            );
        }

        DB::table('users')
            ->where('baskarma_type', 'oblast')
            ->whereRaw('LOWER(position) LIKE ?', ['%департаменті'])
            ->update(['baskarma_type' => 'additional']);
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_baskarma_type_check');
        }

        DB::table('users')
            ->where('baskarma_type', 'additional')
            ->update(['baskarma_type' => 'oblast']);

        if ($driver === 'pgsql') {
            DB::statement(
                "ALTER TABLE users ADD CONSTRAINT users_baskarma_type_check
                CHECK (baskarma_type IN ('oblast', 'district'))"
            );
        } elseif ($driver === 'mysql') {
            DB::statement(
                "ALTER TABLE users MODIFY baskarma_type
                ENUM('oblast', 'district') NULL"
            );
        }
    }
};
