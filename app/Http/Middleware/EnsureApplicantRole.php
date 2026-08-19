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
            $request->user()?->loadMissing('roleModel')->roleModel?->name === 'applicant',
            403,
            'Бұл бөлім тек өтінім берушілерге арналған.'
        );

        return $next($request);
    }
}
