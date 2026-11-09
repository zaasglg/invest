<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->string('attraction_stage')->nullable();
        });

        DB::table('investment_projects')->where('status', 'plan')
            ->update(['attraction_stage' => 'potential']);

        Schema::create('project_attraction_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('investment_projects')->cascadeOnDelete();
            $table->string('attraction_stage');
            $table->string('event_name', 1000)->nullable();
            $table->date('event_date')->nullable();
            $table->text('result')->nullable();
            $table->string('next_action', 1000);
            $table->date('next_action_due_date');
            $table->foreignId('responsible_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['project_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_attraction_activities');
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropColumn('attraction_stage');
        });
    }
};
