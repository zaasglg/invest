<?php

namespace App\Services;

use App\Models\InvestmentProject;
use App\Models\ProjectChatMessage;
use App\Models\ProjectChatRead;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ProjectChatService
{
    public function accessibleProjects(User $user): Builder
    {
        return InvestmentProject::query()->whereChatParticipant($user);
    }

    public function unreadMessageCount(User $user): int
    {
        $projectIds = $this->accessibleProjects($user)
            ->select('investment_projects.id');

        return ProjectChatMessage::query()
            ->leftJoin('project_chat_reads as reads', function ($join) use ($user) {
                $join
                    ->on(
                        'reads.investment_project_id',
                        '=',
                        'project_chat_messages.investment_project_id'
                    )
                    ->where('reads.user_id', $user->id);
            })
            ->whereIn(
                'project_chat_messages.investment_project_id',
                $projectIds
            )
            ->where('project_chat_messages.user_id', '!=', $user->id)
            ->whereRaw(
                'project_chat_messages.id > COALESCE(reads.last_read_message_id, 0)'
            )
            ->count();
    }

    /**
     * @param  Collection<int, int>  $projectIds
     * @return Collection<int, int>
     */
    public function unreadCounts(User $user, Collection $projectIds): Collection
    {
        if ($projectIds->isEmpty()) {
            return collect();
        }

        return DB::table('project_chat_messages as messages')
            ->leftJoin('project_chat_reads as reads', function ($join) use ($user) {
                $join
                    ->on(
                        'reads.investment_project_id',
                        '=',
                        'messages.investment_project_id'
                    )
                    ->where('reads.user_id', $user->id);
            })
            ->whereIn('messages.investment_project_id', $projectIds)
            ->where('messages.user_id', '!=', $user->id)
            ->whereRaw(
                'messages.id > COALESCE(reads.last_read_message_id, 0)'
            )
            ->groupBy('messages.investment_project_id')
            ->select('messages.investment_project_id')
            ->selectRaw('COUNT(*) as unread_count')
            ->pluck('unread_count', 'messages.investment_project_id')
            ->map(fn ($count) => (int) $count);
    }

    public function markAsRead(
        InvestmentProject $project,
        User $user
    ): void {
        $latestMessageId = $project->chatMessages()->max('id');

        if (! $latestMessageId) {
            return;
        }

        ProjectChatRead::updateOrCreate(
            [
                'investment_project_id' => $project->id,
                'user_id' => $user->id,
            ],
            ['last_read_message_id' => $latestMessageId]
        );
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function participants(InvestmentProject $project): Collection
    {
        $project->loadMissing([
            'curators:id,full_name,avatar,position',
            'investors:id,full_name,avatar,position',
            'executors:id,full_name,avatar,position',
            'creator:id,full_name,avatar,position',
        ]);

        $participants = collect();

        $curators = $project->curators;
        if ($curators->isEmpty() && $project->creator) {
            $curators = collect([$project->creator]);
        }

        foreach ($curators as $curator) {
            $this->addParticipant(
                $participants,
                $curator,
                'Жоба кураторы'
            );
        }

        foreach ($project->investors as $investor) {
            $this->addParticipant(
                $participants,
                $investor,
                'Жоба инвесторы'
            );
        }

        foreach ($project->executors as $executor) {
            $this->addParticipant(
                $participants,
                $executor,
                'Орындаушы'
            );
        }

        return $participants->values();
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $participants
     */
    private function addParticipant(
        Collection $participants,
        User $user,
        string $projectRole
    ): void {
        $existing = $participants->get($user->id);

        if ($existing) {
            $existing['project_roles'][] = $projectRole;
            $existing['project_roles'] = array_values(
                array_unique($existing['project_roles'])
            );
            $participants->put($user->id, $existing);

            return;
        }

        $participants->put($user->id, [
            'id' => $user->id,
            'full_name' => $user->full_name,
            'avatar_url' => $user->avatar_url,
            'position' => $user->position,
            'project_roles' => [$projectRole],
        ]);
    }
}
