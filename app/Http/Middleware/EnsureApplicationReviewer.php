<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApplicationReviewer
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user()?->loadMissing('roleModel');

        $isSuperadmin = $user?->roleModel?->name === 'superadmin';
        $isAllowedInvestReviewer = $user?->roleModel?->name === 'invest'
            && in_array(
                $user->invest_sub_role,
                [
                    User::INVEST_SUB_ROLE_TURKISTAN_ATTRACTION,
                    'aea',
                    'ia',
                    'prom_zone',
                ],
                true
            );

        abort_unless(
            $isSuperadmin || $isAllowedInvestReviewer,
            403,
            'Өтінімдерді қарауға рұқсат жоқ.'
        );

        return $next($request);
    }
}
