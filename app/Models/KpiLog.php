<?php

namespace App\Models;

use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Stringable;

class KpiLog extends Model
{
    protected $fillable = [
        'user_id',
        'project_id',
        'action',
        'event',
        'category',
        'subject_type',
        'subject_id',
        'properties',
        'score',
    ];

    protected function casts(): array
    {
        return [
            'properties' => 'array',
            'score' => 'integer',
        ];
    }

    public static function log(int $projectId, string $action, int $score = 0): void
    {
        static::activity(
            projectId: $projectId,
            event: 'legacy',
            category: 'project',
            action: $action,
            score: $score
        );
    }

    /**
     * @param  array<string, mixed>  $properties
     */
    public static function activity(
        int $projectId,
        string $event,
        string $category,
        string $action,
        ?Model $subject = null,
        array $properties = [],
        int $score = 0,
        ?User $actor = null
    ): void {
        $actor ??= auth()->user();

        if (! $actor) {
            return;
        }

        $actor->loadMissing('roleModel:id,name,display_name');

        static::create([
            'user_id' => $actor->id,
            'project_id' => $projectId,
            'action' => Str::limit($action, 255, ''),
            'event' => $event,
            'category' => $category,
            'subject_type' => $subject
                ? class_basename($subject)
                : null,
            'subject_id' => $subject?->getKey(),
            'properties' => static::normalizeProperties([
                ...$properties,
                'actor_name' => $actor->full_name,
                'actor_role' => $actor->roleModel?->display_name
                    ?? $actor->roleModel?->name,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]),
            'score' => $score,
        ]);
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  array<string, string>  $labels
     * @return array<string, array{
     *     label: string,
     *     old: bool|float|int|string|null,
     *     new: bool|float|int|string|null
     * }>
     */
    public static function changes(
        array $before,
        array $after,
        array $labels = []
    ): array {
        $changes = [];

        foreach ($after as $field => $newValue) {
            $oldValue = $before[$field] ?? null;
            $oldNormalized = static::normalizeValue($oldValue);
            $newNormalized = static::normalizeValue($newValue);

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
     * @param  array<array-key, mixed>  $properties
     * @return array<array-key, mixed>
     */
    private static function normalizeProperties(array $properties): array
    {
        foreach ($properties as $key => $value) {
            if (is_array($value)) {
                $properties[$key] = static::normalizeProperties($value);

                continue;
            }

            $properties[$key] = static::normalizeValue($value);
        }

        return $properties;
    }

    private static function normalizeValue(
        mixed $value
    ): bool|float|int|string|null {
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

        if (is_string($value)) {
            return Str::limit($value, 2000);
        }

        if (is_bool($value) || is_int($value) || is_float($value)) {
            return $value;
        }

        return $value === null ? null : (string) $value;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function project()
    {
        return $this->belongsTo(InvestmentProject::class);
    }
}
