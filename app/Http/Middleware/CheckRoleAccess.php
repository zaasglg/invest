<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRoleAccess
{
    /**
     * Routes that akim/zamakim roles are NOT allowed to access at all.
     */
    protected array $blockedRouteNames = [
        'regions',
        'project-types',
        'roles',
        'users',
    ];

    /**
     * Route action suffixes that modify data (create/store/edit/update/destroy).
     */
    protected array $writeSuffixes = [
        '.create',
        '.store',
        '.edit',
        '.update',
        '.destroy',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $this->isRestrictedRole($user)) {
            return $next($request);
        }

        // Fully blocked sections
        if ($this->isBlockedRoute($request)) {
            abort(403, 'У вас нет доступа к этому разделу.');
        }

        // Read-only: block any write action (create/store/edit/update/destroy)
        if ($this->isWriteAction($request)) {
            abort(403, 'У вас нет прав на изменение данных.');
        }

        return $next($request);
    }

    protected function isRestrictedRole($user): bool
    {
        $roleCandidates = array_filter([
            $user->role,
            $user->roleModel?->name,
            $user->roleModel?->display_name,
        ]);

        foreach ($roleCandidates as $candidate) {
            $normalized = strtolower(str_replace(' ', '', $candidate));

            if (str_contains($normalized, 'zamakim') || str_contains($normalized, 'akim')) {
                return true;
            }
        }

        return false;
    }

    protected function isBlockedRoute(Request $request): bool
    {
        $routeName = $request->route()?->getName();

        if (! $routeName) {
            return false;
        }

        foreach ($this->blockedRouteNames as $blocked) {
            if ($routeName === $blocked || str_starts_with($routeName, $blocked . '.')) {
                return true;
            }
        }

        return false;
    }

    protected function isWriteAction(Request $request): bool
    {
        $routeName = $request->route()?->getName();

        if (! $routeName) {
            return false;
        }

        foreach ($this->writeSuffixes as $suffix) {
            if (str_ends_with($routeName, $suffix)) {
                return true;
            }
        }

        // Also block non-GET/HEAD methods as a safety net
        return ! $request->isMethodSafe();
    }
}
