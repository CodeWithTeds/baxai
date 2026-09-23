import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    ArrowUpDown,
    Boxes,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Plus,
    Printer,
    RotateCcw,
    Search,
    Trash2,
} from 'lucide-react';
import { dashboard } from '@/routes';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import InputError from '@/components/input-error';

interface CategoryRow {
    id: number;
    name: string;
    slug: string;
    code: string;
    description: string | null;
    icon: string | null;
    status: string;
    sort_order: number;
    print_items_count?: number;
    created_at?: string;
}

interface PaginatedCategories {
    data: CategoryRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export default function PrintCategoriesIndex({
    categories = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as PaginatedCategories,
    filters = {},
    stats = { total: 0, active: 0, inactive: 0 },
}: {
    categories?: PaginatedCategories;
    filters?: Record<string, any>;
    stats?: { total: number; active: number; inactive: number };
}) {
    const safeFilters = filters || {};
    const rawFilter = (safeFilters.filter && typeof safeFilters.filter === 'object' ? safeFilters.filter : {}) as Record<string, string>;
    const [search, setSearch] = useState<string>(rawFilter.search ?? '');
    const [status, setStatus] = useState<string>(rawFilter.status ?? 'all');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);

    const safeData = Array.isArray(categories?.data) ? categories.data : [];

    const handleFilterChange = (updates: Record<string, string>) => {
        const query: Record<string, unknown> = {
            filter: {
                search: updates.search ?? search,
                status: (updates.status ?? status) === 'all' ? undefined : (updates.status ?? status),
            },
            per_page: filters.per_page ?? 10,
        };

        router.get('/print-categories', query as never, { preserveState: true, replace: true });
    };

    const resetFilters = () => {
        setSearch('');
        setStatus('all');
        router.get('/print-categories', {}, { preserveState: true, replace: true });
    };

