import { Head, Link, usePage } from '@inertiajs/react';
import { Bell, Search, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import PlacidesSidebar from '@/components/placides-sidebar';
import type { ReactNode } from 'react';

export function PlacidesCard({ children, className = '' }: { children: ReactNode; className?: string }) {
    return (
        <section
            className={`rounded-2xl bg-white p-5 shadow-[0_10px_30px_-24px_rgba(26,28,30,0.3)] ${className}`}
        >
            {children}
        </section>
    );
}

export default function PlacidesAdminLayout({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    const pageProps = usePage().props as unknown as { flash?: { success?: string; error?: string } };
    const flash = pageProps.flash ?? {};

    useEffect(() => {
        if (flash.error) toast.error(flash.error);
        if (flash.success) toast.success(flash.success);
    }, [flash.error, flash.success]);

    return (
        <>
            <Head title={title} />
            <div className="flex min-h-screen w-full bg-[#ECEEF4] text-[#1A1C1E]">
                <PlacidesSidebar />

                <div className="min-w-0 flex-1 px-4 pt-5 pb-24 sm:px-7 md:pb-10">
                    <div className="mx-auto w-full max-w-[1380px]">
                        <header className="flex flex-wrap items-center gap-3">
                            <nav className="flex items-center gap-5 text-[13px] font-semibold">
                                <Link href="/dashboard" className="pb-1 text-[#8A8FA3] transition hover:text-[#1A1C1E]">
                                    Dashboard
                                </Link>
                                <span className="border-b-2 border-[#1A1C1E] pb-1 text-[#1A1C1E]">{title}</span>
                            </nav>
                            <div className="relative mx-auto hidden w-full max-w-[300px] flex-1 lg:block">
                                <Search size={14} className="absolute top-1/2 left-4 -translate-y-1/2 text-[#B9BED1]" />
                                <input
                                    placeholder="Search or type command"
                                    className="w-full rounded-full border border-[#E9EBF3] bg-white py-2.5 pr-4 pl-10 text-xs outline-none placeholder:text-[#B9BED1] focus:border-[#0052CC]"
                                />
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <button aria-label="Notifications" className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white">
                                    <Bell size={17} />
                                </button>
                                <button aria-label="Settings" className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white">
                                    <Settings size={17} />
                                </button>
                            </div>
                        </header>
                        <main className="mt-6">{children}</main>
                    </div>
                </div>
            </div>
        </>
    );
}
