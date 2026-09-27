import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
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
    Award,
    ChevronLeft,
    ChevronRight,
    Crown,
    Download,
    Gift,
    Minus,
    Pencil,
    Plus,
    RotateCcw,
    Search,
    Sparkles,
    Ticket,
    Trash2,
    UserCheck,
    Users,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';


interface RewardRow {
    id: number;
    title: string;
    code: string;
    description: string | null;
    points_required: number;
    reward_type: 'voucher' | 'free_sample' | 'tier_upgrade' | 'express_production';
    discount_value: string;
    status: 'active' | 'inactive';
    claims_count: number;
}

interface VipTierRow {
    id: number;
    name: string;
    min_spend: string;
    points_multiplier: string;
    discount_percentage: string;
    perks: string | null;
    color: string;
}

interface CustomerRow {
    id: number;
    name: string;
    customer_code: string;
    email: string;
    company: string | null;
    total_spent: string;
    loyalty_points: number;
    vip_tier: string;
}

interface RedemptionRow {
    id: number;
    reward_code: string;
    points_spent: number;
    status: string;
    issued_at: string;
    customer?: { id: number; name: string; customer_code: string };
    reward?: { id: number; title: string };
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export default function RewardsIndex({
    rewards = [],
    vipTiers = [],
    customers = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as Paginated<CustomerRow>,
    redemptions = { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0, from: 0, to: 0 } as Paginated<RedemptionRow>,
    stats = { total_points_distributed: 0, active_vip_members: 0, total_claims: 0, total_rewards: 0 },
    activeTab = 'catalog',
    filters = {},
}: {
    rewards?: RewardRow[];
    vipTiers?: VipTierRow[];
    customers?: Paginated<CustomerRow>;
    redemptions?: Paginated<RedemptionRow>;
    stats?: { total_points_distributed: number; active_vip_members: number; total_claims: number; total_rewards: number };
    activeTab?: string;
    filters?: Record<string, any>;
}) {
    const pageProps = usePage().props as unknown as {
        flash?: { success?: string; error?: string };
    };

    const [currentTab, setCurrentTab] = useState(activeTab || 'catalog');

    // Customer filter
    const [search, setSearch] = useState<string>(filters?.search || '');
    const [tierFilter, setTierFilter] = useState<string>(filters?.tier || 'all');

    // Modals state
    const [rewardModalOpen, setRewardModalOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<RewardRow | null>(null);

    const [pointsModalOpen, setPointsModalOpen] = useState(false);
    const [selectedCustomerForPoints, setSelectedCustomerForPoints] = useState<CustomerRow | null>(null);
    const [pointsDelta, setPointsDelta] = useState('100');
    const [pointsReason, setPointsReason] = useState('');

    const [issueModalOpen, setIssueModalOpen] = useState(false);
    const [selectedCustomerForIssue, setSelectedCustomerForIssue] = useState<CustomerRow | null>(null);
    const [selectedRewardId, setSelectedRewardId] = useState<string>('');

    const [tierModalOpen, setTierModalOpen] = useState(false);
    const [editingTier, setEditingTier] = useState<VipTierRow | null>(null);

    // Form fields for Reward Perk
    const [rewardTitle, setRewardTitle] = useState('');
    const [rewardCode, setRewardCode] = useState('');
    const [rewardDesc, setRewardDesc] = useState('');
    const [rewardPoints, setRewardPoints] = useState('200');
    const [rewardType, setRewardType] = useState<'voucher' | 'free_sample' | 'tier_upgrade' | 'express_production'>('voucher');
    const [rewardDiscount, setRewardDiscount] = useState('200');
    const [rewardStatus, setRewardStatus] = useState<'active' | 'inactive'>('active');

    // Form fields for Tier
    const [tierMinSpend, setTierMinSpend] = useState('');
    const [tierMultiplier, setTierMultiplier] = useState('');
    const [tierDiscount, setTierDiscount] = useState('');
    const [tierPerks, setTierPerks] = useState('');

    const handleFilterApply = () => {
        router.get(
            '/rewards',
            { tab: 'customers', search, tier: tierFilter },
            { preserveState: true }
        );
    };

    const openCreateRewardModal = () => {
        setEditingReward(null);
        setRewardTitle('');
        setRewardCode('');
        setRewardDesc('');
        setRewardPoints('200');
        setRewardType('voucher');
        setRewardDiscount('200');
        setRewardStatus('active');
        setRewardModalOpen(true);
    };

    const openEditRewardModal = (r: RewardRow) => {
        setEditingReward(r);
        setRewardTitle(r.title);
        setRewardCode(r.code);
        setRewardDesc(r.description || '');
        setRewardPoints(String(r.points_required));
        setRewardType(r.reward_type);
        setRewardDiscount(r.discount_value);
        setRewardStatus(r.status);
        setRewardModalOpen(true);
    };

    const handleSaveReward = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            title: rewardTitle,
            code: rewardCode,
            description: rewardDesc,
            points_required: parseInt(rewardPoints),
            reward_type: rewardType,
            discount_value: rewardDiscount || 0,
            status: rewardStatus,
        };

        if (editingReward) {
            router.put(`/rewards/perks/${editingReward.id}`, payload, {
                onSuccess: () => setRewardModalOpen(false),
            });
        } else {
            router.post('/rewards/perks', payload, {
                onSuccess: () => setRewardModalOpen(false),
            });
        }
    };