    const handleDelete = (cat: CategoryRow) => {
        if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
            router.delete(`/print-categories/${cat.id}`);
        }
    };

    // FORM FOR CREATE & EDIT
    const createForm = useForm({
        name: '',
        code: '',
        slug: '',
        description: '',
        status: 'active',
        sort_order: 0,
    });

    const editForm = useForm({
        name: '',
        code: '',
        slug: '',
        description: '',
        status: 'active',
        sort_order: 0,
    });

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        createForm.post('/print-categories', {
            onSuccess: () => {
                setIsCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditOpen = (cat: CategoryRow) => {
        setEditingCategory(cat);
        editForm.setData({
            name: cat.name,
            code: cat.code,
            slug: cat.slug,
            description: cat.description ?? '',
            status: cat.status,
            sort_order: cat.sort_order ?? 0,
        });
    };

    const handleEditSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!editingCategory) return;
        editForm.put(`/print-categories/${editingCategory.id}`, {
            onSuccess: () => {
                setEditingCategory(null);
                editForm.reset();
            },
        });
    };

    return (
        <div className="font-sans text-[#1A1C1E]">
            <Head title="Print Categories — Admin" />

            {/* HEADER AREA */}
            <div className="mb-4 border-b border-[#E5E7EB] pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <Boxes className="h-4 w-4 text-[#1A1C1E]" />
                            <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E]">
                                Print Categories <span className="font-mono text-xs text-muted-foreground">({stats.total})</span>
                            </h1>
                        </div>
                        <p className="mt-0.5 text-xs text-[#6B7280]">
                            Organize commercial printing services by category (Marketing, Stationeries, Photo & Fine Art, Packaging, etc.).
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href="/print-items">
                            <Button variant="outline" className="h-8 rounded-none border-[#D1D5DB] px-3 text-xs font-mono text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]">
                                <Printer size={13} className="mr-1.5" />
                                View Print Items
                            </Button>
                        </Link>
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="h-8 rounded-none bg-[#1A1C1E] px-3 text-xs font-normal text-white hover:bg-black"
                        >
                            <Plus size={14} className="mr-1" />
                            Add Print Category
                        </Button>
                    </div>
                </div>

                {/* NAVIGATION TABS */}
                <div className="mt-3 flex items-center gap-2 border-t border-[#E5E7EB] pt-2 font-mono text-xs">
                    <Link
                        href="/print-items"
                        className="pb-1 text-[#6B7280] hover:text-[#1A1C1E]"
                    >
                        Print Items
                    </Link>
                    <span className="text-[#D1D5DB]">|</span>
                    <Link
                        href="/print-categories"
                        className="border-b-2 border-[#1A1C1E] pb-1 font-bold text-[#1A1C1E]"
                    >
                        Print Categories ({stats.total})
                    </Link>
                </div>
            </div>

            {/* FILTER TOOLBAR */}
            <div className="mb-3 rounded-none border border-[#E5E7EB] bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-2.5 top-2 h-4 w-4 text-[#8A8FA3]" />
                            <Input
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    handleFilterChange({ search: e.target.value });
                                }}
                                placeholder="Search category name, code..."
                                className="h-8 rounded-none border-[#D1D5DB] pl-8 text-xs placeholder:text-[#8A8FA3] focus-visible:border-[#1A1C1E] focus-visible:ring-0"
                            />
                        </div>

                        <Select
                            value={status}
                            onValueChange={(v) => {
                                setStatus(v);
                                handleFilterChange({ status: v });
                            }}
                        >
                            <SelectTrigger className="h-8 w-[140px] rounded-none border-[#D1D5DB] text-xs font-mono">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-none">
                                <SelectItem value="all" className="text-xs font-mono">All Statuses</SelectItem>
                                <SelectItem value="active" className="text-xs">Active</SelectItem>
                                <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                            </SelectContent>
                        </Select>

                        {(search || status !== 'all') && (
                            <Button
                                variant="ghost"
                                onClick={resetFilters}
                                className="h-8 rounded-none px-2 text-xs font-mono text-red-600 hover:bg-red-50"
                            >
                                <RotateCcw size={12} className="mr-1" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* HIGH DENSITY PURE BOX TABLE */}
            <div className="overflow-x-auto border border-[#E5E7EB] bg-white">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[10px] uppercase tracking-wider text-[#4A4E5A]">
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Category Name & Code</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Slug</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB]">Description</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Print Services</th>
                            <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Status</th>
                            <th className="px-2 py-2 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                        {safeData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-xs font-mono text-[#8A8FA3]">
                                    No print categories found.
                                </td>
                            </tr>
                        ) : (
                            safeData.map((cat) => (
                                <tr key={cat.id} className="hover:bg-[#F9FAFB] transition-colors">
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                        <div className="font-semibold text-[#1A1C1E]">{cat.name}</div>
                                        <div className="font-mono text-[10px] text-[#6B7280]">{cat.code}</div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] font-mono text-[11px] text-[#4A4E5A]">
                                        {cat.slug}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-[#374151] max-w-xs truncate">
                                        {cat.description || '—'}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center font-mono font-bold text-[#1A1C1E]">
                                        {cat.print_items_count ?? 0} {cat.print_items_count === 1 ? 'item' : 'items'}
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center">
                                        <span className={`inline-block rounded-none border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                                            cat.status === 'active'
                                                ? 'border-[#D1D5DB] bg-white text-[#1A1C1E]'
                                                : 'border-gray-200 bg-gray-100 text-gray-500'
                                        }`}>
                                            {cat.status}
                                        </span>
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleEditOpen(cat)}
                                                title="Edit Category"
                                                className="h-7 w-7 rounded-none hover:bg-gray-100 text-[#4A4E5A]"
                                            >
                                                <Pencil size={13} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(cat)}
                                                title="Delete Category"
                                                className="h-7 w-7 rounded-none hover:bg-red-50 text-red-600"
                                            >
                                                <Trash2 size={13} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* PAGINATION FOOTER */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] pt-2.5 font-mono text-xs text-[#6B7280]">
                <div>
                    Showing <strong>{categories.from ?? 0}</strong> to <strong>{categories.to ?? 0}</strong> of <strong>{categories.total ?? 0}</strong> categories
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={categories.current_page <= 1}
                        onClick={() => router.get('/print-categories', { ...filters, page: categories.current_page - 1 } as never)}
                        className="h-7 rounded-none border-[#D1D5DB] px-2 text-xs font-mono"
                    >
                        <ChevronLeft size={13} className="mr-1" /> Prev
                    </Button>
                    <span className="px-2 font-bold text-[#1A1C1E]">
                        Page {categories.current_page} of {categories.last_page}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={categories.current_page >= categories.last_page}
                        onClick={() => router.get('/print-categories', { ...filters, page: categories.current_page + 1 } as never)}
                        className="h-7 rounded-none border-[#D1D5DB] px-2 text-xs font-mono"
                    >
                        Next <ChevronRight size={13} className="ml-1" />
                    </Button>
                </div>
            </div>

            {/* CREATE CATEGORY MODAL */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-base font-bold text-[#1A1C1E]">
                            Add Print Category
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleCreateSubmit} className="space-y-3 font-sans text-xs">
                        <div className="space-y-1">
                            <p className="font-mono text-[11px] text-[#4A4E5A]">Category Name *</p>
                            <Input
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder="e.g. Marketing & Promotional"
                                className="h-8 rounded-none border-[#D1D5DB]"
                            />
                            {createForm.errors.name && <InputError message={createForm.errors.name} />}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                                <p className="font-mono text-[11px] text-[#4A4E5A]">Category Code</p>
                                <Input
                                    value={createForm.data.code}
                                    onChange={(e) => createForm.setData('code', e.target.value)}
                                    placeholder="e.g. MKTG"
                                    className="h-8 rounded-none border-[#D1D5DB] font-mono uppercase"
                                />
                                {createForm.errors.code && <InputError message={createForm.errors.code} />}
                            </div>

                            <div className="space-y-1">
                                <p className="font-mono text-[11px] text-[#4A4E5A]">Status *</p>
                                <Select
                                    value={createForm.data.status}
                                    onValueChange={(v) => createForm.setData('status', v)}
                                >
                                    <SelectTrigger className="h-8 rounded-none border-[#D1D5DB] text-xs font-mono">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        <SelectItem value="active" className="text-xs">Active</SelectItem>
                                        <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="font-mono text-[11px] text-[#4A4E5A]">Description</p>
                            <textarea
                                value={createForm.data.description}
                                onChange={(e) => createForm.setData('description', e.target.value)}
                                rows={2}
                                className="w-full rounded-none border border-[#D1D5DB] p-2 text-xs font-normal text-[#1A1C1E] outline-none"
                                placeholder="Category summary & service scope…"
                            />
                        </div>

                        <DialogFooter className="mt-3 border-t border-[#E5E7EB] pt-2">
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                                className="h-8 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black"
                            >
                                {createForm.processing ? 'Creating…' : 'Create Category'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="h-8 rounded-none border-[#D1D5DB] text-xs"
                            >
                                Cancel
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* EDIT CATEGORY MODAL */}
            {editingCategory && (
                <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
                    <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-mono text-base font-bold text-[#1A1C1E]">
                                Edit Print Category: {editingCategory.name}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleEditSubmit} className="space-y-3 font-sans text-xs">
                            <div className="space-y-1">
                                <p className="font-mono text-[11px] text-[#4A4E5A]">Category Name *</p>
                                <Input
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="h-8 rounded-none border-[#D1D5DB]"
                                />
                                {editForm.errors.name && <InputError message={editForm.errors.name} />}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <p className="font-mono text-[11px] text-[#4A4E5A]">Category Code</p>
                                    <Input
                                        value={editForm.data.code}
                                        onChange={(e) => editForm.setData('code', e.target.value)}
                                        className="h-8 rounded-none border-[#D1D5DB] font-mono uppercase"
                                    />
                                    {editForm.errors.code && <InputError message={editForm.errors.code} />}
                                </div>

                                <div className="space-y-1">
                                    <p className="font-mono text-[11px] text-[#4A4E5A]">Status *</p>
                                    <Select
                                        value={editForm.data.status}
                                        onValueChange={(v) => editForm.setData('status', v)}
                                    >
                                        <SelectTrigger className="h-8 rounded-none border-[#D1D5DB] text-xs font-mono">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            <SelectItem value="active" className="text-xs">Active</SelectItem>
                                            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <p className="font-mono text-[11px] text-[#4A4E5A]">Description</p>
                                <textarea
                                    value={editForm.data.description}
                                    onChange={(e) => editForm.setData('description', e.target.value)}
                                    rows={2}
                                    className="w-full rounded-none border border-[#D1D5DB] p-2 text-xs font-normal text-[#1A1C1E] outline-none"
                                />
                            </div>

                            <DialogFooter className="mt-3 border-t border-[#E5E7EB] pt-2">
                                <Button
                                    type="submit"
                                    disabled={editForm.processing}
                                    className="h-8 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black"
                                >
                                    {editForm.processing ? 'Saving…' : 'Save Changes'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditingCategory(null)}
                                    className="h-8 rounded-none border-[#D1D5DB] text-xs"
                                >
                                    Cancel
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

PrintCategoriesIndex.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
        {
            title: 'Print Categories',
            href: '/print-categories',
        },
    ],
};
