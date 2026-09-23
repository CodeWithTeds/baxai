import { Link } from '@inertiajs/react';
import { Boxes, Cuboid, ShoppingBag } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const highlights = [
    { icon: Cuboid, text: 'Live 3D preview on every product' },
    { icon: ShoppingBag, text: 'Orders, inventory & pricing in one place' },
    { icon: Boxes, text: 'Design studio with print-ready output' },
];

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-white p-4 sm:p-6">
            {/* soft brand blobs */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#0052CC]/15 blur-3xl"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-[#0052CC]/10 blur-3xl"
            />

            <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_30px_80px_-30px_rgba(0,82,204,0.35)] md:grid-cols-[1fr_1.1fr]">
                {/* brand panel */}
                <div className="relative flex flex-col justify-between gap-8 bg-gradient-to-br from-[#0052CC] via-[#0043A8] to-[#003D9B] p-7 text-white sm:p-8">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-20"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.5) 0, transparent 35%), radial-gradient(circle at 10% 90%, rgba(255,255,255,0.25) 0, transparent 40%)',
                        }}
                    />
                    <Link href={home()} className="relative flex items-center gap-2.5">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow">
                            <AppLogoIcon className="size-8" />
                        </span>
                        <span>
                            <span className="block text-[15px] leading-tight font-extrabold tracking-tight">
                                NUYDA ENTERPRISE
                            </span>
                            <span className="block text-[11px] leading-tight text-white/70">
                                Admin panel
                            </span>
                        </span>
                    </Link>

                    <div className="relative">
                        <h2 className="text-[26px] leading-tight font-extrabold tracking-tight">
                            Custom printing,
                            <br />
                            in 3D.
                        </h2>
                        <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-white/75">
                            Manage products, preview designs live, and keep
                            orders moving — all from one dashboard.
                        </p>
                        <ul className="mt-6 space-y-3">
                            {highlights.map((h) => (
                                <li key={h.text} className="flex items-center gap-2.5 text-[13px] text-white/90">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                                        <h.icon size={14} />
                                    </span>
                                    {h.text}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="relative text-[11px] text-white/60">
                        © 2026 NUYDA ENTERPRISE · Montalban, Rizal
                    </p>
                </div>

                {/* form panel */}
                <div className="flex flex-col justify-center p-7 sm:p-10">
                    <div className="mb-6 flex items-center gap-2 md:hidden">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-0.5 shadow ring-1 ring-black/5">
                            <AppLogoIcon className="size-8" />
                        </span>
                        <span className="text-sm font-extrabold tracking-tight">
                            NUYDA ENTERPRISE
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        <h1 className="text-[22px] font-extrabold tracking-tight text-[#1A1C1E]">
                            {title}
                        </h1>
                        {description && (
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    <div className="mt-6">{children}</div>
                </div>
            </div>
        </div>
    );
}
