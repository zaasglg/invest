<?php

namespace App\Http\Middleware;

use App\Models\ApiClient;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiClient
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = trim((string) $request->bearerToken());

        if ($token === '' || strlen($token) > 255) {
            return $this->unauthenticated();
        }

        $client = ApiClient::query()
            ->where('token_hash', hash('sha256', $token))
            ->where('is_active', true)
            ->where(function ($query): void {
                $query
                    ->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->first();

        if (! $client) {
            return $this->unauthenticated();
        }

        $client->forceFill(['last_used_at' => now()])->saveQuietly();
        $request->attributes->set('api_client', $client);

        return $next($request);
    }

    private function unauthenticated(): Response
    {
        return response()->json([
            'message' => 'Unauthenticated.',
            'error' => 'invalid_api_token',
        ], 401);
    }
}
