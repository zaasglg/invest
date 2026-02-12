<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class DashboardCache
{
    /**
     * Clear all dashboard caches.
     */
    public static function clear(): void
    {
        $keys = [
            'dashboard.stats',
            'dashboard.investments_by_sector',
            'dashboard.projects_by_status',
            'dashboard.investment_trend',
            'dashboard.regions',
            'dashboard.regions.v2',
            'dashboard.region_stats',
            'dashboard.sector_summary',
        ];

        foreach ($keys as $key) {
            Cache::forget($key);
        }
    }
}
