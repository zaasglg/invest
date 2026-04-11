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
     * Ispolnitel is blocked from these as well.
     */
    protected array $adminOnlyRoutes = [
        'roles',
        'users',
    ];

    /**
     * Routes completely blocked for invest and ispolnitel.
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
        'investment-projects.documents.store',
        'investment-projects.documents.destroy',
        'investment-projects.gallery.store',
        'investment-projects.gallery.update',
        'investment-projects.gallery.destroy',
        'investment-projects.issues.store',
        'investment-projects.issues.update',
        'investment-projects.issues.destroy',
        'investment-projects.update-status',
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
     * Non-mutating routes that use non-safe HTTP methods (e.g. POST for downloads).
     */
    protected array $nonMutatingRoutes = [
        'investment-projects.bulk-presentation',
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

        $routeName = $request->route()?->getName();

        // Only superadmin can access regions routes, EXCEPT regions.show and regions.projects.reorder
        if ($routeName && str_starts_with($routeName, 'regions.')) {
            $allowedRegionsRoutes = ['regions.show', 'regions.projects.reorder'];
            if (! in_array($routeName, $allowedRegionsRoutes, true) && $roleName !== 'superadmin') {
                abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
            }
        }

        if ($routeName === 'regions' && $roleName !== 'superadmin') {
            abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
        }

        // Read-only roles (akim/zamakim): blocked sections + no writes
        if ($this->isReadOnlyRole($roleName)) {
            if ($this->isMatchingRoute($request, $this->readOnlyBlockedRoutes)) {
                abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
            }

            if ($this->isWriteAction($request)) {
                abort(403, 'Сізде деректерді өзгерту құқығы жоқ.');
            }
        }

        // Limited roles (invest/ispolnitel): blocked from admin-only sections + regions
        if ($this->isLimitedRole($roleName)) {
            if ($this->isMatchingRoute($request, $this->adminOnlyRoutes)) {
                abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
            }

            $routeName = $request->route()?->getName();

            // Invest: blocked from regions list & write routes,
            // but allowed to view their own district (regions.show)
            if ($roleName === 'invest') {
                if ($this->isMatchingRoute($request, $this->limitedBlockedRoutes)) {
                    abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
                }
            }

            // Ispolnitel: blocked from project-types and regions management.
            // Can write to documents, gallery, issues, and current status on own-district projects.
            if ($roleName === 'ispolnitel') {
                // Block project-types for ispolnitel
                if ($this->isMatchingRoute($request, ['project-types'])) {
                    abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
                }

                // Block region management actions, allow listing/show
                if ($routeName === 'regions.create'
                    || $routeName === 'regions.store' || $routeName === 'regions.edit'
                    || $routeName === 'regions.update' || $routeName === 'regions.destroy') {
                    abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
                }

                // Block write actions on SEZ, IZ, Subsoil, and main project edit/create
                if ($this->isWriteAction($request)) {
                    $ispolnitelReadOnly = ['sezs', 'industrial-zones', 'prom-zones', 'subsoil-users'];
                    if ($this->isMatchingRoute($request, $ispolnitelReadOnly)) {
                        abort(403, 'Сізде деректерді өзгерту құқығы жоқ.');
                    }

                    // Block main project create/edit/destroy (but allow sub-resource writes)
                    if ($routeName === 'investment-projects.create'
                        || $routeName === 'investment-projects.store'
                        || $routeName === 'investment-projects.edit'
                        || $routeName === 'investment-projects.update'
                        || $routeName === 'investment-projects.destroy') {
                        abort(403, 'Сізде жобаны өзгерту құқығы жоқ.');
                    }

                    // For allowed write routes (documents, gallery, issues, update-status),
                    // enforce district-scope: ispolnitel can only write to own-district projects
                    $this->enforceIspolnitelProjectWrite($request, $user);
                }
            }

            // District-scoping: invest and district ispolnitel can only access
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
     * Invest / ispolnitel — can write to projects but blocked from admin sections.
     */
    protected function isLimitedRole(?string $roleName): bool
    {
        if (! $roleName) {
            return false;
        }

        return in_array($roleName, ['invest', 'ispolnitel'], true);
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
            if ($routeName === $blocked || str_starts_with($routeName, $blocked.'.')) {
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

        if (in_array($routeName, $this->nonMutatingRoutes, true)) {
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
     * Enforce district-scoping for invest and district ispolnitel.
     * They can only access SEZ/IZ/Subsoil/Regions belonging to their region.
     * Oblast ispolnitel can access all.
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

        // Check Prom Zone routes
        if (str_starts_with($routeName, 'prom-zones.')) {
            $promZone = $request->route('promZone') ?? $request->route('prom_zone');
            if ($promZone && is_object($promZone) && $promZone->region_id !== $user->region_id) {
                abort(403, 'Сізге бұл Пром зонаға кіруге рұқсат етілмеген.');
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
        // Ispolnitel can view any region
        $roleName = $this->getRoleName($user);
        if ($routeName === 'regions.show' && $roleName !== 'ispolnitel') {
            $region = $request->route('region');
            if ($region && is_object($region) && $region->id !== $user->region_id) {
                abort(403, 'Сізге бұл ауданға кіруге рұқсат етілмеген.');
            }
        }
    }

    /**
     * Enforce district-scoping for ispolnitel write actions on project sub-resources.
     * Ispolnitel can only write to documents/gallery/issues of projects in their own district.
     */
    protected function enforceIspolnitelProjectWrite(Request $request, $user): void
    {
        $project = $request->route('investmentProject') ?? $request->route('investment_project');

        if ($project && is_object($project)) {
            // District ispolnitel can only write to own-district projects
            if ($user->isDistrictScoped() && $project->region_id !== $user->region_id) {
                abort(403, 'Сіз тек өз ауданыңыздағы жобаларды өзгерте аласыз.');
            }

            // Must be involved in the project to write
            if (! $user->isInvolvedInProject($project)) {
                abort(403, 'Сіз бұл жобаға қатыспайсыз.');
            }
        }
    }

    /**
     * Block non-superadmin users from accessing archived investment projects.
     */
    protected function blockArchivedProjectAccess(Request $request, $user, ?string $roleName): void
    {
        if (in_array($roleName, ['superadmin', 'invest'])) {
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
