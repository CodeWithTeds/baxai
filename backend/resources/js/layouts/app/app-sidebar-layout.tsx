import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const flash = (usePage().props as unknown as {
        flash?: { success?: string; error?: string; undo_audit_id?: number };
    }).flash ?? {};

    useEffect(() => {
        if (flash.error) {
            toast.error(flash.error);
        }
        if (flash.success) {
            if (flash.undo_audit_id) {
                toast.success(flash.success, {
                    action: {
                        label: 'Undo Change',
                        onClick: () => router.post(`/audit-logs/${flash.undo_audit_id}/undo`),
                    },
                    duration: 8000,
                });
            } else {
                toast.success(flash.success);
            }
        }
    }, [flash.error, flash.success, flash.undo_audit_id]);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="px-6 py-4">{children}</div>
            </AppContent>
        </AppShell>
    );
}
