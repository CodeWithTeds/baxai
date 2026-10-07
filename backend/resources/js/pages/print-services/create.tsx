import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { dashboard } from '@/routes';

interface Specification {
    name: string;
    type: string;
    options: { label: string; price_modifier: string }[];
    is_required: boolean;
}

export default function PrintServiceCreate() {
    const { props } = usePage();
    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        icon: '',
        status: 'active',
        base_price: '',
        unit: 'piece',
        min_quantity: 1,
        max_file_size_mb: 100,
        allowed_file_types: ['pdf', 'png', 'jpg', 'jpeg'],
        rush_surcharge_type: 'none',
        rush_surcharge_amount: '',
        turnaround_time: '',
        rush_turnaround_time: '',
        sort_order: 0,
    });
    const [specifications, setSpecifications] = useState<Specification[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/print-services', {
            ...form,
            base_price: parseFloat(form.base_price) || 0,
            min_quantity: parseInt(form.min_quantity.toString()) || 1,
            max_file_size_mb: parseInt(form.max_file_size_mb.toString()) || 100,
            rush_surcharge_amount: parseFloat(form.rush_surcharge_amount) || 0,
            sort_order: parseInt(form.sort_order.toString()) || 0,
            specifications,
        } as any, {
            onError: (errs) => setErrors(errs),
        });
    };

    const addSpecification = () => {
        setSpecifications([
            ...specifications,
            { name: '', type: 'select', options: [{ label: '', price_modifier: '0' }], is_required: false },
        ]);
    };

    const removeSpecification = (index: number) => {
        setSpecifications(specifications.filter((_, i) => i !== index));
    };

    const updateSpecification = (index: number, field: keyof Specification, value: any) => {
        const updated = [...specifications];
        (updated[index] as any)[field] = value;
        setSpecifications(updated);
    };

    const updateSpecOption = (specIndex: number, optIndex: number, field: string, value: any) => {
        const updated = [...specifications];
        const options = [...updated[specIndex].options];
        (options[optIndex] as any)[field] = value;
        updated[specIndex].options = options;
        setSpecifications(updated);
    };

    const addSpecOption = (specIndex: number) => {
        const updated = [...specifications];
        updated[specIndex].options.push({ label: '', price_modifier: '0' });
        setSpecifications(updated);
    };

    const removeSpecOption = (specIndex: number, optIndex: number) => {
        const updated = [...specifications];
        updated[specIndex].options = updated[specIndex].options.filter((_, i) => i !== optIndex);
        setSpecifications(updated);
    };

    const toggleFileType = (type: string) => {
        const types = form.allowed_file_types.includes(type)
            ? form.allowed_file_types.filter((t) => t !== type)
            : [...form.allowed_file_types, type];
        setForm({ ...form, allowed_file_types: types });
    };

    const allFileTypes = ['pdf', 'png', 'jpg', 'jpeg', 'ai', 'psd', 'docx', 'svg'];

    return (
        <>
            <Head title="Create Print Service" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex items-center gap-4">
                    <Link href="/print-services">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Create Print Service</h1>
                        <p className="text-sm text-muted-foreground">
                            Add a new printing service to your offerings
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="name">Service Name *</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                placeholder="e.g. Tarpaulin Print"
                            />
                            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug</Label>
                            <Input
                                id="slug"
                                value={form.slug}
                                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                placeholder="e.g. tarpaulin-print"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                                id="description"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Brief description of the service"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="base_price">Base Price (₱) *</Label>
                            <Input
                                id="base_price"
                                type="number"
                                step="0.01"
                                value={form.base_price}
                                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                                placeholder="0.00"
                            />
                            {errors.base_price && <p className="text-sm text-red-500">{errors.base_price}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="unit">Pricing Unit *</Label>
                            <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="piece">Per Piece</SelectItem>
                                    <SelectItem value="sq_ft">Per Sq Ft</SelectItem>
                                    <SelectItem value="page">Per Page</SelectItem>
                                    <SelectItem value="meter">Per Meter</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="min_quantity">Min Quantity</Label>
                            <Input
                                id="min_quantity"
                                type="number"
                                value={form.min_quantity}
                                onChange={(e) => setForm({ ...form, min_quantity: parseInt(e.target.value) || 1 })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="max_file_size_mb">Max File Size (MB)</Label>
                            <Input
                                id="max_file_size_mb"
                                type="number"
                                value={form.max_file_size_mb}
                                onChange={(e) => setForm({ ...form, max_file_size_mb: parseInt(e.target.value) || 100 })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="turnaround_time">Turnaround Time</Label>
                            <Input
                                id="turnaround_time"
                                value={form.turnaround_time}
                                onChange={(e) => setForm({ ...form, turnaround_time: e.target.value })}
                                placeholder="e.g. 2-3 business days"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rush_turnaround_time">Rush Turnaround Time</Label>
                            <Input
                                id="rush_turnaround_time"
                                value={form.rush_turnaround_time}
                                onChange={(e) => setForm({ ...form, rush_turnaround_time: e.target.value })}
                                placeholder="e.g. Same day"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="rush_surcharge_type">Rush Surcharge Type</Label>
                            <Select value={form.rush_surcharge_type} onValueChange={(v) => setForm({ ...form, rush_surcharge_type: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                                    <SelectItem value="fixed">Fixed Amount (₱)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {form.rush_surcharge_type !== 'none' && (
                            <div className="space-y-2">
                                <Label htmlFor="rush_surcharge_amount">
                                    Rush Surcharge Amount {form.rush_surcharge_type === 'percentage' ? '(%)' : '(₱)'}
                                </Label>
                                <Input
                                    id="rush_surcharge_amount"
                                    type="number"
                                    step="0.01"
                                    value={form.rush_surcharge_amount}
                                    onChange={(e) => setForm({ ...form, rush_surcharge_amount: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Allowed File Types</Label>
                            <div className="flex flex-wrap gap-2">
                                {allFileTypes.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => toggleFileType(type)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border ${
                                            form.allowed_file_types.includes(type)
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background text-muted-foreground border-input'
                                        }`}
                                    >
                                        {type.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Specifications</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addSpecification}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Specification
                            </Button>
                        </div>

                        {specifications.map((spec, specIndex) => (
                            <div key={specIndex} className="border rounded-lg p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Specification {specIndex + 1}</span>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSpecification(specIndex)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                            value={spec.name}
                                            onChange={(e) => updateSpecification(specIndex, 'name', e.target.value)}
                                            placeholder="e.g. Size"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Type</Label>
                                        <Select value={spec.type} onValueChange={(v) => updateSpecification(specIndex, 'type', v)}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="select">Select</SelectItem>
                                                <SelectItem value="radio">Radio</SelectItem>
                                                <SelectItem value="checkbox">Checkbox</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={spec.is_required}
                                                onChange={(e) => updateSpecification(specIndex, 'is_required', e.target.checked)}
                                                className="rounded"
                                            />
                                            Required
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Options</Label>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => addSpecOption(specIndex)}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {spec.options.map((opt, optIndex) => (
                                        <div key={optIndex} className="flex gap-2">
                                            <Input
                                                value={opt.label}
                                                onChange={(e) => updateSpecOption(specIndex, optIndex, 'label', e.target.value)}
                                                placeholder="Option label"
                                                className="flex-1"
                                            />
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={opt.price_modifier}
                                                onChange={(e) => updateSpecOption(specIndex, optIndex, 'price_modifier', e.target.value)}
                                                placeholder="Price modifier"
                                                className="w-32"
                                            />
                                            <Button type="button" variant="ghost" size="sm" onClick={() => removeSpecOption(specIndex, optIndex)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-4">
                        <Button type="submit">Create Service</Button>
                        <Link href="/print-services">
                            <Button type="button" variant="outline">Cancel</Button>
                        </Link>
                    </div>
                </form>
            </div>
        </>
    );
}
