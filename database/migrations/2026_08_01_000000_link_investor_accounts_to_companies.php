<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('company_id')
                ->nullable()
                ->unique()
                ->after('role_id')
                ->constrained('companies')
                ->cascadeOnDelete();
        });

        $investorRoleId = DB::table('roles')
            ->where('name', 'investor')
            ->value('id');

        if ($investorRoleId !== null) {
            // Legacy investors were created manually and are not compatible
            // with the new one-investor-per-company account model.
            DB::table('users')
                ->where('role_id', $investorRoleId)
                ->delete();
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('company_id');
        });
    }
};
