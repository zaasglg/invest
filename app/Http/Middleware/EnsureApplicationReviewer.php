<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApplicationReviewer
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user()?->loadMissing('roleModel');

        abort_unless(
            in_array($user?->roleModel?->name, ['superadmin', 'invest'], true),
            403,
            'Өтінімдерді қарауға рұқсат жоқ.'
        );

        return $next($request);
    }
}
