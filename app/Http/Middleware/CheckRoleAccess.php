<?php

namespace App\Http\Middleware;

use App\Models\InvestmentProject;
use App\Services\InvestmentProjectAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRoleAccess
{
    public function __construct(
        private readonly InvestmentProjectAccessService $projectAccess
    ) {}

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
     * Project routes available to an investor for their company's projects.
     */
    protected array $investorProjectRoutes = [
        'investment-projects.index',
        'investment-projects.show',
        'investment-projects.passport',
        'investment-projects.presentation',
        'investment-projects.documents.index',
        'investment-projects.documents.store',
        'investment-projects.documents.download',
        'investment-projects.gallery.index',
        'investment-projects.gallery.store',
        'investment-projects.gallery.download',
        'investment-projects.issues.index',
        'investment-projects.issues.store',
        'investment-projects.tasks.view',
        'investment-projects.tasks.completions.store',
        'investment-projects.tasks.completions.files.preview',
        'investment-projects.tasks.completions.files.download',
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

        abort_unless(
            $user->hasSupportedRole(),
            403,
            'Сіздің аккаунтыңызға жарамды рөл тағайындалмаған.'
        );

        $routeName = $request->route()?->getName();

        if ($roleName === 'investor') {
            if (! $routeName
                || ! in_array($routeName, $this->investorProjectRoutes, true)) {
                abort(403, 'Инвесторға бұл бөлімге қол жеткізуге рұқсат жоқ.');
            }

            $this->enforceInvestorProjectScope($request, $user, $routeName);
            $this->blockArchivedProjectAccess(
                $request,
                $user,
                $roleName
            );

            return $next($request);
        }

        // Superadmin manages project types; prokuror may view them.
        if ($routeName && ($routeName === 'project-types' || str_starts_with($routeName, 'project-types.'))) {
            if (! in_array($roleName, ['superadmin', 'prokuror'], true)) {
                abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
            }
        }

        if ($routeName && str_starts_with($routeName, 'companies.')) {
            $companyReadRoles = [
                'superadmin',
                'prokuror',
                'akim',
                'zamakim',
            ];

            if (! in_array($roleName, $companyReadRoles, true)) {
                abort(403, 'Сіздің компаниялар бөліміне қол жеткізуіңіз жоқ.');
            }

            if ($this->isWriteAction($request)
                && $roleName !== 'superadmin') {
                abort(403, 'Сізде компания мәліметтерін өзгерту құқығы жоқ.');
            }
        }

        // Superadmin manages regions; prokuror may view them.
        if ($routeName && str_starts_with($routeName, 'regions.')) {
            $allowedRegionsRoutes = ['regions.show', 'regions.projects.reorder'];
            if (! in_array($routeName, $allowedRegionsRoutes, true)
                && ! in_array($roleName, ['superadmin', 'prokuror'], true)) {
                abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
            }
        }

        if ($routeName === 'regions' && ! in_array($roleName, ['superadmin', 'prokuror'], true)) {
            abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
        }

        // Prokuror can view every section and every project. The only
        // business-data write they may perform is creating a roadmap task.
        if ($roleName === 'prokuror'
            && $this->isWriteAction($request)
            && $routeName !== 'investment-projects.tasks.store') {
            abort(403, 'Прокурорға бұл деректі өзгертуге рұқсат жоқ.');
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

            // Moderator can manage Turkistan Invest project cards and review
            // their tasks. Other resources remain read-only.
            if ($roleName === 'moderator') {
                if ($this->isMatchingRoute($request, $this->limitedBlockedRoutes)) {
                    abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
                }

                $this->enforceModeratorProjectScope(
                    $request,
                    $user,
                    $routeName
                );

                $moderatorWriteRoutes = [
                    'investment-projects.create',
                    'investment-projects.store',
                    'investment-projects.edit',
                    'investment-projects.update',
                    'investment-projects.update-status',
                    'investment-projects.tasks.approve',
                    'investment-projects.tasks.reject',
                ];
                if ($this->isWriteAction($request)
                    && ! in_array($routeName, $moderatorWriteRoutes, true)) {
                    abort(
                        403,
                        'Модератор Turkistan Invest жобасының негізгі деректерін ғана өзгерте алады.'
                    );
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

            // Invest sub-role scoping: aea/ia/prom_zone users can only access
            // their own sector type section (AEA / IA / Prom Zone).
            $this->enforceInvestSubRoleScope($request, $user, $roleName);
        }

        // Block roles that do not have archive viewing rights.
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
     * Invest / ispolnitel / moderator — can write to projects but blocked from admin sections.
     */
    protected function isLimitedRole(?string $roleName): bool
    {
        if (! $roleName) {
            return false;
        }

        return in_array($roleName, ['invest', 'ispolnitel', 'moderator'], true);
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
     * Investors may only open projects belonging to their company.
     */
    protected function enforceInvestorProjectScope(
        Request $request,
        $user,
        string $routeName
    ): void {
        if ($routeName === 'investment-projects.index') {
            return;
        }

        $project = $request->route('investmentProject')
            ?? $request->route('investment_project');
        $projectId = is_object($project) ? $project->id : (int) $project;

        $investmentProject = $project instanceof InvestmentProject
            ? $project
            : InvestmentProject::find($projectId);

        if (! $investmentProject
            || ! $user->isInvolvedInProject($investmentProject)) {
            abort(403, 'Бұл жоба инвестор аккаунтына бекітілмеген.');
        }
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
     * Moderators may only access projects curated by Turkistan Invest.
     */
    protected function enforceModeratorProjectScope(
        Request $request,
        $user,
        ?string $routeName
    ): void {
        if (! $routeName
            || ! str_starts_with($routeName, 'investment-projects.')) {
            return;
        }

        $routesWithoutProject = [
            'investment-projects.index',
            'investment-projects.create',
            'investment-projects.store',
            'investment-projects.reorder',
            'investment-projects.archived',
            'investment-projects.bulk-presentation',
        ];

        if (in_array($routeName, $routesWithoutProject, true)) {
            return;
        }

        $projectOrId = $request->route('investmentProject')
            ?? $request->route('investment_project')
            ?? $request->route('id');

        $project = is_object($projectOrId)
            ? $projectOrId
            : InvestmentProject::find((int) $projectOrId);

        if (! $project
            || ! $this->projectAccess->canView($user, $project)) {
            abort(
                403,
                'Модераторға бұл жобаға қол жеткізуге рұқсат жоқ.'
            );
        }
    }

    /**
     * Block roles without archive viewing rights from archived projects.
     */
    protected function blockArchivedProjectAccess(Request $request, $user, ?string $roleName): void
    {
        if (in_array($roleName, ['superadmin', 'invest', 'prokuror'], true)) {
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

    /**
     * Enforce invest sub-role scoping.
     * - aea users can only access SEZ sections (not IA / Prom Zone / Subsoil).
     * - ia users can only access Industrial Zones (not AEA / Prom Zone / Subsoil).
     * - prom_zone users can only access Prom Zones (not AEA / IA / Subsoil).
     * - turkistan_invest users are not restricted here.
     *
     * Additionally, all invest users can only access investment projects
     * where they are listed as a curator (admin-managed).
     */
    protected function enforceInvestSubRoleScope(Request $request, $user, ?string $roleName): void
    {
        if ($roleName !== 'invest') {
            return;
        }

        $routeName = $request->route()?->getName();
        if (! $routeName) {
            return;
        }

        $subRole = $user->invest_sub_role;

        if (in_array($subRole, ['aea', 'ia', 'prom_zone'], true)) {
            $blockedPrefixes = match ($subRole) {
                'aea' => ['industrial-zones.', 'prom-zones.', 'subsoil-users.'],
                'ia' => ['sezs.', 'prom-zones.', 'subsoil-users.'],
                'prom_zone' => ['sezs.', 'industrial-zones.', 'subsoil-users.'],
                default => [],
            };

            foreach ($blockedPrefixes as $prefix) {
                if (str_starts_with($routeName, $prefix)) {
                    abort(403, 'Сіздің бұл бөлімге қол жеткізуіңіз жоқ.');
                }
            }
        }

        // Curator-based access to individual investment projects.
        // Applies to all invest users (including turkistan_invest).
        $this->enforceInvestCuratorAccess($request, $user, $routeName);
    }

    /**
     * Allow an invest user to access a specific investment project only if
     * they are one of its curators. Creation/listing/bulk routes are skipped.
     */
    protected function enforceInvestCuratorAccess(Request $request, $user, string $routeName): void
    {
        if (! str_starts_with($routeName, 'investment-projects.')) {
            return;
        }

        // Routes that don't target a specific project instance.
        $skipRoutes = [
            'investment-projects.index',
            'investment-projects.create',
            'investment-projects.store',
            'investment-projects.reorder',
            'investment-projects.archived',
            'investment-projects.bulk-presentation',
        ];
        if (in_array($routeName, $skipRoutes, true)) {
            return;
        }

        // The route parameter may be an Eloquent model (route model binding)
        // or a raw ID integer (e.g. the show() method uses $id directly).
        $projectOrId = $request->route('investmentProject')
            ?? $request->route('investment_project')
            ?? $request->route('id');

        if (! $projectOrId) {
            return;
        }

        if (is_object($projectOrId)) {
            $project = $projectOrId;
        } else {
            $project = \App\Models\InvestmentProject::find((int) $projectOrId);
            if (! $project) {
                return;
            }
        }

        // If the user has an invest sub-role, allow access to any project
        // that has at least one curator with the same sub-role (not necessarily
        // this user specifically). This lets all ia/aea/prom_zone/turkistan_invest
        // users access projects curated by their peers.
        $subRole = $user->invest_sub_role;
        if ($subRole) {
            $hasSubRoleCurator = $project->curators()
                ->where('users.invest_sub_role', $subRole)
                ->exists();
            if (! $hasSubRoleCurator) {
                abort(403, 'Сіз бұл жобаның кураторы емессіз.');
            }
        } else {
            // No sub-role assigned — must be a direct curator.
            $isCurator = $project->curators()->where('users.id', $user->id)->exists();
            if (! $isCurator) {
                abort(403, 'Сіз бұл жобаның кураторы емессіз.');
            }
        }
    }
}
