<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureApplicantRole
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(
            in_array(
                $request->user()?->loadMissing('roleModel')->roleModel?->name,
                ['applicant', 'investor'],
                true
            ),
            403,
            'Бұл бөлім тек өтінім беруші мен Investor аккаунтына арналған.'
        );

        return $next($request);
    }
}
