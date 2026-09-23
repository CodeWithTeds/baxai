import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    Boxes,
    ChevronDown,
    FileCheck,
    FolderKanban,
    LayoutGrid,
    Package,
    Printer,
    Settings,
    ShoppingBag,
    Sparkles,
    Tag,
    Users,
    Warehouse,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

function Group({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <p
                className="px-3 pb-1 text-[10px] tracking-wider text-white/60 uppercase font-bold"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
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
    const isActive = active || (href ? (href === '/dashboard' ? url === '/dashboard' : url.startsWith(href)) : false);
    const cls = `group flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] transition-all duration-150 ${
        isActive
            ? 'bg-white text-[#0052CC] font-semibold shadow-sm'
            : 'text-white/85 hover:bg-white/10 hover:text-white'
    }`;
    const inner = (
        <>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">{children}</span>
            <span className="min-w-0 flex-1 truncate text-left" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                {label}
            </span>
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

function SubMenu({
    label,
    icon: Icon,
    dot = false,
    items,
}: {
    label: string;
    icon: any;
    dot?: boolean;
    items: { label: string; href: string; dot?: boolean }[];
}) {
    const { url } = usePage();
    const isAnyChildActive = items.some(
        (subItem) =>
            subItem.href !== '#' &&
            (url === subItem.href || (subItem.href !== '/' && url.startsWith(subItem.href)))
    );
    const [isOpen, setIsOpen] = useState(isAnyChildActive);

    useEffect(() => {
        if (isAnyChildActive) {
            setIsOpen(true);
        }
    }, [isAnyChildActive]);

    return (
        <div className="flex flex-col gap-0.5">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`group flex w-full items-center justify-start gap-3 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium transition-all duration-150 ${
                    isAnyChildActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/85 hover:bg-white/10 hover:text-white'
                }`}
            >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1 truncate text-left" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {label}
                </span>
                {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3DD598]" />}
                <ChevronDown
                    size={14}
                    className={`shrink-0 text-white/70 transition-transform duration-200 ease-in-out ${
                        isOpen ? 'rotate-180 text-white' : ''
                    }`}
                />
            </button>

            {isOpen && (
                <div className="relative ml-4 mt-1 flex flex-col gap-1 border-l-2 border-white/30 pl-3 py-0.5 transition-all duration-200 ease-out animate-in fade-in slide-in-from-top-1">
                    {items.map((subItem) => {
                        const isSubActive =
                            subItem.href !== '#' &&
                            (url === subItem.href || (subItem.href !== '/' && url.startsWith(subItem.href)));
                        return (
                            <Link
                                key={subItem.label + subItem.href}
                                href={subItem.href}
                                className={`group relative flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[12px] transition-all duration-150 ${
                                    isSubActive
                                        ? 'bg-white text-[#0052CC] font-bold shadow-xs translate-x-0.5'
                                        : 'text-white/80 hover:bg-white/15 hover:text-white hover:translate-x-1'
                                }`}
                            >
                                <span className="truncate">{subItem.label}</span>
                                {subItem.dot && (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3DD598]" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

/**
 * Single shared admin sidebar — primary color background.
 * Used by dashboard AND all admin pages. Edit here once.
 */
export default function PlacidesSidebar() {
    return (
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-[#0052CC] md:flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <div className="flex h-14 shrink-0 items-center gap-2.5 px-4 border-b border-white/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[15px] font-extrabold text-[#0052CC] shadow-xs">
                    N
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-[13px] leading-tight font-extrabold text-white">
                        NUYDA ENTERPRISE
                    </span>
                    <span className="block text-[10px] leading-tight text-white/75 font-medium">
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

                <Group label="Sales & Catalog">
                    <Item label="Orders" dot>
                        <ShoppingBag size={18} />
                    </Item>
                    <Item label="Products" href="/products">
                        <Package size={18} />
                    </Item>
                    <Item label="Customers" href="/customers">
                        <Users size={18} />
                    </Item>
                </Group>

                <Group label="Printing Operations">
                    <SubMenu
                        label="Printing Services"
                        icon={Printer}
                        dot
                        items={[
                            { label: 'Services List', href: '/print-items', dot: true },
                            { label: 'Print Categories', href: '/print-categories' },
                        ]}
                    />
                    <Item label="Proof Approvals">
                        <FileCheck size={18} />
                    </Item>
                    <Item label="Production Queue">
                        <FolderKanban size={18} />
                    </Item>
                </Group>

                <Group label="Inventory & Stock">
                    <Item label="Paper & Stock">
                        <Warehouse size={18} />
                    </Item>
                    <Item label="Equipment & Inks">
                        <Boxes size={18} />
                    </Item>
                </Group>

                <Group label="Marketing & Deals">
                    <Item label="Discounts & Coupons">
                        <Tag size={18} />
                    </Item>
                    <Item label="VIP & Rewards">
                        <Sparkles size={18} />
                    </Item>
                </Group>

                <Group label="System & Control">
                    <Item label="Settings" href="/profile">
                        <Settings size={18} />
                    </Item>
                </Group>
            </nav>
        </aside>
    );
}
