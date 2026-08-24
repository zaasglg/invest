<?php

namespace App\Services;

use App\Models\IndustrialZone;
use App\Models\InvestmentApplication;
use App\Models\PromZone;
use App\Models\Sez;
use App\Support\InfrastructureValidationRules;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class ZoneCapacityService
{
    public const ZONE_TYPES = [
        'sez' => Sez::class,
        'industrial-zone' => IndustrialZone::class,
        'prom-zone' => PromZone::class,
    ];

    public function __construct(
        private readonly InfrastructureUsageService $usage
    ) {}

    public function resolve(string $type, int $id): Model
    {
        $model = self::ZONE_TYPES[$type] ?? null;

        if (! $model) {
            abort(404, 'Аймақ түрі табылмады.');
        }

        return $model::query()->with('region:id,name,type')->findOrFail($id);
    }

    public function type(Model $zone): string
    {
        return array_search($zone::class, self::ZONE_TYPES, true)
            ?: throw new InvalidArgumentException('Unsupported zone model.');
    }

    public function typeLabel(Model $zone): string
    {
        return match ($this->type($zone)) {
            'sez' => 'АЭА',
            'industrial-zone' => 'ИА',
            'prom-zone' => 'Пром зона',
        };
    }

    /**
     * @return array{total: float, occupied: float, reserved: float, available: float}
     */
    public function summarize(Model $zone): array
    {
        $projects = $this->projects($zone);
        $area = $this->usage->summarizeArea($zone->total_area, $projects);
        $reserved = (float) InvestmentApplication::query()
            ->where('zoneable_type', $zone::class)
            ->where('zoneable_id', $zone->getKey())
            ->activeReservation()
            ->sum('approved_area');

        return [
            'total' => (float) $area['total'],
            'occupied' => (float) $area['occupied'],
            'reserved' => $reserved,
            'available' => max(
                0.0,
                (float) $area['total'] - (float) $area['occupied'] - $reserved
            ),
        ];
    }

    /** @return array<string, array<string, float>> */
    public function infrastructure(Model $zone): array
    {
        return collect($this->usage->summarize(
            $zone->infrastructure,
            $this->projects($zone)
        ))->map(fn (array $item): array => [
            'total' => (float) $item['total'],
            'used' => (float) $item['used'],
            'remaining' => (float) $item['remaining'],
            'overused' => (float) $item['overused'],
        ])->all();
    }

    /** @return array<string, mixed> */
    public function present(Model $zone, bool $withPublicDetails = false): array
    {
        $zone->loadMissing('region:id,name,type');
        $data = [
            'id' => (int) $zone->getKey(),
            'type' => $this->type($zone),
            'type_label' => $this->typeLabel($zone),
            'name' => $zone->name,
            'status' => $zone->status,
            'region' => $zone->region?->only(['id', 'name', 'type']),
            'area' => $this->summarize($zone),
            'infrastructure' => $this->publicInfrastructure(
                $zone->infrastructure,
                $this->infrastructure($zone)
            ),
        ];

        if ($withPublicDetails) {
            $data['description'] = $zone->description;
            $data['location'] = $zone->location;
            $data['main_gallery'] = $this->publicPhotos(
                $zone->photos()->where('photo_type', 'gallery')->latest()->get()
            );
            $data['render_photos'] = $this->publicPhotos(
                $zone->photos()->renderPhotos()->latest()->get()
            );
        }

        return $data;
    }

    /**
     * @param  Collection<int, Model>  $photos
     * @return array<int, array<string, mixed>>
     */
    private function publicPhotos(Collection $photos): array
    {
        return $photos->map(fn (Model $photo): array => [
            'id' => (int) $photo->getKey(),
            'file_path' => $photo->file_path,
            'description' => $photo->description,
            'gallery_date' => $photo->gallery_date?->toDateString(),
            'created_at' => $photo->created_at?->toISOString(),
        ])->all();
    }

    private function projects(Model $zone): Collection
    {
        return $zone->investmentProjects()
            ->where('is_archived', false)
            ->get(['investment_projects.id', 'name', 'infrastructure']);
    }

    /**
     * @param  array<string, mixed>|null  $infrastructure
     * @param  array<string, array<string, float>>  $usage
     * @return array<string, array<string, mixed>>
     */
    private function publicInfrastructure(
        ?array $infrastructure,
        array $usage
    ): array {
        $result = [];

        foreach (InfrastructureValidationRules::ZONE_RESOURCES as $resource) {
            $details = data_get($infrastructure, $resource, []);
            $result[$resource] = [
                'available' => (bool) ($details['available'] ?? false),
                'capacity' => $details['capacity'] ?? null,
                'total' => $usage[$resource]['total'] ?? 0.0,
                'used' => $usage[$resource]['used'] ?? 0.0,
                'remaining' => $usage[$resource]['remaining'] ?? 0.0,
            ];
        }

        return $result;
    }
}
