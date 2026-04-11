<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZoneIssue;
use App\Models\PromZoneIssue;
use App\Models\ProjectIssue;
use App\Models\Region;
use App\Models\SezIssue;
use App\Models\SubsoilIssue;
use Illuminate\Http\Request;
use Inertia\Inertia;

class IssuesController extends Controller
{
    public function index(Request $request)
    {
        $sector = $request->get('sector');
        $regionId = $request->get('region_id');

        $issues = collect();

        // Get issues based on sector filter
        if ($sector === 'invest' || ! $sector) {
            $query = ProjectIssue::with(['project.region']);
            if ($regionId) {
                $query->whereHas('project', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $projectIssues = $query->latest()->get()->map(function ($issue) {
                return [
                    'id' => $issue->id,
                    'type' => 'invest',
                    'type_label' => 'Turkistan Invest',
                    'title' => $issue->title,
                    'description' => $issue->description,
                    'category' => $issue->category,
                    'severity' => $issue->severity,
                    'status' => $issue->status,
                    'entity_id' => $issue->project_id,
                    'entity_name' => $issue->project?->name ?? 'Белгісіз жоба',
                    'region_name' => $issue->project?->region?->name ?? null,
                    'created_at' => $issue->created_at,
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($projectIssues);
            } else {
                $issues = $projectIssues;
            }
        }

        if ($sector === 'sez' || ! $sector) {
            $query = SezIssue::with(['sez.region']);
            if ($regionId) {
                $query->whereHas('sez', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $sezIssues = $query->latest()->get()->map(function ($issue) {
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
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($sezIssues);
            } else {
                $issues = $sezIssues;
            }
        }

        if ($sector === 'iz' || ! $sector) {
            $query = IndustrialZoneIssue::with(['industrialZone.region']);
            if ($regionId) {
                $query->whereHas('industrialZone', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $izIssues = $query->latest()->get()->map(function ($issue) {
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
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($izIssues);
            } else {
                $issues = $izIssues;
            }
        }

        if ($sector === 'prom' || ! $sector) {
            $query = PromZoneIssue::with(['promZone.region']);
            if ($regionId) {
                $query->whereHas('promZone', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $promIssues = $query->latest()->get()->map(function ($issue) {
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
                ];
            });

            if (! $sector) {
                $issues = $issues->merge($promIssues);
            } else {
                $issues = $promIssues;
            }
        }

        if ($sector === 'nedro' || ! $sector) {
            $query = SubsoilIssue::with(['subsoilUser.region']);
            if ($regionId) {
                $query->whereHas('subsoilUser', function ($q) use ($regionId) {
                    $q->where('region_id', $regionId);
                });
            }
            $subsoilIssues = $query->latest()->get()->map(function ($issue) {
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
                    'entity_name' => $issue->subsoilUser?->company_name ?? 'Белгісіз компания',
                    'region_name' => $issue->subsoilUser?->region?->name ?? null,
                    'created_at' => $issue->created_at,
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

        // Get regions for filter
        $regions = Region::where('type', 'district')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        // Get sector labels
        $sectorLabels = [
            'invest' => 'Turkistan Invest',
            'sez' => 'АЭА',
            'iz' => 'ИА',
            'prom' => 'Пром зона',
            'nedro' => 'Жер қойнауын пайдалану',
        ];

        return Inertia::render('issues/index', [
            'issues' => $issues,
            'regions' => $regions,
            'filters' => [
                'sector' => $sector,
                'region_id' => $regionId ? (int) $regionId : null,
            ],
            'sectorLabels' => $sectorLabels,
        ]);
    }
}
