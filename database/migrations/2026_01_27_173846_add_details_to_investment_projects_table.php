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
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->foreignId('executor_id')->nullable()->constrained('users')->onDelete('set null')->after('created_by');
            $table->string('company_name')->nullable()->after('name');
            $table->text('description')->nullable()->after('company_name');
            $table->jsonb('geometry')->nullable()->after('end_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            //
        });
    }
};
