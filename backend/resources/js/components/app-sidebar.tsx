import { Link } from '@inertiajs/react';
import {
    BookOpen,
    Boxes,
    FileCheck,
    FolderGit2,
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
import AppLogo from '@/components/app-logo';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { edit as profileEdit } from '@/routes/profile';
import type { NavItem } from '@/types';

const overviewNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

const sellNavItems: NavItem[] = [
    {
        title: 'Orders',
        href: '#',
        icon: ShoppingBag,
    },
    {
        title: 'Products',
        href: '/products',
        icon: Package,
    },
    {
        title: 'Customers',
        href: '/customers',
        icon: Users,
    },
];

const printNavItems: NavItem[] = [
    {
        title: 'Printing Services',
        href: '/print-items',
        icon: Printer,
        items: [
            { title: 'Services List', href: '/print-items' },
            { title: 'Print Categories', href: '/print-categories' },
        ],
    },
    {
        title: 'Proof Approvals',
        href: '#',
        icon: FileCheck,
    },
    {
        title: 'Production Queue',
        href: '#',
        icon: FolderKanban,
    },
];

const inventoryNavItems: NavItem[] = [
    {
        title: 'Paper & Stock',
        href: '#',
        icon: Warehouse,
    },
    {
        title: 'Equipment & Inks',
        href: '#',
        icon: Boxes,
    },
];

const marketingNavItems: NavItem[] = [
    {
        title: 'Discounts & Coupons',
        href: '#',
        icon: Tag,
    },
    {
        title: 'VIP & Rewards',
        href: '#',
        icon: Sparkles,
    },
];

const manageNavItems: NavItem[] = [
    {
        title: 'Settings',
        href: profileEdit(),
        icon: Settings,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain label="Overview" items={overviewNavItems} />
                <NavMain label="Sales & Catalog" items={sellNavItems} />
                <NavMain label="Printing Operations" items={printNavItems} />
                <NavMain label="Inventory & Stock" items={inventoryNavItems} />
                <NavMain label="Marketing & Deals" items={marketingNavItems} />
                <NavMain label="System & Control" items={manageNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