    const handleDeleteReward = (r: RewardRow) => {
        if (!confirm(`Archive reward perk '${r.title}'?`)) return;
        router.delete(`/rewards/perks/${r.id}`);
    };

    const openPointsModal = (c: CustomerRow) => {
        setSelectedCustomerForPoints(c);
        setPointsDelta('100');
        setPointsReason('Bonus points adjustment');
        setPointsModalOpen(true);
    };

    const handleSavePoints = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerForPoints) return;
        router.post(
            '/rewards/adjust-points',
            {
                customer_id: selectedCustomerForPoints.id,
                points: parseInt(pointsDelta),
                reason: pointsReason,
            },
            {
                onSuccess: () => setPointsModalOpen(false),
            }
        );
    };

    const openIssueModal = (c: CustomerRow) => {
        setSelectedCustomerForIssue(c);
        if (rewards.length > 0) setSelectedRewardId(String(rewards[0].id));
        setIssueModalOpen(true);
    };

    const handleIssueReward = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerForIssue || !selectedRewardId) return;
        router.post(
            '/rewards/issue',
            {
                customer_id: selectedCustomerForIssue.id,
                reward_id: parseInt(selectedRewardId),
            },
            {
                onSuccess: () => setIssueModalOpen(false),
            }
        );
    };

    const openEditTierModal = (t: VipTierRow) => {
        setEditingTier(t);
        setTierMinSpend(t.min_spend);
        setTierMultiplier(t.points_multiplier);
        setTierDiscount(t.discount_percentage);
        setTierPerks(t.perks || '');
        setTierModalOpen(true);
    };

    const handleSaveTier = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTier) return;
        router.put(
            `/rewards/vip-tiers/${editingTier.id}`,
            {
                min_spend: tierMinSpend,
                points_multiplier: tierMultiplier,
                discount_percentage: tierDiscount,
                perks: tierPerks,
            },
            {
                onSuccess: () => setTierModalOpen(false),
            }
        );
    };

    const exportCsv = () => {
        let headers: string[] = [];
        let csvRows: string[] = [];

        if (currentTab === 'catalog') {
            headers = ['ID', 'Code', 'Title', 'Points Required', 'Reward Type', 'Discount Value', 'Claims Count', 'Status'];
            csvRows = rewards.map((r) => [
                r.id,
                `"${r.code}"`,
                `"${r.title.replace(/"/g, '""')}"`,
                r.points_required,
                r.reward_type,
                r.discount_value,
                r.claims_count,
                r.status,
            ].join(','));
        } else if (currentTab === 'customers') {
            headers = ['ID', 'Customer Code', 'Name', 'Email', 'Total Spent', 'VIP Tier', 'Loyalty Points'];
            csvRows = (customers.data || []).map((c) => [
                c.id,
                `"${c.customer_code}"`,
                `"${c.name.replace(/"/g, '""')}"`,
                `"${c.email}"`,
                c.total_spent,
                `"${c.vip_tier}"`,
                c.loyalty_points,
            ].join(','));
        } else {
            headers = ['ID', 'Claim Code', 'Points Spent', 'Status', 'Issued At'];
            csvRows = (redemptions.data || []).map((r) => [
                r.id,
                `"${r.reward_code}"`,
                r.points_spent,
                r.status,
                `"${r.issued_at}"`,
            ].join(','));
        }

        const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `vip_rewards_${currentTab}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const tierBadge = (tierName: string) => {
        switch (tierName) {
            case 'VIP Diamond':
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-purple-700 bg-purple-50 border border-purple-300 px-1.5 py-0.5 font-bold"><Crown size={10} /> DIAMOND</span>;
            case 'Platinum':
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-300 px-1.5 py-0.5 font-bold"><Sparkles size={10} /> PLATINUM</span>;
            case 'Gold':
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 font-bold"><Award size={10} /> GOLD</span>;
            case 'Silver':
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-700 bg-slate-100 border border-slate-300 px-1.5 py-0.5 font-bold"><Award size={10} /> SILVER</span>;
            default:
                return <span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5"><Award size={10} /> BRONZE</span>;
        }
    };

    return (
        <>
            <Head title="VIP & Rewards" />
            <div className="flex flex-col gap-3 font-sans text-[#1A1C1E]">

                {/* HEADING SECTION */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E5E7EB] pb-2.5">
                    <div className="max-w-[640px]">
                        <h1 className="text-[15px] font-normal tracking-tight text-[#1A1C1E] flex items-center gap-2">
                            VIP & Customer Rewards Program <Sparkles size={16} className="text-[#0052CC]" />
                        </h1>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#6B7280]">
                            Manage printing services customer loyalty tiers, point earnings multipliers, redeemable perks, and customer reward vouchers.
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={exportCsv}
                            size="sm"
                            className="h-7 rounded-none border-[#D1D5DB] px-2.5 text-[11px] font-normal text-[#1A1C1E] bg-white hover:bg-[#F9FAFB]"
                        >
                            <Download size={12} className="mr-1" /> Export CSV
                        </Button>
                        <Button
                            size="sm"
                            onClick={openCreateRewardModal}
                            className="h-7 rounded-none bg-[#1A1C1E] px-2.5 text-[11px] font-normal text-white hover:bg-black"
                        >
                            <Plus size={12} className="mr-1" /> Add Reward Perk
                        </Button>
                    </div>
                </div>

                {/* STATS OVERVIEW CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <p className="text-[10px] text-[#6B7280] uppercase">Loyalty Points Issued</p>
                        <p className="mt-0.5 text-base font-bold text-[#1A1C1E]">{stats.total_points_distributed.toLocaleString()} pts</p>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <p className="text-[10px] text-purple-700 uppercase">Active VIP Tier Members</p>
                        <p className="mt-0.5 text-base font-bold text-purple-700">{stats.active_vip_members}</p>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <p className="text-[10px] text-emerald-700 uppercase">Rewards Claimed</p>
                        <p className="mt-0.5 text-base font-bold text-emerald-700">{stats.total_claims}</p>
                    </div>
                    <div className="border border-[#E5E7EB] bg-white p-2.5">
                        <p className="text-[10px] text-[#0052CC] uppercase">Active Perks Catalog</p>
                        <p className="mt-0.5 text-base font-bold text-[#0052CC]">{stats.total_rewards}</p>
                    </div>
                </div>

                {/* SUB-NAVIGATION TABS */}
                <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-2 font-mono text-xs">
                    <button
                        type="button"
                        onClick={() => setCurrentTab('catalog')}
                        className={`flex items-center gap-1 pb-1 ${currentTab === 'catalog' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        <Gift size={13} /> Rewards Catalog ({rewards.length})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setCurrentTab('tiers')}
                        className={`flex items-center gap-1 pb-1 ${currentTab === 'tiers' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        <Crown size={13} /> VIP Loyalty Tiers ({vipTiers.length})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setCurrentTab('customers')}
                        className={`flex items-center gap-1 pb-1 ${currentTab === 'customers' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        <Users size={13} /> Customer Points Ledger ({customers?.total ?? 0})
                    </button>
                    <span className="text-[#D1D5DB]">|</span>
                    <button
                        type="button"
                        onClick={() => setCurrentTab('redemptions')}
                        className={`flex items-center gap-1 pb-1 ${currentTab === 'redemptions' ? 'border-b-2 border-[#1A1C1E] font-bold text-[#1A1C1E]' : 'text-[#6B7280] hover:text-[#1A1C1E]'}`}
                    >
                        <Ticket size={13} /> Redemptions Log ({redemptions?.total ?? 0})
                    </button>
                </div>

                {/* TAB 1: REWARDS CATALOG */}
                {currentTab === 'catalog' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {rewards.map((r) => (
                            <div key={r.id} className="border border-[#E5E7EB] bg-white p-3 space-y-2 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between font-mono text-[10px]">
                                        <span className="font-bold text-[#0052CC] uppercase">{r.code}</span>
                                        <span className={`px-1.5 py-0.5 ${r.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                            {r.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="mt-1 font-bold text-xs text-[#1A1C1E] leading-snug">{r.title}</h3>
                                    <p className="mt-1 text-[11px] text-[#6B7280] leading-relaxed">{r.description || 'No detailed description.'}</p>
                                </div>

                                <div className="border-t border-[#E5E7EB] pt-2 space-y-1.5">
                                    <div className="flex items-center justify-between font-mono text-xs">
                                        <span className="text-[#6B7280]">Points Needed:</span>
                                        <span className="font-bold text-[#1A1C1E]">{r.points_required} pts</span>
                                    </div>
                                    <div className="flex items-center justify-between font-mono text-[11px]">
                                        <span className="text-[#6B7280]">Claims:</span>
                                        <span className="font-medium text-[#4A4E5A]">{r.claims_count} redeemed</span>
                                    </div>

                                    <div className="flex items-center gap-1 pt-1">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => openEditRewardModal(r)}
                                            className="h-6 flex-1 rounded-none border-[#D1D5DB] text-[10px]"
                                        >
                                            <Pencil size={10} className="mr-1" /> Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDeleteReward(r)}
                                            className="h-6 rounded-none border-red-300 text-[10px] text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 size={10} />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 2: VIP LOYALTY TIERS */}
                {currentTab === 'tiers' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {vipTiers.map((t) => (
                            <div key={t.id} className="border border-[#E5E7EB] bg-white p-3.5 space-y-2">
                                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
                                    <div className="flex items-center gap-2">
                                        {tierBadge(t.name)}
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openEditTierModal(t)}
                                        className="h-6 w-6 p-0 text-[#6B7280] hover:bg-gray-100"
                                    >
                                        <Pencil size={11} />
                                    </Button>
                                </div>

                                <div className="space-y-1 font-mono text-xs pt-1">
                                    <div className="flex justify-between">
                                        <span className="text-[#6B7280]">Qualifying Spend:</span>
                                        <span className="font-bold text-[#1A1C1E]">₱{parseFloat(t.min_spend).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#6B7280]">Points Multiplier:</span>
                                        <span className="font-bold text-[#0052CC]">{t.points_multiplier}x Boost</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[#6B7280]">Baseline Discount:</span>
                                        <span className="font-bold text-emerald-700">{t.discount_percentage}% Off</span>
                                    </div>
                                </div>

                                <div className="border-t border-[#E5E7EB] pt-2">
                                    <p className="text-[10px] font-mono text-[#6B7280] uppercase">Tier Perks & Privileges:</p>
                                    <p className="mt-0.5 text-[11px] text-[#374151] leading-relaxed">{t.perks || 'Standard member benefits.'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB 3: CUSTOMER LOYALTY LEDGER */}
                {currentTab === 'customers' && (
                    <div className="space-y-2">
                        <div className="rounded-none border border-[#E5E7EB] bg-white p-2.5 flex flex-wrap items-center gap-2">
                            <div className="relative min-w-[220px] flex-1">
                                <Search size={12} className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleFilterApply(); }}
                                    placeholder="Search customer name, code, company..."
                                    className="h-7 w-full rounded-none border-[#D1D5DB] pl-7 text-[11px]"
                                />
                            </div>

                            <Select value={tierFilter} onValueChange={setTierFilter}>
                                <SelectTrigger className="h-7 w-40 rounded-none border-[#D1D5DB] text-[11px] font-mono">
                                    <SelectValue placeholder="VIP Tier" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none">
                                    <SelectItem value="all">All VIP Tiers</SelectItem>
                                    <SelectItem value="Bronze">Bronze</SelectItem>
                                    <SelectItem value="Silver">Silver</SelectItem>
                                    <SelectItem value="Gold">Gold</SelectItem>
                                    <SelectItem value="Platinum">Platinum</SelectItem>
                                    <SelectItem value="VIP Diamond">VIP Diamond</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button onClick={handleFilterApply} size="sm" className="h-7 rounded-none bg-[#1A1C1E] px-3 text-[11px] text-white">
                                Filter Ledger
                            </Button>
                        </div>

                        <div className="rounded-none border border-[#E5E7EB] bg-white overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] font-mono uppercase tracking-wider text-[#4A4E5A]">
                                        <th className="px-2 py-2 border-r border-[#E5E7EB]">Customer</th>
                                        <th className="px-2 py-2 border-r border-[#E5E7EB]">VIP Tier</th>
                                        <th className="px-2 py-2 border-r border-[#E5E7EB] text-right">Total Spent</th>
                                        <th className="px-2 py-2 border-r border-[#E5E7EB] text-right">Points Balance</th>
                                        <th className="w-36 px-2 py-2 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                                    {customers.data.length > 0 ? (
                                        customers.data.map((c) => (
                                            <tr key={c.id} className="hover:bg-[#F9FAFB]">
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    <div className="font-bold text-[#1A1C1E]">{c.name}</div>
                                                    <div className="font-mono text-[9.5px] text-[#6B7280]">{c.customer_code} · {c.email}</div>
                                                </td>
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                    {tierBadge(c.vip_tier)}
                                                </td>
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-right font-mono font-medium">
                                                    ₱{parseFloat(c.total_spent || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-right font-mono font-bold text-[#0052CC]">
                                                    {c.loyalty_points.toLocaleString()} pts
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openPointsModal(c)}
                                                            className="h-6 rounded-none border-[#D1D5DB] px-1.5 text-[10px]"
                                                            title="Adjust Points"
                                                        >
                                                            <Plus size={10} className="mr-0.5" /> Points
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => openIssueModal(c)}
                                                            className="h-6 rounded-none bg-[#0052CC] px-1.5 text-[10px] text-white hover:bg-[#003D99]"
                                                            title="Issue Reward Voucher"
                                                        >
                                                            <Gift size={10} className="mr-0.5" /> Issue Perk
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                                                No customer loyalty records match criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 4: REDEMPTIONS HISTORY */}
                {currentTab === 'redemptions' && (
                    <div className="rounded-none border border-[#E5E7EB] bg-white overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[10px] font-mono uppercase tracking-wider text-[#4A4E5A]">
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Voucher Code</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Customer</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB]">Reward Perk</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-right">Points Spent</th>
                                    <th className="px-2 py-2 border-r border-[#E5E7EB] text-center">Issued Date</th>
                                    <th className="px-2 py-2 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7EB] text-[11px]">
                                {redemptions.data.length > 0 ? (
                                    redemptions.data.map((r) => (
                                        <tr key={r.id} className="hover:bg-[#F9FAFB]">
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] font-mono font-bold text-[#0052CC]">
                                                {r.reward_code}
                                            </td>
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                {r.customer?.name || 'Customer'}
                                            </td>
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB]">
                                                {r.reward?.title || 'Reward Perk'}
                                            </td>
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-right font-mono font-bold">
                                                {r.points_spent} pts
                                            </td>
                                            <td className="px-2 py-1.5 border-r border-[#E5E7EB] text-center font-mono text-[10px] text-[#6B7280]">
                                                {new Date(r.issued_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <span className="inline-block px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[10px] uppercase font-semibold">
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                                            No reward redemptions recorded yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* MODAL 1: CREATE / EDIT REWARD PERK */}
                <Dialog open={rewardModalOpen} onOpenChange={setRewardModalOpen}>
                    <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-md">
                        <DialogHeader className="border-b border-[#E5E7EB] pb-2">
                            <DialogTitle className="font-mono text-sm font-bold text-[#1A1C1E]">
                                {editingReward ? `Edit Reward Perk [${editingReward.code}]` : 'Add New Redeemable Reward Perk'}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSaveReward} className="space-y-3 font-sans text-xs pt-1">
                            <div>
                                <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Reward Perk Title *</label>
                                <Input
                                    required
                                    value={rewardTitle}
                                    onChange={(e) => setRewardTitle(e.target.value)}
                                    placeholder="e.g. ₱200 Printing Services Voucher"
                                    className="h-7 text-xs rounded-none border-[#D1D5DB]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Voucher Prefix / Code *</label>
                                    <Input
                                        required
                                        value={rewardCode}
                                        onChange={(e) => setRewardCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. RWD-PRINT200"
                                        className="h-7 uppercase font-mono text-xs rounded-none border-[#D1D5DB]"
                                    />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Perk Category *</label>
                                    <Select value={rewardType} onValueChange={(v: any) => setRewardType(v)}>
                                        <SelectTrigger className="h-7 rounded-none border-[#D1D5DB] text-xs font-mono">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-none">
                                            <SelectItem value="voucher">Discounts Voucher (₱)</SelectItem>
                                            <SelectItem value="free_sample">Free Physical Sample Proof</SelectItem>
                                            <SelectItem value="express_production">Express 24h Queue Rush</SelectItem>
                                            <SelectItem value="tier_upgrade">Instant Tier Upgrade</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Points Required *</label>
                                    <Input
                                        required
                                        type="number"
                                        value={rewardPoints}
                                        onChange={(e) => setRewardPoints(e.target.value)}
                                        placeholder="200"
                                        className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                    />
                                </div>
                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Discount / Credit Value (₱)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={rewardDiscount}
                                        onChange={(e) => setRewardDiscount(e.target.value)}
                                        placeholder="200.00"
                                        className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Perk Details / Terms</label>
                                <textarea
                                    value={rewardDesc}
                                    onChange={(e) => setRewardDesc(e.target.value)}
                                    rows={2}
                                    placeholder="Explain how customers can redeem this perk..."
                                    className="w-full rounded-none border border-[#D1D5DB] p-2 text-xs outline-none focus:border-[#1A1C1E]"
                                />
                            </div>

                            <DialogFooter className="pt-2 border-t border-[#E5E7EB]">
                                <Button type="button" variant="outline" onClick={() => setRewardModalOpen(false)} className="h-7 rounded-none border-[#D1D5DB] text-xs font-normal">
                                    Cancel
                                </Button>
                                <Button type="submit" className="h-7 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black">
                                    {editingReward ? 'Update Perk' : 'Save Perk'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* MODAL 2: ADJUST CUSTOMER POINTS */}
                <Dialog open={pointsModalOpen} onOpenChange={setPointsModalOpen}>
                    <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-sm">
                        <DialogHeader className="border-b border-[#E5E7EB] pb-2">
                            <DialogTitle className="font-mono text-sm font-bold text-[#1A1C1E]">
                                Adjust Loyalty Points — {selectedCustomerForPoints?.name}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSavePoints} className="space-y-3 font-sans text-xs pt-1">
                            <div className="font-mono text-[11px] bg-[#F9FAFB] p-2 border border-[#E5E7EB]">
                                <div>Current Balance: <strong className="text-[#0052CC]">{selectedCustomerForPoints?.loyalty_points} pts</strong></div>
                                <div>Current VIP Tier: <strong>{selectedCustomerForPoints?.vip_tier}</strong></div>
                            </div>

                            <div>
                                <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Points Adjustment (+ to Add, - to Deduct) *</label>
                                <Input
                                    required
                                    type="number"
                                    value={pointsDelta}
                                    onChange={(e) => setPointsDelta(e.target.value)}
                                    placeholder="e.g. 100 or -50"
                                    className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                />
                            </div>

                            <div>
                                <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Reason / Admin Note</label>
                                <Input
                                    value={pointsReason}
                                    onChange={(e) => setPointsReason(e.target.value)}
                                    placeholder="e.g. Promotional bonus points"
                                    className="h-7 text-xs rounded-none border-[#D1D5DB]"
                                />
                            </div>

                            <DialogFooter className="pt-2 border-t border-[#E5E7EB]">
                                <Button type="button" variant="outline" onClick={() => setPointsModalOpen(false)} className="h-7 rounded-none border-[#D1D5DB] text-xs font-normal">
                                    Cancel
                                </Button>
                                <Button type="submit" className="h-7 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black">
                                    Update Points
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* MODAL 3: ISSUE REWARD PERK */}
                <Dialog open={issueModalOpen} onOpenChange={setIssueModalOpen}>
                    <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-sm">
                        <DialogHeader className="border-b border-[#E5E7EB] pb-2">
                            <DialogTitle className="font-mono text-sm font-bold text-[#1A1C1E]">
                                Issue Reward Perk to {selectedCustomerForIssue?.name}
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleIssueReward} className="space-y-3 font-sans text-xs pt-1">
                            <div className="font-mono text-[11px] bg-[#F9FAFB] p-2 border border-[#E5E7EB]">
                                Available Points: <strong className="text-emerald-700">{selectedCustomerForIssue?.loyalty_points} pts</strong>
                            </div>

                            <div>
                                <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Select Reward Perk to Issue *</label>
                                <Select value={selectedRewardId} onValueChange={setSelectedRewardId}>
                                    <SelectTrigger className="h-7 rounded-none border-[#D1D5DB] text-xs font-mono">
                                        <SelectValue placeholder="Choose perk..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none">
                                        {rewards.map((r) => (
                                            <SelectItem key={r.id} value={String(r.id)} className="text-xs font-mono">
                                                {r.title} ({r.points_required} pts)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter className="pt-2 border-t border-[#E5E7EB]">
                                <Button type="button" variant="outline" onClick={() => setIssueModalOpen(false)} className="h-7 rounded-none border-[#D1D5DB] text-xs font-normal">
                                    Cancel
                                </Button>
                                <Button type="submit" className="h-7 rounded-none bg-[#0052CC] text-xs font-normal text-white hover:bg-[#003D99]">
                                    Issue Reward Voucher
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* MODAL 4: EDIT VIP TIER */}
                {editingTier && (
                    <Dialog open={tierModalOpen} onOpenChange={setTierModalOpen}>
                        <DialogContent className="rounded-none border-[#1A1C1E] sm:max-w-md">
                            <DialogHeader className="border-b border-[#E5E7EB] pb-2">
                                <DialogTitle className="font-mono text-sm font-bold text-[#1A1C1E]">
                                    Edit VIP Tier Rule — {editingTier.name}
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleSaveTier} className="space-y-3 font-sans text-xs pt-1">
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Min Spend (₱)</label>
                                        <Input
                                            type="number"
                                            value={tierMinSpend}
                                            onChange={(e) => setTierMinSpend(e.target.value)}
                                            className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Points Multiplier</label>
                                        <Input
                                            type="number"
                                            step="0.05"
                                            value={tierMultiplier}
                                            onChange={(e) => setTierMultiplier(e.target.value)}
                                            className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Discount %</label>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            value={tierDiscount}
                                            onChange={(e) => setTierDiscount(e.target.value)}
                                            className="h-7 font-mono text-xs rounded-none border-[#D1D5DB]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="font-mono text-[10px] text-[#4A4E5A] uppercase">Perks Description</label>
                                    <textarea
                                        value={tierPerks}
                                        onChange={(e) => setTierPerks(e.target.value)}
                                        rows={3}
                                        className="w-full rounded-none border border-[#D1D5DB] p-2 text-xs outline-none focus:border-[#1A1C1E]"
                                    />
                                </div>

                                <DialogFooter className="pt-2 border-t border-[#E5E7EB]">
                                    <Button type="button" variant="outline" onClick={() => setTierModalOpen(false)} className="h-7 rounded-none border-[#D1D5DB] text-xs font-normal">
                                        Cancel
                                    </Button>
                                    <Button type="submit" className="h-7 rounded-none bg-[#1A1C1E] text-xs font-normal text-white hover:bg-black">
                                        Update Tier
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </>
    );
}
