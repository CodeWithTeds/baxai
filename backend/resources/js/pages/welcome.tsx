import { Head, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { mount, unmount } from 'svelte';
import { dashboard, login, register } from '@/routes';
import LandingPage from '@/svelte/landing/LandingPage.svelte';

/**
 * Landing page shell — the page itself is Svelte
 * (@/svelte/landing/LandingPage.svelte), mounted here so the
 * Laravel + Inertia + React app keeps working untouched.
 */
export default function Welcome({ canRegister = true }: { canRegister?: boolean }) {
    const { auth } = usePage().props as unknown as { auth: { user: unknown } };
    const hostRef = useRef<HTMLDivElement>(null);

    const hasUser = Boolean(auth.user);
    const loginUrl = login().url;
    const registerUrl = register().url;
    const dashboardUrl = dashboard().url;

    useEffect(() => {
        if (!hostRef.current) {
            return;
        }

        const app = mount(LandingPage, {
            target: hostRef.current,
            props: {
                user: hasUser,
                canRegister,
                loginUrl,
                registerUrl,
                dashboardUrl,
            },
        });

        return () => {
            unmount(app);
        };
    }, [hasUser, canRegister, loginUrl, registerUrl, dashboardUrl]);

    return (
        <>
            <Head title="NUYDA ENTERPRISE — Custom Printing in 3D" />
            <div ref={hostRef} />
        </>
    );
}
