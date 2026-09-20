<?php

use App\Exceptions\ApiExceptionHandler;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (Throwable $e, Request $request) {
            // Inertia must never receive a plain JSON error envelope — it triggers
            // "All Inertia requests must receive a valid Inertia response". Handle
            // Inertia first, even for api/* if someone mistakenly calls it via router.
            // Per skills/codingstandard.md: keep exception handling centralized here.
            if ($request->header('X-Inertia')) {
                if ($e instanceof ValidationException) {
                    return null;
                }

                if ($e instanceof AuthorizationException) {
                    $msg = $e->getMessage() ?: 'This action is unauthorized.';
                    if ($msg === 'This action is unauthorized.') {
                        $msg = 'You are not allowed to do that.';
                    }

                    return redirect()->back()->with('error', $msg);
                }

                if ($e instanceof AuthenticationException) {
                    return redirect()->route('login')->with('error', 'Please sign in to continue.');
                }

                // Any other http/authorization exception that would otherwise become a
                // plain JSON via ApiExceptionHandler — convert to a flash error so the
                // sonner toast can display it instead of the Inertia modal.
                if ($e instanceof HttpException) {
                    $msg = $e->getMessage() ?: 'Request failed.';
                    $code = $e->getStatusCode();
                    if (in_array($code, [401, 403, 404, 405, 419, 429], true)) {
                        return redirect()->back()->with('error', $msg);
                    }
                }

                if ($e instanceof ModelNotFoundException) {
                    return redirect()->back()->with('error', 'Resource not found.');
                }

                if ($e instanceof QueryException) {
                    $raw = $e->getMessage();
                    $msg = str_contains($raw, 'Duplicate entry')
                        ? 'A product with that name already exists. Try a different name.'
                        : 'Database error. Please try again.';

                    return redirect()->back()->with('error', $msg)->withInput();
                }

                // Fallback — any other 500 on Inertia should become a toast, not the modal.
                // Use a generic message in production to avoid leaking internals.
                $msg = app()->hasDebugModeEnabled() ? $e->getMessage() : 'Something went wrong. Please try again.';
                if (str_contains($msg, 'Duplicate entry')) {
                    $msg = 'A product with that slug already exists. Try a different name.';
                }

                // Only for Inertia — don't swallow validation which is handled above
                return redirect()->back()->with('error', $msg)->withInput();
            }

            if ($request->is('api/*')) {
                return (new ApiExceptionHandler)->handle($e, $request);
            }
        });
    })->create();
