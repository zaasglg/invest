<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dropForeignKey('user_id');
        $this->dropForeignKey('project_id');

        Schema::table('kpi_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
            $table->unsignedBigInteger('project_id')->nullable()->change();
            $table->foreign('project_id')
                ->references('id')
                ->on('investment_projects')
                ->nullOnDelete();

            $table->string('event', 100)->nullable()->after('action');
            $table->string('category', 50)->nullable()->after('event');
            $table->string('subject_type', 100)
                ->nullable()
                ->after('category');
            $table->unsignedBigInteger('subject_id')
                ->nullable()
                ->after('subject_type');
            $table->json('properties')->nullable()->after('subject_id');

            $table->index(
                ['project_id', 'created_at'],
                'kpi_logs_project_created_idx'
            );
            $table->index(
                ['project_id', 'category', 'created_at'],
                'kpi_logs_project_category_created_idx'
            );
            $table->index(
                ['subject_type', 'subject_id'],
                'kpi_logs_subject_idx'
            );
        });
    }

    public function down(): void
    {
        $this->dropForeignKey('user_id');
        $this->dropForeignKey('project_id');

        Schema::table('kpi_logs', function (Blueprint $table) {
            $table->dropIndex('kpi_logs_project_created_idx');
            $table->dropIndex('kpi_logs_project_category_created_idx');
            $table->dropIndex('kpi_logs_subject_idx');
            $table->dropColumn([
                'event',
                'category',
                'subject_type',
                'subject_id',
                'properties',
            ]);
        });

        DB::table('kpi_logs')
            ->whereNull('user_id')
            ->orWhereNull('project_id')
            ->delete();

        Schema::table('kpi_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->cascadeOnDelete();
            $table->unsignedBigInteger('project_id')
                ->nullable(false)
                ->change();
            $table->foreign('project_id')
                ->references('id')
                ->on('investment_projects')
                ->cascadeOnDelete();
        });
    }

    private function dropForeignKey(string $column): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            Schema::table('kpi_logs', function (Blueprint $table) use ($column) {
                $table->dropForeign([$column]);
            });

            return;
        }

        $constraints = DB::select(
            <<<'SQL'
                SELECT constraint_data.conname
                FROM (
                    SELECT constraint_row.conname, unnest(constraint_row.conkey) AS column_number
                    FROM pg_constraint AS constraint_row
                    INNER JOIN pg_class AS table_row
                        ON table_row.oid = constraint_row.conrelid
                    INNER JOIN pg_namespace AS namespace_row
                        ON namespace_row.oid = table_row.relnamespace
                    WHERE constraint_row.contype = 'f'
                        AND table_row.relname = 'kpi_logs'
                        AND namespace_row.nspname = current_schema()
                ) AS constraint_data
                INNER JOIN pg_attribute AS attribute_row
                    ON attribute_row.attrelid = 'kpi_logs'::regclass
                    AND attribute_row.attnum = constraint_data.column_number
                WHERE attribute_row.attname = ?
                SQL,
            [$column]
        );

        foreach ($constraints as $constraint) {
            $constraintName = str_replace(
                '"',
                '""',
                $constraint->conname
            );

            DB::statement(
                sprintf(
                    'ALTER TABLE "kpi_logs" DROP CONSTRAINT "%s"',
                    $constraintName
                )
            );
        }
    }
};
