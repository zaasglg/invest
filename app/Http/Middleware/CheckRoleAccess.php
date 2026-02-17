<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRoleAccess
{
    /**
     * Routes that read-only roles (akim/zamakim) are NOT allowed to access.
     */
    protected array $readOnlyBlockedRoutes = [
        'regions',
        'project-types',
        'roles',
        'users',
    ];

    /**
     * Routes that only superadmin can access.
     * Ispolnitel and baskarma are blocked from these as well.
     */
    protected array $adminOnlyRoutes = [
        'project-types',
        'roles',
        'users',
    ];

    /**
     * Routes that are allowed for restricted roles even if the resource
     * is generally blocked. Use full route names (e.g. 'regions.show').
     */
    protected array $allowedForRestricted = [
        'regions.show',
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

        if (! $user) {
            return $next($request);
        }

        $roleName = $this->getRoleName($user);

        // Read-only roles (akim/zamakim): blocked sections + no writes
        if ($this->isReadOnlyRole($roleName)) {
            if ($this->isMatchingRoute($request, $this->readOnlyBlockedRoutes)) {
                abort(403, 'У вас нет доступа к этому разделу.');
            }

            if ($this->isWriteAction($request)) {
                abort(403, 'У вас нет прав на изменение данных.');
            }
        }

        // Limited roles (ispolnitel/baskarma): blocked from admin-only sections
        if ($this->isLimitedRole($roleName)) {
            if ($this->isMatchingRoute($request, $this->adminOnlyRoutes)) {
                abort(403, 'У вас нет доступа к этому разделу.');
            }
        }

        return $next($request);
    }

    /**
     * Get the normalized role name from the user's role model.
     */
    protected function getRoleName($user): ?string
    {
        return $user->roleModel?->name;
    }

    /**
     * Akim / zamakim — read-only, blocked from several sections.
     */
    protected function isReadOnlyRole(?string $roleName): bool
    {
        if (! $roleName) {
            return false;
        }

        $normalized = strtolower(str_replace(' ', '', $roleName));

        return str_contains($normalized, 'zamakim') || str_contains($normalized, 'akim');
    }

    /**
     * Ispolnitel / baskarma — can write to projects but blocked from admin sections.
     */
    protected function isLimitedRole(?string $roleName): bool
    {
        if (! $roleName) {
            return false;
        }

        return in_array($roleName, ['ispolnitel', 'baskarma'], true);
    }

    protected function isMatchingRoute(Request $request, array $blockedList): bool
    {
        $routeName = $request->route()?->getName();

        if (! $routeName) {
            return false;
        }

        // If this specific route is explicitly allowed for restricted roles,
        // do not treat it as blocked even if its resource is in the blocked list.
        if (in_array($routeName, $this->allowedForRestricted, true)) {
            return false;
        }

        foreach ($blockedList as $blocked) {
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
