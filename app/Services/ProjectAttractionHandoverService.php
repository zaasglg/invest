<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\KpiLog;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectAttractionHandoverService
{
    public function __construct(private readonly InvestmentProjectAccessService $access) {}

    public function candidates(User $actor, ?InvestmentProject $project = null): Collection
    {
        return User::query()->whereHas('roleModel', fn ($query) => $query
            ->whereIn('name', ['superadmin', 'invest', 'moderator']))
            ->with('roleModel:id,name')->orderBy('full_name')->get()
            ->filter(fn (User $user) => $user->id !== $actor->id
                || (int) $project?->attraction_handover_to_id === (int) $user->id)
            ->filter(fn (User $user) => $project
                ? $this->access->canView($user, $project)
                : $user->roleModel?->name === 'superadmin'
                    || $user->id === $actor->id
                    || ($actor->roleModel?->name === 'superadmin'))
            ->map(fn (User $user) => ['id' => $user->id, 'full_name' => $user->full_name])
            ->values();
    }

    public function prepare(array $validated, User $actor, ?InvestmentProject $project = null): array
    {
        if ($validated['status'] !== 'plan') {
            if (in_array($validated['status'], ['implementation', 'launched'], true)
                && $project?->attraction_handover_requested_at
                && $project->attraction_handover_to_id
                && ! $project->attraction_handover_accepted_at) {
                throw ValidationException::withMessages([
                    'status' => 'Алдымен тағайындалған қабылдаушы жобаны сүйемелдеуге қабылдауы керек.',
                ]);
            }

            return $validated;
        }

        $stage = $validated['attraction_stage'];
        if ($stage !== 'handover' && $project?->attraction_handover_requested_at
            && ! $project->attraction_handover_accepted_at) {
            $validated['attraction_handover_to_id'] = null;
            $validated['attraction_handover_requested_at'] = null;
        }
        if ($stage === 'handover') {
            $receiverId = (int) ($validated['attraction_handover_to_id'] ?? 0);
            $candidateIds = $this->candidates($actor, $project)->pluck('id')->all();
            $newRequest = ! $project || $project->attraction_stage !== 'handover'
                || (int) $project->attraction_handover_to_id !== $receiverId;
            if (! in_array($receiverId, $candidateIds, true) || ($newRequest && $receiverId === (int) $actor->id)) {
                throw ValidationException::withMessages([
                    'attraction_handover_to_id' => 'Жобаға қолжетімділігі бар басқа қабылдаушыны таңдаңыз.',
                ]);
            }

            if ($newRequest) {
                $validated['attraction_handover_requested_at'] = now();
                $validated['attraction_handover_accepted_at'] = null;
                $validated['attraction_handover_accepted_by'] = null;
            }
        }

        return $validated;
    }

    public function canAccept(User $user, InvestmentProject $project): bool
    {
        $user->loadMissing('roleModel');

        return $project->status === 'plan' && $project->attraction_stage === 'handover'
            && $project->attraction_handover_requested_at !== null
            && ! $project->is_archived && ! $project->is_deleted
            && (int) $project->attraction_handover_to_id === (int) $user->id
            && ! $project->attraction_handover_accepted_at
            && in_array($user->roleModel?->name, ['superadmin', 'invest', 'moderator'], true)
            && $this->access->canView($user, $project);
    }

    public function accept(User $user, InvestmentProject $project): void
    {
        DB::transaction(function () use ($user, $project) {
            $locked = InvestmentProject::query()->lockForUpdate()->findOrFail($project->id);
            abort_unless($this->canAccept($user, $locked), 403);
            $locked->update([
                'attraction_handover_accepted_at' => now(),
                'attraction_handover_accepted_by' => $user->id,
            ]);
            KpiLog::activity(
                projectId: $locked->id,
                event: 'attraction.handover_accepted',
                category: 'project',
                action: 'Жоба сүйемелдеуге қабылданды',
                subject: $locked,
                actor: $user
            );
        });
    }
}
