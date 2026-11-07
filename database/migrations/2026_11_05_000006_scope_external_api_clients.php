<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('api_clients', function (Blueprint $table) {
            $table->json('allowed_region_ids')->nullable();
            $table->json('allowed_project_ids')->nullable();
            $table->boolean('include_contacts')->default(false);
            $table->boolean('include_internal')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('api_clients', function (Blueprint $table) {
            $table->dropColumn(['allowed_region_ids', 'allowed_project_ids', 'include_contacts', 'include_internal']);
        });
    }
};
