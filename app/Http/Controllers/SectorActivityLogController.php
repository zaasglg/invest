<?php

namespace App\Http\Controllers;

use App\Models\IndustrialZone;
use App\Models\PromZone;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Services\SectorActivityLogService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SectorActivityLogController extends Controller
{
    public function __construct(
        private readonly SectorActivityLogService $activity
    ) {}

    public function sez(Request $request, Sez $sez)
    {
        return $this->render($request, $sez, [
            'title' => 'СЭЗ әрекеттерінің тарихы',
            'backLabel' => 'СЭЗ-ге қайту',
            'showUrl' => route('sezs.show', $sez, false),
            'logsUrl' => route('sezs.logs', $sez, false),
            'entityLabel' => 'СЭЗ',
            'categories' => ['entity', 'project', 'photo', 'issue'],
        ]);
    }

    public function industrialZone(
        Request $request,
        IndustrialZone $industrialZone
    ) {
        return $this->render($request, $industrialZone, [
            'title' => 'Индустриялық аймақ әрекеттерінің тарихы',
            'backLabel' => 'Индустриялық аймаққа қайту',
            'showUrl' => route(
                'industrial-zones.show',
                $industrialZone,
                false
            ),
            'logsUrl' => route(
                'industrial-zones.logs',
                $industrialZone,
                false
            ),
            'entityLabel' => 'Индустриялық аймақ',
            'categories' => ['entity', 'project', 'photo', 'issue'],
        ]);
    }

    public function promZone(Request $request, PromZone $promZone)
    {
        return $this->render($request, $promZone, [
            'title' => 'Пром зона әрекеттерінің тарихы',
            'backLabel' => 'Пром зонаға қайту',
            'showUrl' => route('prom-zones.show', $promZone, false),
            'logsUrl' => route('prom-zones.logs', $promZone, false),
            'entityLabel' => 'Пром зона',
            'categories' => ['entity', 'project', 'photo', 'issue'],
        ]);
    }

    public function subsoilUser(
        Request $request,
        SubsoilUser $subsoilUser
    ) {
        return $this->render($request, $subsoilUser, [
            'title' => 'Жер қойнауын пайдаланушы әрекеттерінің тарихы',
            'backLabel' => 'Жер қойнауын пайдаланушыға қайту',
            'showUrl' => route(
                'subsoil-users.show',
                $subsoilUser,
                false
            ),
            'logsUrl' => route(
                'subsoil-users.logs',
                $subsoilUser,
                false
            ),
            'entityLabel' => 'Жер қойнауын пайдаланушы',
            'categories' => [
                'entity',
                'photo',
                'issue',
                'document',
                'task',
                'completion',
                'download',
            ],
        ]);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    private function render(Request $request, Model $entity, array $config)
    {
        $this->ensureSuperadmin($request);

        $validated = $request->validate([
            'search' => 'nullable|string|max:100',
            'category' => [
                'nullable',
                'in:entity,project,photo,issue,document,task,completion,download',
            ],
            'user_id' => 'nullable|integer|exists:users,id',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date|after_or_equal:date_from',
        ]);

        $history = $this->activity->history($entity, $validated);

        return Inertia::render('sector-activity-logs/index', [
            'project' => $entity->load('region'),
            ...$history,
            'filters' => [
                'search' => $validated['search'] ?? '',
                'category' => $validated['category'] ?? '',
                'user_id' => isset($validated['user_id'])
                    ? (string) $validated['user_id']
                    : '',
                'date_from' => $validated['date_from'] ?? '',
                'date_to' => $validated['date_to'] ?? '',
            ],
            'config' => $config,
        ]);
    }

    private function ensureSuperadmin(Request $request): void
    {
        abort_unless(
            $request->user()?->roleModel?->name === 'superadmin',
            403,
            'Әрекеттер тарихын тек супер әкімші көре алады.'
        );
    }
}
