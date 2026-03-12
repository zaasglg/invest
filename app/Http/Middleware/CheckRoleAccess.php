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
     * Routes completely blocked for ispolnitel and baskarma.
     * (regions.index — listing all regions)
     */
    protected array $limitedBlockedRoutes = [
        'regions',
    ];

    /**
     * Routes that are allowed for restricted roles even if the resource
     * is generally blocked. Use full route names (e.g. 'regions.show').
     */
    protected array $allowedForRestricted = [
        'regions.show',
        'investment-projects.tasks.completions.store',
        'subsoil-users.tasks.completions.store',
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
                abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
            }

            if ($this->isWriteAction($request)) {
                abort(403, 'Сізде деректерді өзгерту құқығы жоқ.');
            }
        }

        // Limited roles (ispolnitel/baskarma): blocked from admin-only sections + regions
        if ($this->isLimitedRole($roleName)) {
            if ($this->isMatchingRoute($request, $this->adminOnlyRoutes)) {
                abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
            }

            $routeName = $request->route()?->getName();

            // Ispolnitel: blocked from regions list & write routes,
            // but allowed to view their own district (regions.show)
            if ($roleName === 'ispolnitel') {
                if ($this->isMatchingRoute($request, $this->limitedBlockedRoutes)) {
                    abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
                }
            }

            // Baskarma: read-only on SEZ, IZ, Subsoil, Projects, Regions.
            // Can view/enter but cannot create, edit, or delete.
            if ($roleName === 'baskarma') {
                // Block regions listing but allow show
                if ($routeName === 'regions.index' || $routeName === 'regions.create'
                    || $routeName === 'regions.store' || $routeName === 'regions.edit'
                    || $routeName === 'regions.update' || $routeName === 'regions.destroy') {
                    abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
                }

                // Block write actions on SEZ, IZ, Subsoil, Projects
                if ($this->isWriteAction($request)) {
                    $baskarmaReadOnly = ['sezs', 'industrial-zones', 'subsoil-users', 'investment-projects'];
                    if ($this->isMatchingRoute($request, $baskarmaReadOnly)) {
                        abort(403, 'Сізде деректерді өзгерту құқығы жоқ.');
                    }
                }
            }

            // District-scoping: ispolnitel and district baskarma can only access
            // their own region's SEZ/IZ/Subsoil resources
            $this->enforceDistrictScope($request, $user);
        }

        // Block non-superadmin from accessing archived investment projects
        $this->blockArchivedProjectAccess($request, $user, $roleName);

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

    /**
     * Enforce district-scoping for ispolnitel and district baskarma.
     * They can only access SEZ/IZ/Subsoil/Regions belonging to their region.
     * Oblast baskarma can access all.
     */
    protected function enforceDistrictScope(Request $request, $user): void
    {
        if (! $user->isDistrictScoped()) {
            return;
        }

        $routeName = $request->route()?->getName();

        if (! $routeName) {
            return;
        }

        // Check SEZ routes
        if (str_starts_with($routeName, 'sezs.')) {
            $sez = $request->route('sez');
            if ($sez && is_object($sez) && $sez->region_id !== $user->region_id) {
                abort(403, 'Сізге бұл АЭА-ға кіруге рұқсат етілмеген.');
            }
        }

        // Check Industrial Zone routes
        if (str_starts_with($routeName, 'industrial-zones.')) {
            $iz = $request->route('industrialZone') ?? $request->route('industrial_zone');
            if ($iz && is_object($iz) && $iz->region_id !== $user->region_id) {
                abort(403, 'Сізге бұл ИА-ға кіруге рұқсат етілмеген.');
            }
        }

        // Check Subsoil User routes
        if (str_starts_with($routeName, 'subsoil-users.')) {
            $su = $request->route('subsoilUser') ?? $request->route('subsoil_user');
            if ($su && is_object($su) && $su->region_id !== $user->region_id) {
                abort(403, 'Сізге бұл жер қойнауын пайдаланушыға кіруге рұқсат етілмеген.');
            }
        }

        // Check Region show — district-scoped users can only view their own region
        if ($routeName === 'regions.show') {
            $region = $request->route('region');
            if ($region && is_object($region) && $region->id !== $user->region_id) {
                abort(403, 'Сізге бұл ауданға кіруге рұқсат етілмеген.');
            }
        }
    }

    /**
     * Block non-superadmin users from accessing archived investment projects.
     */
    protected function blockArchivedProjectAccess(Request $request, $user, ?string $roleName): void
    {
        if ($roleName === 'superadmin') {
            return;
        }

        $routeName = $request->route()?->getName();
        if (! $routeName) {
            return;
        }

        // Only check routes related to investment projects
        if (! str_starts_with($routeName, 'investment-projects.')) {
            return;
        }

        $project = $request->route('investmentProject') ?? $request->route('investment_project');

        if ($project && is_object($project) && $project->is_archived) {
            abort(403, 'Бұл жоба архивтелген. Қол жеткізу мүмкін емес.');
        }
    }
}
