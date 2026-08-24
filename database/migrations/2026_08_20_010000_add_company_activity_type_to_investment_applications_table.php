<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->string('company_activity_type')
                ->nullable()
                ->after('activity_sector');
        });

        DB::table('investment_applications')
            ->whereNull('company_activity_type')
            ->update([
                'company_activity_type' => DB::raw('activity_sector'),
            ]);
    }

    public function down(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->dropColumn('company_activity_type');
        });
    }
};
