<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureNotApplicant
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_if(
            $request->user()?->loadMissing('roleModel')->roleModel?->name === 'applicant',
            403,
            'Бұл бөлім өтінім берушіге қолжетімсіз.'
        );

        return $next($request);
    }
}
