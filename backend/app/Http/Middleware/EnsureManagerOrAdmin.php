<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureManagerOrAdmin
{
    /**
     * Handle an incoming request.
     * Restricts access to administrators and managers only.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, ['admin', 'superadmin', 'manager'], true)) {
            if ($request->header('X-Inertia')) {
                abort(403, 'Unauthorized access. Staff members cannot access this section.');
            }

            return redirect()->route('staff.portal')->with('error', 'Unauthorized access. Staff members cannot access this section.');
        }

        return $next($request);
    }
}
