import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent } from 'react';
import { dashboard } from '@/routes';
import { RoleOption, StaffForm, StaffUser } from './create';

interface StaffEditProps {
    staff: StaffUser;
    departments?: string[];
    roles?: RoleOption[];
    shifts?: string[];
    workstations?: string[];
}

export default function EditStaff({
    staff,
    departments = [],
    roles = [],
    shifts = [],
    workstations = [],
}: StaffEditProps) {
    const pageProps = usePage().props as unknown as { auth?: { user?: { id: number; role?: string } } };
    const currentUserId = pageProps.auth?.user?.id;
    const isCurrentUser = staff.id === currentUserId;
    const canDelete = pageProps.auth?.user?.role !== 'staff';

    const profile = staff.staff_profile;

    const { data, setData, put, processing, errors } = useForm({
        name: staff.name ?? '',
        username: staff.username ?? '',
        email: staff.email ?? '',
        password: '',
        password_confirmation: '',
        role: staff.role ?? 'staff',
        is_active: staff.is_active ?? true,
        employee_id: profile?.employee_id ?? '',
        department: profile?.department ?? (departments[0] ?? 'Management'),
        position: profile?.position ?? 'Staff',
        workstation: profile?.workstation ?? '',
        shift: profile?.shift ?? (shifts[0] ?? 'Regular (8:00 AM - 5:00 PM)'),
        phone: profile?.phone ?? '',
        emergency_contact: profile?.emergency_contact ?? '',
        hire_date: profile?.hire_date ?? '',
        notes: profile?.notes ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        put(`/staff/${staff.id}`);
    };

    const handleDelete = () => {
        if (!canDelete) {
            alert('Staff members are not authorized to delete records.');
            return;
        }
        if (isCurrentUser) {
            alert('You cannot delete your own administrative account.');
            return;
        }
        if (confirm(`Are you sure you want to permanently delete staff member "${staff.name}"?`)) {
            router.delete(`/staff/${staff.id}`);
        }
    };

    return (
        <>
            <Head title={`Edit — ${staff.name}`} />
            <StaffForm
                initial={staff}
                data={data}
                setData={setData}
                onSubmit={submit}
                processing={processing}
                errors={errors}
                submitLabel="Save Changes"
                roles={roles}
                departments={departments}
                shifts={shifts}
                workstations={workstations}
                isCurrentUser={isCurrentUser}
                canDelete={canDelete}
                onDelete={handleDelete}
            />
        </>
    );
}

EditStaff.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Staff Management',
            href: '/staff',
        },
        {
            title: 'Edit',
            href: '/staff',
        },
    ],
};
