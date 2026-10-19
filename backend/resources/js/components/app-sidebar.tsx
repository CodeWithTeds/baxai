import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    Boxes,
    FolderGit2,
    LayoutGrid,
    Package,
    Printer,
    ScrollText,
    Settings,
    ShoppingBag,
    TrendingUp,
    UserCheck,
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
import { dashboard, sales } from '@/routes';
import { edit as profileEdit } from '@/routes/profile';
import type { NavItem } from '@/types';

const overviewNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Sales',
        href: sales(),
        icon: TrendingUp,
    },
];

const staffOverviewNavItems: NavItem[] = [
    {
        title: 'Staff Portal',
        href: '/staff-portal',
        icon: LayoutGrid,
    },
];

const sellNavItems: NavItem[] = [
    {
        title: 'Orders',
        href: '/orders',
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
];

const inventoryNavItems: NavItem[] = [
    {
        title: 'Paper & Stock',
        href: '/print-items?filter[category_code]=STOCK',
        icon: Warehouse,
    },
];

const manageNavItems: NavItem[] = [
    {
        title: 'Staff Management',
        href: '/staff',
        icon: UserCheck,
    },
    {
        title: 'Audit Logs',
        href: '/audit-logs',
        icon: ScrollText,
    },
    {
        title: 'Settings',
        href: profileEdit(),
        icon: Settings,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props as unknown as { auth?: { user?: { role?: string } } };
    const userRole = auth?.user?.role;
    const isStaff = userRole === 'staff' || (userRole && !['admin', 'superadmin', 'manager'].includes(userRole));

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={isStaff ? '/staff-portal' : dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain label="Overview" items={isStaff ? staffOverviewNavItems : overviewNavItems} />
                <NavMain label="Sales & Catalog" items={sellNavItems} />
                <NavMain label="Printing Operations" items={printNavItems} />
                <NavMain label="Inventory & Stock" items={inventoryNavItems} />
                {!isStaff && <NavMain label="System & Control" items={manageNavItems} />}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
