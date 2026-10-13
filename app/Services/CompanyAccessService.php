<?php

namespace App\Services;

use App\Models\User;

class CompanyAccessService
{
    public function canView(?User $user): bool
    {
        return $this->canManage($user)
            || in_array(
                $user?->roleModel?->name,
                ['prokuror', 'akim', 'zamakim'],
                true
            );
    }

    public function canManage(?User $user): bool
    {
        $roleName = $user?->roleModel?->name;

        return in_array($roleName, ['superadmin', 'moderator'], true)
            || ($roleName === 'invest'
                && $user->invest_sub_role === 'turkistan_invest');
    }

    public function canDelete(?User $user): bool
    {
        return $user?->roleModel?->name === 'superadmin';
    }
}
