<?php

namespace App\Services;

use App\Models\IndustrialZone;
use App\Models\InvestmentProject;
use App\Models\PromZone;
use App\Models\SectorActivityLog;
use App\Models\Sez;
use App\Models\SubsoilUser;
use App\Models\User;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Stringable;

class SectorActivityLogService
{
    /**
     * @param  class-string<Model>  $entityClass
     * @param  array{attached?: array<int|string, mixed>, detached?: array<int|string, mixed>}  $changes
     */
    public function recordProjectMembershipChanges(
        InvestmentProject $project,
        string $entityClass,
        array $changes
    ): void {
        foreach (['attached', 'detached'] as $changeType) {
            $changed = $changes[$changeType] ?? [];
            $ids = array_map(
                'intval',
                array_is_list($changed) ? $changed : array_keys($changed)
            );

            if ($ids === []) {
                continue;
            }

            $entities = $entityClass::query()
                ->withoutGlobalScope('not_deleted')
                ->whereKey($ids)
                ->get();

            foreach ($entities as $entity) {
                $attached = $changeType === 'attached';
                $this->record(
                    auditable: $entity,
                    event: $attached
                        ? 'project.attached'
                        : 'project.detached',
                    category: 'project',
                    action: $attached
                        ? 'Жоба нысанға байланыстырылды: "'.$project->name.'"'
                        : 'Жоба нысаннан ажыратылды: "'.$project->name.'"',
                    subject: $project,
                    properties: [
                        'details' => [
                            'Жоба' => $project->name,
                            'Жоба ID' => $project->id,
                            'Байланыс әрекеті' => $attached
                                ? 'Қосылды'
                                : 'Алып тасталды',
                        ],
                    ]
                );
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function entitySnapshot(Model $entity): array
    {
        $fields = $entity instanceof SubsoilUser
            ? [
                'name',
                'bin',
                'region_id',
                'mineral_type',
                'total_area',
                'description',
                'license_status',
                'license_start',
                'license_end',
                'location',
            ]
            : [
                'name',
                'region_id',
                'total_area',
                'status',
                'infrastructure',
                'location',
                'description',
                'geometry',
            ];

        return $entity->only($fields);
    }

    /**
     * @return array<string, string>
     */
    public function entityLabels(Model $entity): array
    {
        $common = [
            'name' => 'Атауы',
            'region_id' => 'Аймақ ID',
            'total_area' => 'Жалпы аумақ',
            'description' => 'Сипаттама',
            'location' => 'Орналасуы',
        ];

        if ($entity instanceof SubsoilUser) {
            return [
                ...$common,
                'bin' => 'БСН',
                'mineral_type' => 'Пайдалы қазба түрі',
                'license_status' => 'Лицензия күйі',
                'license_start' => 'Лицензияның басталу күні',
                'license_end' => 'Лицензияның аяқталу күні',
            ];
        }

        if (! $entity instanceof Sez
            && ! $entity instanceof IndustrialZone
            && ! $entity instanceof PromZone) {
            return $common;
        }

        return [
            ...$common,
            'status' => 'Күйі',
            'infrastructure' => 'Инфрақұрылым',
            'geometry' => 'Карта геометриясы',
        ];
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    public function record(
        Model $auditable,
        string $event,
        string $category,
        string $action,
        ?Model $subject = null,
        array $properties = [],
        ?User $actor = null
    ): SectorActivityLog {
        $actor ??= auth()->user();
        $actor?->loadMissing('roleModel:id,name,display_name');

        return SectorActivityLog::create([
            'user_id' => $actor?->id,
            'auditable_type' => $auditable->getMorphClass(),
            'auditable_id' => $auditable->getKey(),
            'action' => Str::limit($action, 255, ''),
            'event' => $event,
            'category' => $category,
            'subject_type' => $subject
                ? class_basename($subject)
                : null,
            'subject_id' => $subject?->getKey(),
            'properties' => $this->normalizeProperties([
                ...$properties,
                'auditable_name' => $auditable->getAttribute('name'),
                'actor_name' => $actor?->full_name ?? 'Жүйе',
                'actor_role' => $actor?->roleModel?->display_name
                    ?? $actor?->roleModel?->name,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]),
        ]);
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  array<string, string>  $labels
     * @return array<string, array{label: string, old: mixed, new: mixed}>
     */
    public function changes(
        array $before,
        array $after,
        array $labels = []
    ): array {
        $changes = [];

        foreach ($after as $field => $newValue) {
            $oldValue = $before[$field] ?? null;
            $oldNormalized = $this->normalizeValue($oldValue);
            $newNormalized = $this->normalizeValue($newValue);

            if ($oldNormalized === $newNormalized) {
                continue;
            }

            $changes[$field] = [
                'label' => $labels[$field] ?? Str::headline($field),
                'old' => $oldNormalized,
                'new' => $newNormalized,
            ];
        }

        return $changes;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function history(Model $auditable, array $filters): array
    {
        $baseQuery = SectorActivityLog::query()
            ->where('auditable_type', $auditable->getMorphClass())
            ->where('auditable_id', $auditable->getKey());

        $logs = (clone $baseQuery)
            ->with([
                'user:id,full_name,role_id',
                'user.roleModel:id,name,display_name',
            ])
            ->when(
                $filters['search'] ?? null,
                fn ($query, $search) => $query->where(
                    function ($searchQuery) use ($search): void {
                        $searchQuery
                            ->whereLike(
                                'action',
                                '%'.$search.'%',
                                caseSensitive: false
                            )
                            ->orWhereLike(
                                'event',
                                '%'.$search.'%',
                                caseSensitive: false
                            )
                            ->orWhereHas(
                                'user',
                                fn ($userQuery) => $userQuery->whereLike(
                                    'full_name',
                                    '%'.$search.'%',
                                    caseSensitive: false
                                )
                            )
                            ->orWhereRaw(
                                'CAST(properties AS TEXT) ILIKE ?',
                                ['%'.$search.'%']
                            );
                    }
                )
            )
            ->when(
                $filters['category'] ?? null,
                fn ($query, $category) => $query->where(
                    'category',
                    $category
                )
            )
            ->when(
                $filters['user_id'] ?? null,
                fn ($query, $userId) => $query->where(
                    'user_id',
                    $userId
                )
            )
            ->when(
                $filters['date_from'] ?? null,
                fn ($query, $date) => $query->whereDate(
                    'created_at',
                    '>=',
                    $date
                )
            )
            ->when(
                $filters['date_to'] ?? null,
                fn ($query, $date) => $query->whereDate(
                    'created_at',
                    '<=',
                    $date
                )
            )
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $actors = User::query()
            ->select('id', 'full_name')
            ->whereIn(
                'id',
                (clone $baseQuery)
                    ->whereNotNull('user_id')
                    ->select('user_id')
                    ->distinct()
            )
            ->orderBy('full_name')
            ->get();

        $categoryCounts = (clone $baseQuery)
            ->selectRaw('category, COUNT(*) as total')
            ->groupBy('category')
            ->pluck('total', 'category');

        return compact('logs', 'actors', 'categoryCounts');
    }

    /**
     * @param  array<array-key, mixed>  $properties
     * @return array<array-key, mixed>
     */
    private function normalizeProperties(array $properties): array
    {
        foreach ($properties as $key => $value) {
            $properties[$key] = is_array($value)
                ? $this->normalizeProperties($value)
                : $this->normalizeValue($value);
        }

        return $properties;
    }

    private function normalizeValue(mixed $value): mixed
    {
        if ($value instanceof BackedEnum) {
            return $value->value;
        }

        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        if ($value instanceof Stringable) {
            $value = (string) $value;
        }

        if (is_array($value) || is_object($value)) {
            $encoded = json_encode(
                $value,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
            );

            return Str::limit($encoded ?: '', 2000);
        }

        return is_string($value) ? Str::limit($value, 2000) : $value;
    }
}
