<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->foreignId('assigned_to')
                ->nullable()
                ->after('reviewed_by')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('assigned_at')->nullable()->after('assigned_to');
            $table->string('sector_review_status', 30)
                ->default('not_requested')
                ->after('assigned_at')
                ->index();
            $table->timestamp('sector_review_requested_at')
                ->nullable()
                ->after('sector_review_status');
            $table->foreignId('sector_review_requested_by')
                ->nullable()
                ->after('sector_review_requested_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('sector_reviewed_at')
                ->nullable()
                ->after('sector_review_requested_by');
            $table->foreignId('sector_reviewed_by')
                ->nullable()
                ->after('sector_reviewed_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->text('sector_review_comment')
                ->nullable()
                ->after('sector_reviewed_by');
            $table->decimal('sector_approved_area', 12, 2)
                ->nullable()
                ->after('sector_review_comment');
        });
    }

    public function down(): void
    {
        Schema::table('investment_applications', function (Blueprint $table) {
            $table->dropForeign(['assigned_to']);
            $table->dropForeign(['sector_review_requested_by']);
            $table->dropForeign(['sector_reviewed_by']);
            $table->dropColumn([
                'assigned_to',
                'assigned_at',
                'sector_review_status',
                'sector_review_requested_at',
                'sector_review_requested_by',
                'sector_reviewed_at',
                'sector_reviewed_by',
                'sector_review_comment',
                'sector_approved_area',
            ]);
        });
    }
};
