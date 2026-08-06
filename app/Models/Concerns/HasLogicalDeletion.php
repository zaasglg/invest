<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

trait HasLogicalDeletion
{
    protected static function bootHasLogicalDeletion(): void
    {
        static::addGlobalScope(
            'not_deleted',
            fn (Builder $query) => $query->where(
                $query->getModel()->qualifyColumn('is_deleted'),
                false
            )
        );
    }

    public function scopeOnlyDeleted(Builder $query): Builder
    {
        return $query
            ->withoutGlobalScope('not_deleted')
            ->where(
                $query->getModel()->qualifyColumn('is_deleted'),
                true
            );
    }

    public function resolveRouteBindingQuery($query, $value, $field = null)
    {
        $user = auth()->user();
        $user?->loadMissing('roleModel');

        if ($user?->roleModel?->name === 'superadmin') {
            $query = $query instanceof Model
                ? $query->newQueryWithoutScope('not_deleted')
                : $query->withoutGlobalScope('not_deleted');
        }

        return parent::resolveRouteBindingQuery($query, $value, $field);
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function markAsDeletedBy(User $user): void
    {
        $this->forceFill([
            'is_deleted' => true,
            'deleted_by' => $user->id,
            'deleted_at' => now(),
        ])->save();
    }

    public function restoreFromDeletion(): void
    {
        $this->forceFill([
            'is_deleted' => false,
            'deleted_by' => null,
            'deleted_at' => null,
        ])->save();
    }
}
