<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('sequence repair migration advances lagging sequences without rewinding them', function () {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL-specific sequence test.');
    }

    User::factory()->count(3)->create();
    $maximumUserId = (int) User::query()->max('id');

    DB::statement(
        "SELECT setval(pg_get_serial_sequence('users', 'id'), 1, true)"
    );

    $migration = require database_path(
        'migrations/2026_08_06_020000_advance_postgresql_sequences.php'
    );
    $migration->up();

    $createdAfterRepair = User::factory()->create();
    expect($createdAfterRepair->id)->toBe($maximumUserId + 1);

    $futureSequenceValue = $createdAfterRepair->id + 25;
    DB::statement(
        "SELECT setval(pg_get_serial_sequence('users', 'id'), {$futureSequenceValue}, true)"
    );

    $migration->up();

    expect(User::factory()->create()->id)->toBe($futureSequenceValue + 1);
});

test('default sequence repair handles a sequence without an ownership link', function () {
    if (DB::getDriverName() !== 'pgsql') {
        $this->markTestSkipped('PostgreSQL-specific sequence test.');
    }

    User::factory()->count(3)->create();
    $maximumUserId = (int) User::query()->max('id');

    DB::statement('ALTER SEQUENCE public.users_id_seq OWNED BY NONE');
    DB::statement("SELECT setval('public.users_id_seq', 1, true)");

    expect(
        DB::scalar("SELECT pg_get_serial_sequence('public.users', 'id')")
    )->toBeNull();

    $migration = require database_path(
        'migrations/2026_08_06_030000_repair_postgresql_default_sequences.php'
    );
    $migration->up();

    expect(User::factory()->create()->id)->toBe($maximumUserId + 1);
});
