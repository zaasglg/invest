<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    /**
     * Create the application and prevent tests from touching a non-test
     * database when a stale configuration cache is present.
     */
    public function createApplication(): Application
    {
        $app = parent::createApplication();

        if (! $app->environment('testing')) {
            throw new RuntimeException(
                'Tests were aborted because APP_ENV is not testing. '
                .'Run "php artisan config:clear" before running the suite.'
            );
        }

        $connection = (string) $app['config']->get('database.default');
        $database = (string) $app['config']->get(
            "database.connections.{$connection}.database"
        );
        $isIsolatedDatabase = $database === 'invest_testing'
            || preg_match('/^invest_testing_test_\d+$/', $database) === 1;

        if ($connection !== 'pgsql' || ! $isIsolatedDatabase) {
            throw new RuntimeException(
                "Tests were aborted because {$connection}:{$database} is not "
                .'an isolated PostgreSQL test database.'
            );
        }

        return $app;
    }
}
