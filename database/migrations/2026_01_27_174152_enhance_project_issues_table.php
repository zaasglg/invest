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
        Schema::table('project_issues', function (Blueprint $table) {
            $table->string('title')->after('project_id');
            $table->string('category')->nullable()->after('description'); // e.g. 'infrastructure', 'bureaucracy'
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_issues', function (Blueprint $table) {
            //
        });
    }
};
