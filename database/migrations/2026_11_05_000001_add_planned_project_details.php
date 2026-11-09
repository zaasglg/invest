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
            $table->decimal('total_investment', 18, 2)->nullable()->change();
            $table->string('investment_amount_type')->default('exact');
            $table->foreignId('attraction_handover_to_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('attraction_handover_requested_at')->nullable();
            $table->timestamp('attraction_handover_accepted_at')->nullable();
            $table->foreignId('attraction_handover_accepted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('attraction_decline_reason')->nullable();
            $table->date('attraction_resume_on')->nullable();
        });
    }

    public function down(): void
    {
        if (DB::table('investment_projects')->whereNull('total_investment')->exists()) {
            throw new RuntimeException('Белгісіз инвестиция сомаларын толтырмай бұл миграцияны кері қайтаруға болмайды.');
        }

        Schema::table('investment_projects', function (Blueprint $table) {
            $table->dropConstrainedForeignId('attraction_handover_to_id');
            $table->dropConstrainedForeignId('attraction_handover_accepted_by');
            $table->dropColumn([
                'investment_amount_type', 'attraction_handover_requested_at',
                'attraction_handover_accepted_at', 'attraction_decline_reason', 'attraction_resume_on',
            ]);
            $table->decimal('total_investment', 18, 2)->nullable(false)->change();
        });
    }
};
