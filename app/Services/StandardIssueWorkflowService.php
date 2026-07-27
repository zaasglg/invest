<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;

class StandardIssueWorkflowService
{
    /**
     * @param  array<string, mixed>  $attributes
     */
    public function create(
        Model $owner,
        array $attributes,
        ?int $creatorId
    ): void {
        $owner->issues()->create([
            ...$attributes,
            'created_by' => $creatorId,
        ]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function update(
        Model $issue,
        array $attributes,
        ?int $creatorId
    ): void {
        if ($issue->getAttribute('created_by') === null) {
            $attributes['created_by'] = $creatorId;
        }

        $issue->update($attributes);
    }

    public function destroy(Model $issue): void
    {
        $issue->delete();
    }
}
