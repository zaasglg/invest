<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->string('investor_country_code', 2)->nullable();
            $table->foreignId('attraction_handover_requested_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->text('attraction_handover_rejection_reason')->nullable();
            $table->timestamp('attraction_handover_rejected_at')->nullable();
            $table->foreignId('attraction_handover_rejected_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->index('investor_country_code');
            $table->index([
                'status',
                'attraction_stage',
                'attraction_handover_requested_at',
            ], 'investment_projects_reserve_queue_index');
        });
    }

    public function down(): void
    {
        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropIndex('investment_projects_reserve_queue_index');
            $table->dropIndex(['investor_country_code']);
            $table->dropConstrainedForeignId('attraction_handover_requested_by');
            $table->dropConstrainedForeignId('attraction_handover_rejected_by');
            $table->dropColumn([
                'investor_country_code',
                'attraction_handover_rejection_reason',
                'attraction_handover_rejected_at',
            ]);
        });
    }
};
