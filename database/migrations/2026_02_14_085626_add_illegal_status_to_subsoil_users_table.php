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
        DB::statement("ALTER TABLE subsoil_users DROP CONSTRAINT subsoil_users_license_status_check");
        DB::statement("ALTER TABLE subsoil_users ADD CONSTRAINT subsoil_users_license_status_check CHECK (license_status::text = ANY (ARRAY['active', 'expired', 'suspended', 'illegal']))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE subsoil_users DROP CONSTRAINT subsoil_users_license_status_check");
        DB::statement("ALTER TABLE subsoil_users ADD CONSTRAINT subsoil_users_license_status_check CHECK (license_status::text = ANY (ARRAY['active', 'expired', 'suspended']))");
    }
};
