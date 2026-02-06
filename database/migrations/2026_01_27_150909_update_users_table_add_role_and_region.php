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
        Schema::table('users', function (Blueprint $table) {
            $table->renameColumn('name', 'full_name');
            $table->enum('role', [
                'admin',
                'invest',
                'akim',
                'deputy_akim',
                'district_user',
                'manager',
            ])->default('district_user')->after('email'); // Default role just in case
            $table->foreignId('region_id')->nullable()->constrained('regions')->onDelete('set null')->after('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            //
        });
    }
};
