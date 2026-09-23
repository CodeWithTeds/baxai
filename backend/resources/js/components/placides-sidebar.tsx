import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Boxes,
    FileCheck,
    LayoutGrid,
    Package,
    Printer,
    Settings,
    ShoppingBag,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';

function Group({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <p className="px-3 pb-1.5 text-[11px] tracking-wider text-white/60 uppercase" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                {label}
            </p>
            <div className="flex flex-col gap-0.5">{children}</div>
        </div>
    );
}

function Item({
    label,
    href,
    active = false,
    dot = false,
    children,
}: {
    label: string;
    href?: string;
    active?: boolean;
    dot?: boolean;
    children: ReactNode;
}) {
    const { url } = usePage();
    const isActive = active || (href ? url.startsWith(href) : false);
    const cls = `group flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition-colors ${
        isActive ? 'bg-white text-[#0052CC] shadow' : 'text-white/85 hover:bg-white/10 hover:text-white'
    }`;
    const inner = (
        <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{children}</span>
            <span className="min-w-0 flex-1 truncate text-left" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{label}</span>
            {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3DD598]" />}
        </>
    );
    if (href) {
        return (
            <Link href={href} title={label} aria-label={label} className={cls}>
                {inner}
            </Link>
        );
    }
    return (
        <button type="button" title={label} aria-label={label} className={cls}>
            {inner}
        </button>
    );
}

/**
 * Single shared admin sidebar — primary color background.
 * Used by dashboard AND all admin pages. Edit here once.
 */
export default function PlacidesSidebar() {
    return (
        <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col bg-[#0052CC] md:flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="flex h-14 shrink-0 items-center gap-2 px-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[15px] font-extrabold text-[#0052CC]">
                    N
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-[13px] leading-tight font-extrabold text-white">
                        NUYDA ENTERPRISE
                    </span>
                    <span className="block text-[10px] leading-tight text-white/70">
                        Admin panel
                    </span>
                </span>
            </div>
            <nav aria-label="Admin" className="flex flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-4">
                <Group label="Overview">
                    <Item label="Dashboard" href="/dashboard">
                        <LayoutGrid size={18} />
                    </Item>
                </Group>
                <Group label="Sell">
                    <Item label="Orders" dot>
                        <ShoppingBag size={18} />
                    </Item>
                    <Item label="Products" href="/products">
                        <Package size={18} />
                    </Item>
                    <Item label="Customers">
                        <Users size={18} />
                    </Item>
                </Group>
                <Group label="Print">
                    <Item label="Printing" dot>
                        <Printer size={18} />
                    </Item>
                    <Item label="Proofs">
                        <FileCheck size={18} />
                    </Item>
                    <Item label="Materials">
                        <Boxes size={18} />
                    </Item>
                </Group>
                <Group label="Manage">
                    <Item label="Reports">
                        <BarChart3 size={18} />
                    </Item>
                    <Item label="Settings">
                        <Settings size={18} />
                    </Item>
                </Group>
            </nav>
        </aside>
    );
}
