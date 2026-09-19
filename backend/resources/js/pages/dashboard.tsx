import { Head } from '@inertiajs/react';
import {
    Bell,
    Check,
    ChevronLeft,
    ChevronRight,
    Files,
    Inbox,
    LayoutGrid,
    MessageCircle,
    MonitorSmartphone,
    Moon,
    NotebookPen,
    Pencil,
    Plus,
    Search,
    Settings,
    ShoppingBag,
    Sun,
    Trash2,
    Users,
    Printer,
} from 'lucide-react';
import { useState } from 'react';
import { dashboard } from '@/routes';

/* --------------------------------- theme ---------------------------------- */
/* Palette: primary #0052CC · deep #003D9B · navy #1A1C1E · bg #ECEEF4 */

/* ------------------------------- components ------------------------------- */

function Card({
    className = '',
    children,
}: {
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section
            className={`rounded-[20px] border border-[#E9EBF3] bg-white p-5 shadow-[0_14px_34px_-22px_rgba(26,28,30,0.35)] transition-shadow duration-300 hover:shadow-[0_20px_44px_-22px_rgba(0,82,204,0.45)] ${className}`}
        >
            {children}
        </section>
    );
}

function CardHead({
    title,
    action,
}: {
    title: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold tracking-tight text-[#1A1C1E]">
                {title}
            </h2>
            {action}
        </div>
    );
}

function GhostAction({ children }: { children: React.ReactNode }) {
    return (
        <button className="flex items-center gap-1 text-[11px] font-semibold text-[#B9BED1] transition hover:text-[#0052CC]">
            {children}
        </button>
    );
}

function DotsMenu() {
    return (
        <button
            aria-label="More actions"
            className="font-extrabold tracking-widest text-[#B9BED1] transition hover:text-[#0052CC]"
        >
            •••
        </button>
    );
}

function ProgressBar({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-9 text-right text-[11px] font-extrabold text-[#1A1C1E]">
                {value}%
            </span>
            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#EEF0F7]">
                <div
                    className="h-full rounded-full bg-[#0052CC]"
                    style={{ width: `${value}%` }}
                />
            </div>
        </div>
    );
}

function Ring({ value, color }: { value: number; color: string }) {
    const r = 30;
    const c = 2 * Math.PI * r;

    return (
        <div className="relative h-[76px] w-[76px] shrink-0">
            <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
                <circle
                    cx="38"
                    cy="38"
                    r={r}
                    fill="none"
                    stroke="#EEF0F7"
                    strokeWidth="7"
                />
                <circle
                    cx="38"
                    cy="38"
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={c - (c * value) / 100}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[14px] font-extrabold text-[#1A1C1E]">
                {value}%
            </span>
        </div>
    );
}

function Avatar({
    initials,
    bg,
    size = 'h-6 w-6 text-[9px]',
}: {
    initials: string;
    bg: string;
    size?: string;
}) {
    return (
        <span
            className={`flex ${size} shrink-0 items-center justify-center rounded-full font-extrabold text-white ring-2 ring-white ${bg}`}
        >
            {initials}
        </span>
    );
}

/* ---------------------------------- data ---------------------------------- */

const weekDays = ['Mon', 'Tue', 'Wed', 'Thr', 'Fri', 'Sat', 'Sun'];
const weekNums = [14, 15, 16, 17, 18, 19, 20];

const tasks = [
    {
        title: 'Conduct research',
        date: '4 May, 09:20 AM',
        duration: '02 h 45 m',
        progress: 90,
        comments: 4,
        files: 16,
        due: '16',
    },
    {
        title: 'Schedule a meeting',
        date: '14 May, 12:45 AM',
        duration: '06 h 55 m',
        progress: 50,
        comments: 4,
        files: '3 June',
        due: '3 June',
    },
    {
        title: 'Send out reminders',
        date: '21 May, 10:30 AM',
        duration: '01 h 30 m',
        progress: 10,
        comments: 16,
        files: '3 June',
        due: '3 June',
    },
];

/* ---------------------------------- page ---------------------------------- */

export default function Dashboard() {
    const [mode, setMode] = useState<'light' | 'dark'>('light');

    return (
        <>
            <Head title="Dashboard" />
            <div className="bg-[#ECEEF4] pt-1 pb-24 text-[#1A1C1E] md:pb-10">
                <div className="mx-auto w-full max-w-[1380px]">
                        {/* top nav */}
                        <header className="flex flex-wrap items-center gap-3">
                            <nav className="flex items-center gap-5 text-[13px] font-semibold">
                                <span className="border-b-2 border-[#1A1C1E] pb-1 text-[#1A1C1E]">
                                    Dashboard
                                </span>
                                <button className="hidden pb-1 text-[#8A8FA3] transition hover:text-[#1A1C1E] sm:block">
                                    Workflows
                                </button>
                                <button className="hidden pb-1 text-[#8A8FA3] transition hover:text-[#1A1C1E] sm:block">
                                    Integrations
                                </button>
                            </nav>
                            <div className="relative mx-auto hidden w-full max-w-[300px] flex-1 lg:block">
                                <Search
                                    size={14}
                                    className="absolute top-1/2 left-4 -translate-y-1/2 text-[#B9BED1]"
                                />
                                <input
                                    placeholder="Search or type command"
                                    className="w-full rounded-full border border-[#E9EBF3] bg-white py-2.5 pr-4 pl-10 text-xs text-[#1A1C1E] shadow-[0_8px_20px_-16px_rgba(26,28,30,0.4)] outline-none placeholder:text-[#B9BED1] focus:border-[#0052CC]"
                                />
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                                <div className="hidden items-center rounded-full bg-[#E4E6F0] p-1 text-[11px] font-bold sm:flex">
                                    <button
                                        onClick={() => setMode('light')}
                                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
                                            mode === 'light'
                                                ? 'bg-[#0052CC] text-white shadow'
                                                : 'text-[#8A8FA3] hover:text-[#1A1C1E]'
                                        }`}
                                    >
                                        <Sun size={12} /> Light
                                    </button>
                                    <button
                                        onClick={() => setMode('dark')}
                                        className={`flex items-center gap-1 rounded-full px-3 py-1.5 transition ${
                                            mode === 'dark'
                                                ? 'bg-[#1A1C1E] text-white shadow'
                                                : 'text-[#8A8FA3] hover:text-[#1A1C1E]'
                                        }`}
                                    >
                                        <Moon size={12} /> Dark
                                    </button>
                                </div>
                                <button
                                    aria-label="Notifications"
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#1A1C1E] transition hover:bg-white"
                                >
                                    <Bell size={17} />
                                </button>
                                <button
                                    aria-label="Settings"
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#1A1C1E] transition hover:bg-white"
                                >
                                    <Settings size={17} />
                                </button>
                                <button className="hidden items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#1A1C1E] shadow-[0_8px_20px_-14px_rgba(26,28,30,0.5)] transition hover:shadow-[0_10px_24px_-12px_rgba(0,82,204,0.6)] md:flex">
                                    ↓ Export data
                                    <span className="rounded-md bg-[#EEF0F7] px-1.5 py-0.5 text-[10px] font-extrabold text-[#8A8FA3]">
                                        Sale
                                    </span>
                                </button>
                                <button className="rounded-xl bg-[#1A1C1E] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black">
                                    Add new board
                                </button>
                            </div>
                        </header>

                        <main className="mt-6 space-y-5">
                            {/* hero */}
                            <section className="grid gap-5 xl:grid-cols-[1.15fr_0.72fr_1fr_1fr_1fr]">
                                <div className="flex flex-col justify-center">
                                    <h1 className="text-[30px] leading-[1.15] font-extrabold tracking-tight text-[#1A1C1E]">
                                        Hi, James! 👋
                                        <br />
                                        What are your planes for today?
                                    </h1>
                                    <p className="mt-3 max-w-[300px] text-[13px] leading-relaxed text-[#8A8FA3]">
                                        This platform is designed to
                                        revolutionize the way you organize and
                                        access your notes
                                    </p>
                                </div>
                                <button
                                    aria-label="Add new item"
                                    className="flex min-h-[190px] items-center justify-center rounded-[20px] border-2 border-dashed border-[#0052CC]/25 bg-[#0052CC]/[0.05] transition hover:bg-[#0052CC]/10"
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0052CC] text-white shadow-[0_10px_20px_-8px_rgba(0,82,204,0.9)] transition hover:scale-105">
                                        <Plus size={20} />
                                    </span>
                                </button>
                                <Card className="flex flex-col">
                                    <div className="flex h-24 items-center justify-center text-[#1A1C1E]">
                                        <NotebookPen
                                            size={64}
                                            strokeWidth={1.1}
                                        />
                                    </div>
                                    <p className="mt-2 text-center text-[14px] font-extrabold">
                                        Stay organized
                                    </p>
                                    <p className="mt-1 text-center text-[11px] leading-snug text-[#8A8FA3]">
                                        A clear structure for your notes
                                    </p>
                                </Card>
                                <Card className="flex flex-col">
                                    <div className="flex h-24 items-center justify-center text-[#1A1C1E]">
                                        <Files size={64} strokeWidth={1.1} />
                                    </div>
                                    <p className="mt-2 text-center text-[14px] font-extrabold">
                                        Sync your notes
                                    </p>
                                    <p className="mt-1 text-center text-[11px] leading-snug text-[#8A8FA3]">
                                        Ensure that notes are synced
                                    </p>
                                </Card>
                                <Card className="flex flex-col">
                                    <div className="flex h-24 items-center justify-center text-[#1A1C1E]">
                                        <MonitorSmartphone
                                            size={64}
                                            strokeWidth={1.1}
                                        />
                                    </div>
                                    <p className="mt-2 text-center text-[14px] font-extrabold">
                                        Collaborate and share
                                    </p>
                                    <p className="mt-1 text-center text-[11px] leading-snug text-[#8A8FA3]">
                                        Share notes with colleagues
                                    </p>
                                </Card>
                            </section>

                            {/* middle row */}
                            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                                {/* notifications */}
                                <Card>
                                    <CardHead
                                        title="Notifications"
                                        action={
                                            <GhostAction>🗑 Clear</GhostAction>
                                        }
                                    />
                                    <div className="mt-4 rounded-2xl border border-[#E9EBF3] p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-[13px] font-extrabold">
                                                Upcoming event{' '}
                                                <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#3DD598]" />
                                            </p>
                                            <DotsMenu />
                                        </div>
                                        <p className="mt-1 text-[11px] text-[#8A8FA3]">
                                            Landing design meeting • Time: 120
                                            min
                                        </p>
                                        <div className="mt-3 flex items-center justify-between border-t border-dashed border-black/10 pt-3 text-[11px] text-[#8A8FA3]">
                                            <span className="flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    📅 Sat, 10 May
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    🕚 11 AM - 11:45 AM
                                                </span>
                                            </span>
                                            <span className="flex gap-2.5">
                                                <button
                                                    aria-label="Delete"
                                                    className="transition hover:text-[#F0506E]"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                                <button
                                                    aria-label="Edit"
                                                    className="transition hover:text-[#0052CC]"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-2xl bg-[#F6F7FB] p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-[13px] font-extrabold">
                                                Message | Product design
                                            </p>
                                            <DotsMenu />
                                        </div>
                                        <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8A8FA3]">
                                            <MessageCircle size={11} /> Message
                                            from Ken Smith
                                        </p>
                                        <p className="mt-2 rounded-lg bg-[#E8F0FE] px-3 py-2 text-[11px] text-[#8A8FA3]">
                                            Hey team, just wanted to check in
                                            and see how th…
                                        </p>
                                    </div>
                                </Card>

                                {/* assignments */}
                                <Card>
                                    <CardHead
                                        title="Assignments"
                                        action={
                                            <GhostAction>✎ Edit</GhostAction>
                                        }
                                    />
                                    <div className="mt-4 flex items-center gap-3 text-[11px] font-bold">
                                        <span className="text-[#0052CC]">
                                            Motion design
                                        </span>
                                        <span className="text-[#8A8FA3]">
                                            Logo
                                        </span>
                                        <span className="ml-auto">
                                            <DotsMenu />
                                        </span>
                                    </div>
                                    <p className="mt-1.5 text-[15px] leading-snug font-extrabold">
                                        Design a packaging concept for a new
                                        product
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="rounded-full bg-[#3DD598]/20 px-3.5 py-1.5 text-[11px] font-extrabold text-[#0E9F6E]">
                                            Package design
                                        </span>
                                        <span className="flex items-center gap-1.5 text-[11px] text-[#8A8FA3]">
                                            Rachel Lou
                                            <Avatar
                                                initials="RL"
                                                bg="bg-[#F5B544]"
                                            />
                                        </span>
                                    </div>
                                    <div className="mt-2 flex justify-end">
                                        <span className="rounded-full bg-[#FFE4E9] px-3.5 py-1.5 text-[11px] font-extrabold text-[#F0506E]">
                                            High
                                        </span>
                                    </div>
                                    <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#0052CC]/25 bg-[#0052CC]/[0.05] py-3.5 text-[12px] font-bold text-[#1A1C1E] transition hover:bg-[#0052CC]/10">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#0052CC] text-white">
                                            <Plus size={13} />
                                        </span>
                                        Add new assignment
                                    </button>
                                </Card>

                                {/* calendar */}
                                <Card className="lg:col-span-2 xl:col-span-1">
                                    <CardHead
                                        title="May 2021"
                                        action={
                                            <span className="flex gap-1 text-[#B9BED1]">
                                                <button
                                                    aria-label="Previous week"
                                                    className="transition hover:text-[#0052CC]"
                                                >
                                                    <ChevronLeft size={15} />
                                                </button>
                                                <button
                                                    aria-label="Next week"
                                                    className="transition hover:text-[#0052CC]"
                                                >
                                                    <ChevronRight size={15} />
                                                </button>
                                            </span>
                                        }
                                    />
                                    <div className="mt-4 grid grid-cols-7 text-center">
                                        {weekDays.map((d) => (
                                            <p
                                                key={d}
                                                className="text-[10px] font-semibold text-[#B9BED1]"
                                            >
                                                {d}
                                            </p>
                                        ))}
                                        {weekNums.map((n) => (
                                            <p
                                                key={n}
                                                className={`mx-auto mt-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${
                                                    n === 18
                                                        ? 'bg-[#0052CC] text-white shadow-[0_6px_14px_-4px_rgba(0,82,204,0.9)]'
                                                        : 'text-[#1A1C1E]'
                                                }`}
                                            >
                                                {n}
                                            </p>
                                        ))}
                                    </div>
                                    <div className="mt-4 border-t border-dashed border-black/10 pt-4">
                                        <p className="text-[11px] font-extrabold">
                                            04:30–05:00 PM
                                        </p>
                                        <div className="mt-1.5 flex items-center justify-between">
                                            <p className="flex items-center gap-1.5 text-[13px] font-bold">
                                                <Users
                                                    size={14}
                                                    className="text-[#B9BED1]"
                                                />
                                                Team meeting
                                            </p>
                                            <DotsMenu />
                                        </div>
                                        <p className="mt-1 text-[11px] text-[#8A8FA3]">
                                            12:00 – 12:30 ♥ UX/UI design
                                        </p>
                                    </div>
                                    <div className="mt-4 border-t border-dashed border-black/10 pt-4">
                                        <p className="text-[11px] font-extrabold">
                                            11:30–12:30 PM
                                        </p>
                                        <div className="mt-1.5 flex items-center justify-between">
                                            <p className="flex items-center gap-1.5 text-[13px] font-bold">
                                                <Inbox
                                                    size={14}
                                                    className="text-[#B9BED1]"
                                                />
                                                Meeting with new client
                                            </p>
                                            <DotsMenu />
                                        </div>
                                        <p className="mt-1 text-[11px] text-[#8A8FA3]">
                                            12:30 – 01:30 PM ♥ Job interview
                                        </p>
                                    </div>
                                </Card>
                            </section>

                            {/* bottom row */}
                            <section className="grid gap-5 xl:grid-cols-12">
                                {/* today tasks */}
                                <Card className="xl:col-span-5">
                                    <div className="flex items-center justify-between">
                                        <h2 className="flex items-center gap-2 text-[16px] font-extrabold tracking-tight">
                                            Today tasks
                                            <span className="flex -space-x-1.5">
                                                <Avatar
                                                    initials="KS"
                                                    bg="bg-[#3DD598]"
                                                />
                                                <Avatar
                                                    initials="RL"
                                                    bg="bg-[#F5B544]"
                                                />
                                                <Avatar
                                                    initials="+"
                                                    bg="bg-[#0052CC]"
                                                />
                                            </span>
                                        </h2>
                                        <span className="flex items-center gap-3 text-[11px] font-semibold text-[#B9BED1]">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0052CC] text-[9px] font-extrabold text-white">
                                                88
                                            </span>
                                            <GhostAction>✎ Edit</GhostAction>
                                            <GhostAction>⇪ Share</GhostAction>
                                        </span>
                                    </div>
                                    <div className="mt-3">
                                        {tasks.map((t) => (
                                            <div
                                                key={t.title}
                                                className="border-b border-black/[0.05] py-3.5 last:border-0"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[13px] font-extrabold">
                                                            {t.title}
                                                        </p>
                                                        <p className="text-[11px] text-[#B9BED1]">
                                                            {t.date}
                                                        </p>
                                                    </div>
                                                    <div className="hidden shrink-0 text-right sm:block">
                                                        <p className="text-[10px] font-semibold tracking-wide text-[#B9BED1] uppercase">
                                                            Duration
                                                        </p>
                                                        <p className="text-[11px] font-bold text-[#8A8FA3]">
                                                            {t.duration}
                                                        </p>
                                                    </div>
                                                    <div className="w-32 shrink-0">
                                                        <ProgressBar
                                                            value={t.progress}
                                                        />
                                                    </div>
                                                    <div className="hidden shrink-0 items-center gap-3 text-[11px] text-[#B9BED1] md:flex">
                                                        <span className="flex items-center gap-1">
                                                            👁 {t.comments}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            📎 {t.files}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            📅 {t.due}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* premium */}
                                <div className="flex flex-col items-center justify-center rounded-[20px] bg-[#0052CC] p-6 text-center text-white shadow-[0_20px_44px_-20px_rgba(0,82,204,0.8)] xl:col-span-2">
                                    <NotebookPen size={72} strokeWidth={1} />
                                    <p className="mt-4 text-[20px] font-extrabold tracking-tight">
                                        Go premium!
                                    </p>
                                    <p className="mt-2 text-[11px] leading-relaxed text-white/80">
                                        Gain access to a range of benefits
                                        designed to enhance your user experience
                                    </p>
                                    <button className="mt-5 rounded-xl bg-[#1A1C1E] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-black">
                                        Find out more
                                    </button>
                                </div>

                                {/* rings + board meeting */}
                                <div className="grid gap-5 sm:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
                                    <Card>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-3">
                                                <Ring
                                                    value={90}
                                                    color="#22C55E"
                                                />
                                                <div>
                                                    <p className="text-[9px] font-extrabold tracking-widest text-[#22C55E] uppercase">
                                                        Data research
                                                    </p>
                                                    <p className="text-[13px] font-extrabold">
                                                        Marketing
                                                    </p>
                                                    <p className="mt-1.5 text-[10px] leading-snug text-[#B9BED1]">
                                                        You marked 5/5
                                                        <br />
                                                        All assignments are
                                                        done!
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Ring
                                                    value={65}
                                                    color="#F0506E"
                                                />
                                                <div>
                                                    <p className="text-[9px] font-extrabold tracking-widest text-[#F0506E] uppercase">
                                                        UX/UI design
                                                    </p>
                                                    <p className="text-[13px] font-extrabold">
                                                        Typography
                                                    </p>
                                                    <p className="mt-1.5 text-[10px] leading-snug text-[#B9BED1]">
                                                        You marked 3/5
                                                        <br />2 assignments left
                                                    </p>
                                                    <button className="mt-2 flex items-center gap-1 rounded-lg bg-[#0052CC] px-3 py-1.5 text-[10px] font-bold text-white transition hover:bg-[#003D9B]">
                                                        <Check size={11} />
                                                        Check
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                    <Card>
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-[16px] font-extrabold tracking-tight">
                                                Board meeting
                                            </h2>
                                            <GhostAction>✎ Edit</GhostAction>
                                        </div>
                                        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#8A8FA3]">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#0052CC]" />
                                            March 24 at 4:00 PM
                                        </p>
                                        <p className="mt-2 text-[13px] leading-relaxed text-[#8A8FA3]">
                                            Meeting with John Smith,
                                            <br />
                                            4th floor, room 159
                                        </p>
                                        <div className="mt-4 flex gap-2">
                                            <button className="rounded-xl bg-[#EEF0F7] px-4 py-2.5 text-[11px] font-bold text-[#1A1C1E] transition hover:bg-[#E2E5F1]">
                                                Reschedule
                                            </button>
                                            <button className="rounded-xl bg-[#0052CC] px-4 py-2.5 text-[11px] font-bold text-white transition hover:bg-[#003D9B]">
                                                Accept Invite
                                            </button>
                                        </div>
                                    </Card>
                                </div>
                            </section>
                        </main>
                    </div>

                {/* mobile nav */}
                <nav
                    aria-label="Mobile"
                    className="fixed right-4 bottom-4 left-4 z-30 flex items-center justify-around rounded-2xl bg-[#1A1C1E] px-2 py-3 text-white shadow-2xl md:hidden"
                >
                    <LayoutGrid size={20} />
                    <ShoppingBag size={20} className="opacity-60" />
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0052CC]">
                        <Plus size={20} />
                    </span>
                    <Printer size={20} className="opacity-60" />
                    <Settings size={20} className="opacity-60" />
                </nav>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
