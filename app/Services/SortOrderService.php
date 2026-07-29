<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

class SortOrderService
{
    /**
     * Persist an ordered list with one SQL update.
     *
     * @param  class-string<Model>  $modelClass
     * @param  array<int, int>  $ids
     */
    public function update(string $modelClass, array $ids, int $offset = 0): void
    {
        if ($ids === []) {
            return;
        }

        if (count($ids) !== count(array_unique($ids))) {
            throw new InvalidArgumentException(
                'The ordered identifiers must be unique.'
            );
        }

        $model = new $modelClass;
        $connection = $model->getConnection();
        $grammar = $connection->getQueryGrammar();
        $table = $grammar->wrapTable($model->getTable());
        $key = $grammar->wrap($model->getKeyName());
        $sortOrder = $grammar->wrap('sort_order');
        $updatedAt = $grammar->wrap($model->getUpdatedAtColumn());

        $cases = [];
        $bindings = [];

        foreach (array_values($ids) as $index => $id) {
            $cases[] = 'when ? then ?';
            $bindings[] = $id;
            $bindings[] = $offset + $index;
        }

        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $bindings[] = now();
        array_push($bindings, ...$ids);

        $connection->update(
            "update {$table} set {$sortOrder} = case {$key} "
            .implode(' ', $cases)
            ." else {$sortOrder} end, {$updatedAt} = ? "
            ."where {$key} in ({$placeholders})",
            $bindings
        );
    }
}
