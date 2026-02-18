<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\URL;

use function App\Http\Controllers\clearDashboardCache;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureDashboardCacheInvalidation();

        \App\Models\TaskNotification::observe(\App\Observers\TaskNotificationObserver::class);
    }

    /**
     * Register model event listeners that clear the dashboard cache
     * whenever relevant data changes.
     */
    protected function configureDashboardCacheInvalidation(): void
    {
        $models = [
            \App\Models\Region::class,
            \App\Models\Sez::class,
            \App\Models\IndustrialZone::class,
            \App\Models\InvestmentProject::class,
            \App\Models\SubsoilUser::class,
            \App\Models\SezIssue::class,
            \App\Models\IndustrialZoneIssue::class,
            \App\Models\SubsoilIssue::class,
            \App\Models\ProjectIssue::class,
        ];

        foreach ($models as $model) {
            $model::saved(fn () => clearDashboardCache());
            $model::deleted(fn () => clearDashboardCache());
        }
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(
            fn(): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );
    }
}
