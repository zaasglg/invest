<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->string('project_name')->nullable()->change();
            $table->text('project_description')->nullable()->change();
            $table->string('activity_sector')->nullable()->change();
            $table->decimal('requested_area', 12, 2)->nullable()->change();
            $table->decimal('investment_amount', 18, 2)->nullable()->change();
            $table->unsignedInteger('jobs_count')->nullable()->change();
            $table->string('company_legal_form', 30)->nullable()->change();
            $table->string('company_name')->nullable()->change();
            $table->string('company_bin', 12)->nullable()->change();
            $table->date('company_registration_date')->nullable()->change();
            $table->unsignedBigInteger('company_region_id')->nullable()->change();
            $table->string('director_full_name')->nullable()->change();
            $table->string('contact_phone', 30)->nullable()->change();
            $table->string('contact_email')->nullable()->change();
            $table->text('legal_address')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->string('project_name')->nullable(false)->change();
            $table->text('project_description')->nullable(false)->change();
            $table->string('activity_sector')->nullable(false)->change();
            $table->decimal('requested_area', 12, 2)->nullable(false)->change();
            $table->decimal('investment_amount', 18, 2)->nullable(false)->change();
            $table->unsignedInteger('jobs_count')->nullable(false)->change();
            $table->string('company_legal_form', 30)->nullable(false)->change();
            $table->string('company_name')->nullable(false)->change();
            $table->string('company_bin', 12)->nullable(false)->change();
            $table->date('company_registration_date')->nullable(false)->change();
            $table->unsignedBigInteger('company_region_id')->nullable(false)->change();
            $table->string('director_full_name')->nullable(false)->change();
            $table->string('contact_phone', 30)->nullable(false)->change();
            $table->string('contact_email')->nullable(false)->change();
            $table->text('legal_address')->nullable(false)->change();
        });
    }
};
