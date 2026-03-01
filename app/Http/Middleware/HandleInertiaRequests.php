<?php

namespace App\Http\Middleware;

use App\Models\TaskNotification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user()?->load('roleModel'),
            ],
            'canModify' => ! $this->isReadOnlyRole($request->user()),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'unreadNotificationsCount' => $request->user()
                ? TaskNotification::where('user_id', $request->user()->id)->where('is_read', false)->count()
                : 0,
        ];
    }

    protected function isReadOnlyRole($user): bool
    {
        if (! $user) {
            return false;
        }

        $roleCandidates = array_filter([
            $user->role,
            $user->roleModel?->name,
            $user->roleModel?->display_name,
        ]);

        foreach ($roleCandidates as $candidate) {
            $normalized = strtolower(str_replace(' ', '', $candidate));

            if (str_contains($normalized, 'zamakim') || str_contains($normalized, 'akim') || str_contains($normalized, 'baskarma')) {
                return true;
            }
        }

        return false;
    }
}
