<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZoneIssue;
use App\Models\ProjectIssue;
use App\Models\PromZoneIssue;
use App\Models\Region;
use App\Models\SezIssue;
use App\Models\SubsoilIssue;
use App\Services\InvestmentProjectAccessService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Inertia\Inertia;

class IssuesController extends Controller
{
    public function __construct(
        private readonly InvestmentProjectAccessService $projectAccess
    ) {}

    public function index(Request $request)
    {
        $user = $request->user();
        $roleName = $user?->load('roleModel')->roleModel?->name;
        $investSubRole = ($roleName === 'invest'
            && in_array($user->invest_sub_role, ['turkistan_invest', 'aea', 'ia', 'prom_zone'], true))
            ? $user->invest_sub_role
            : null;
        $isModerator = $roleName === 'moderator';
        $isInvestor = $roleName === 'investor';

        // Determine which sections are accessible for this user.
        $canSeeSez = ! $isInvestor
            && (! $investSubRole || in_array($investSubRole, ['aea', 'turkistan_invest'], true));
        $canSeeIz = ! $isInvestor
            && (! $investSubRole || in_array($investSubRole, ['ia', 'turkistan_invest'], true));
        $canSeeProm = ! $isInvestor
            && (! $investSubRole || in_array($investSubRole, ['prom_zone', 'turkistan_invest'], true));
        $canSeeSubsoil = ! $isInvestor
            && (! $investSubRole || $investSubRole === 'turkistan_invest');

        $sector = $request->get('sector');
        $regionId = $request->get('region_id');

        if ($isInvestor && $sector === 'invest') {
            $sector = 'all_projects';
        }

        // Respect section access — if the requested sector is blocked, reset to null.
        if ($sector === 'sez' && ! $canSeeSez) {
            $sector = null;
        }
        if ($sector === 'iz' && ! $canSeeIz) {
            $sector = null;
        }
        if ($sector === 'prom' && ! $canSeeProm) {
            $sector = null;
        }
        if ($sector === 'nedro' && ! $canSeeSubsoil) {
            $sector = null;
        }

        $perPage = 12;
        $currentPage = LengthAwarePaginator::resolveCurrentPage();
        $fetchLimit = $currentPage * $perPage;
        $issueStats = [
            'total' => 0,
            'open' => 0,
            'in_progress' => 0,
            'resolved' => 0,
        ];
        $issues = collect();

        // Get issues based on sector filter
        if ($sector === 'all_projects' || $sector === 'invest' || ! $sector) {
            $query = ProjectIssue::with(['project.region', 'creator:id,full_name']);
            if ($isInvestor) {
                $query->whereHas(
                    'project',
                    fn (Builder $project) => $this->projectAccess
                        ->scopeVisible($project, $user)
                );
            }
            if ($isModerator) {
                $query->whereHas(
                    'project',
                    fn ($project) => $project
                        ->active()
                        ->curatedByTurkistanInvest()
                );
            }
            if ($regionId) {
                $query->whereHas('project', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            // Scope to only the invest sub-role's projects (via curators pivot).
            if ($sector === 'invest') {
                $query->whereHas(
                    'project',
                    fn ($project) => $project
                        ->curatedByTurkistanInvest()
                );
            } elseif ($investSubRole) {
                $query->whereHas('project', function ($q) use ($investSubRole) {
                    if ($investSubRole === 'turkistan_invest') {
                        $q->curatedByTurkistanInvest();

                        return;
                    }

                    $q->whereHas(
                        'curators',
                        fn ($curators) => $curators
                            ->where('users.invest_sub_role', $investSubRole)
                    );
                });
            }
            $this->accumulateIssueStats($issueStats, $query);
            $projectIssues = $query->latest()->limit($fetchLimit)->get()->map(function ($issue) use ($sector) {
                return [
                    'id' => $issue->id,
                    'type' => $sector === 'invest' ? 'invest' : 'all_projects',
                    'type_label' => $sector === 'invest' ? 'Turkistan Invest' : 'Барлық жобалар',
                    'title' => $issue->title,
                    'description' => $issue->description,
                    'category' => $issue->category,
                    'severity' => $issue->severity,
                    'status' => $issue->status,
                    'entity_id' => $issue->project_id,
                    'entity_name' => $issue->project?->name ?? 'Белгісіз жоба',
                    'region_name' => $issue->project?->region?->name ?? null,
                    'created_at' => $issue->created_at,
                    'creator_full_name' => $issue->creator?->full_name,
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($projectIssues);
            } else {
                $issues = $projectIssues;
            }
        }

        if (($sector === 'sez' || ! $sector) && $canSeeSez) {
            $query = SezIssue::with(['sez.region', 'creator:id,full_name']);
            if ($regionId) {
                $query->whereHas('sez', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $this->accumulateIssueStats($issueStats, $query);
            $sezIssues = $query->latest()->limit($fetchLimit)->get()->map(function ($issue) {
                return [
                    'id' => $issue->id,
                    'type' => 'sez',
                    'type_label' => 'АЭА',
                    'title' => $issue->title,
                    'description' => $issue->description,
                    'category' => $issue->category,
                    'severity' => $issue->severity,
                    'status' => $issue->status,
                    'entity_id' => $issue->sez_id,
                    'entity_name' => $issue->sez?->name ?? 'Белгісіз АЭА',
                    'region_name' => $issue->sez?->region?->name ?? null,
                    'created_at' => $issue->created_at,
                    'creator_full_name' => $issue->creator?->full_name,
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($sezIssues);
            } else {
                $issues = $sezIssues;
            }
        }

        if (($sector === 'iz' || ! $sector) && $canSeeIz) {
            $query = IndustrialZoneIssue::with(['industrialZone.region', 'creator:id,full_name']);
            if ($regionId) {
                $query->whereHas('industrialZone', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $this->accumulateIssueStats($issueStats, $query);
            $izIssues = $query->latest()->limit($fetchLimit)->get()->map(function ($issue) {
                return [
                    'id' => $issue->id,
                    'type' => 'iz',
                    'type_label' => 'ИА',
                    'title' => $issue->title,
                    'description' => $issue->description,
                    'category' => $issue->category,
                    'severity' => $issue->severity,
                    'status' => $issue->status,
                    'entity_id' => $issue->industrial_zone_id,
                    'entity_name' => $issue->industrialZone?->name ?? 'Белгісіз ИА',
                    'region_name' => $issue->industrialZone?->region?->name ?? null,
                    'created_at' => $issue->created_at,
                    'creator_full_name' => $issue->creator?->full_name,
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($izIssues);
            } else {
                $issues = $izIssues;
            }
        }

        if (($sector === 'prom' || ! $sector) && $canSeeProm) {
            $query = PromZoneIssue::with(['promZone.region', 'creator:id,full_name']);
            if ($regionId) {
                $query->whereHas('promZone', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $this->accumulateIssueStats($issueStats, $query);
            $promIssues = $query->latest()->limit($fetchLimit)->get()->map(function ($issue) {
                return [
                    'id' => $issue->id,
                    'type' => 'prom',
                    'type_label' => 'Пром зона',
                    'title' => $issue->title,
                    'description' => $issue->description,
                    'category' => $issue->category,
                    'severity' => $issue->severity,
                    'status' => $issue->status,
                    'entity_id' => $issue->prom_zone_id,
                    'entity_name' => $issue->promZone?->name ?? 'Белгісіз пром зона',
                    'region_name' => $issue->promZone?->region?->name ?? null,
                    'created_at' => $issue->created_at,
                    'creator_full_name' => $issue->creator?->full_name,
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($promIssues);
            } else {
                $issues = $promIssues;
            }
        }

        if (($sector === 'nedro' || ! $sector) && $canSeeSubsoil) {
            $query = SubsoilIssue::with(['subsoilUser.region', 'creator:id,full_name']);
            if ($regionId) {
                $query->whereHas('subsoilUser', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $this->accumulateIssueStats($issueStats, $query);
            $subsoilIssues = $query->latest()->limit($fetchLimit)->get()->map(function ($issue) {
                return [
                    'id' => $issue->id,
                    'type' => 'nedro',
                    'type_label' => 'Жер қойнауын пайдалану',
                    'title' => $issue->description,
                    'description' => $issue->description,
                    'category' => null,
                    'severity' => $issue->severity,
                    'status' => $issue->status,
                    'entity_id' => $issue->subsoil_user_id,
                    'entity_name' => $issue->subsoilUser?->name ?? 'Белгісіз жер қойнауын пайдаланушы',
                    'region_name' => $issue->subsoilUser?->region?->name ?? null,
                    'created_at' => $issue->created_at,
                    'creator_full_name' => $issue->creator?->full_name,
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($subsoilIssues);
            } else {
                $issues = $subsoilIssues;
            }
        }

        // Sort by created_at desc
        $issues = $issues->sortByDesc('created_at')->values();

        $issues = new LengthAwarePaginator(
            $issues->forPage($currentPage, $perPage)->values(),
            $issueStats['total'],
            $perPage,
            $currentPage,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        // Get regions for filter
        $regions = Region::where('type', 'district')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        // Get sector labels — only for accessible sections.
        $sectorLabels = [
            'all_projects' => 'Барлық жобалар',
        ];
        if (! $isInvestor) {
            $sectorLabels['invest'] = 'Turkistan Invest';
        }
        if ($canSeeSez) {
            $sectorLabels['sez'] = 'АЭА';
        }
        if ($canSeeIz) {
            $sectorLabels['iz'] = 'ИА';
        }
        if ($canSeeProm) {
            $sectorLabels['prom'] = 'Пром зона';
        }
        if ($canSeeSubsoil) {
            $sectorLabels['nedro'] = 'Жер қойнауын пайдалану';
        }

        return Inertia::render('issues/index', [
            'issues' => $issues,
            'regions' => $regions,
            'filters' => [
                'sector' => $sector,
                'region_id' => $regionId ? (int) $regionId : null,
            ],
            'issueStats' => $issueStats,
            'sectorLabels' => $sectorLabels,
        ]);
    }

    private function accumulateIssueStats(array &$stats, Builder $query): void
    {
        $counts = (clone $query)
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        foreach ($counts as $status => $count) {
            $count = (int) $count;
            $stats['total'] += $count;

            if (array_key_exists($status, $stats)) {
                $stats[$status] += $count;
            }
        }
    }
}
