<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
            DO $$
            DECLARE
                sequence_record RECORD;
                maximum_value BIGINT;
                current_sequence_value BIGINT;
                target_sequence_value BIGINT;
            BEGIN
                FOR sequence_record IN
                    SELECT
                        namespaces.nspname AS schema_name,
                        tables.relname AS table_name,
                        attributes.attname AS column_name,
                        pg_get_serial_sequence(
                            format(
                                '%I.%I',
                                namespaces.nspname,
                                tables.relname
                            ),
                            attributes.attname
                        ) AS sequence_name
                    FROM pg_class AS tables
                    INNER JOIN pg_namespace AS namespaces
                        ON namespaces.oid = tables.relnamespace
                    INNER JOIN pg_attribute AS attributes
                        ON attributes.attrelid = tables.oid
                    WHERE tables.relkind IN ('r', 'p')
                        AND namespaces.nspname = current_schema()
                        AND attributes.attnum > 0
                        AND NOT attributes.attisdropped
                        AND pg_get_serial_sequence(
                            format(
                                '%I.%I',
                                namespaces.nspname,
                                tables.relname
                            ),
                            attributes.attname
                        ) IS NOT NULL
                LOOP
                    EXECUTE format(
                        'LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',
                        sequence_record.schema_name,
                        sequence_record.table_name
                    );

                    EXECUTE format(
                        'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',
                        sequence_record.column_name,
                        sequence_record.schema_name,
                        sequence_record.table_name
                    ) INTO maximum_value;

                    IF maximum_value = 0 THEN
                        CONTINUE;
                    END IF;

                    EXECUTE format(
                        'SELECT last_value FROM %s',
                        sequence_record.sequence_name
                    ) INTO current_sequence_value;

                    target_sequence_value := GREATEST(
                        maximum_value,
                        current_sequence_value
                    );

                    PERFORM setval(
                        sequence_record.sequence_name::regclass,
                        target_sequence_value,
                        true
                    );
                END LOOP;
            END
            $$;
            SQL);
    }

    public function down(): void
    {
        // Sequence advancement is intentionally not reversed.
    }
};
