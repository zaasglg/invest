<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSupportedRole
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user) {
            abort_unless(
                $user->hasSupportedRole(),
                403,
                'Сіздің аккаунтыңызға жарамды рөл тағайындалмаған.'
            );
        }

        return $next($request);
    }
}
