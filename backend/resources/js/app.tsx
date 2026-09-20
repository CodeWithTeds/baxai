import { createInertiaApp, router } from '@inertiajs/react';
import { toast, Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Intercept Inertia non-Inertia JSON responses and http errors — show via sonner instead of the
// default "All Inertia requests must receive a valid Inertia response" modal dialog.
if (typeof window !== 'undefined') {
    const showFromResponse = (response: { data?: unknown; status?: number }) => {
        const raw = response?.data;
        const data = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw as { message?: string; status?: string } | null;
        const msg = (data as { message?: string })?.message ?? (typeof raw === 'string' && raw.length < 500 ? String(raw) : null) ?? `Request failed (${response?.status ?? 'unknown'})`;
        // Don't toast the raw "This action is unauthorized." — use the mapped copy
        const friendly = msg === 'This action is unauthorized.' ? 'You are not allowed to do that.' : msg;
        toast.error(friendly);
    };

    // Fires for 4xx/5xx non-Inertia responses (the modal path)
    router.on('httpException', (event) => {
        event.preventDefault();
        const response = (event.detail as { response?: { data?: unknown; status?: number } }).response;
        if (response) showFromResponse(response);
        return false;
    });

    router.on('error', (event) => {
        // Validation errors are handled by Inertia automatically — don't toast them
        const errors = (event.detail as { errors?: Record<string, string> })?.errors;
        if (errors && Object.keys(errors).length > 0) return;
        // Network/other errors that would otherwise be silent
        const msg = (event.detail as unknown as string) ?? 'Something went wrong.';
        if (typeof msg === 'string' && msg.length > 0) toast.error(msg);
    });
}

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
                return null;
            case name.startsWith('auth/'):
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster richColors position="top-right" closeButton />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
