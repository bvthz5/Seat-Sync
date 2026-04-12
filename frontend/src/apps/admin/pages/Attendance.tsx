import React, { useState, useMemo } from 'react';
import {
    Button,
    Input,
    Chip,
    Pagination,
    Card,
    CardBody,
} from '@heroui/react';
import {
    Calendar,
    Search,
    Filter,
    ArrowUpDown,
    Download,
    Bell,
    MapPin,
    TrendingUp,
    Users,
    ClipboardCheck,
    AlertTriangle,
    FileText,
    CheckCircle2,
    Clock,
    PlayCircle,
    ChevronRight,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const MOCK_EXAMS = [
    {
        id: 1,
        name: 'CS101: Data Structures',
        session: 'Morning Session (09:00)',
        hall: 'Great Hall - North',
        invigilator: { name: 'Dr. Jane Doe', initials: 'JD', color: 'bg-indigo-500' },
        status: 'In Progress',
        present: 145,
        total: 160,
    },
    {
        id: 2,
        name: 'MATH302: Calculus III',
        session: 'Morning Session (09:00)',
        hall: 'Main Lab 4',
        invigilator: { name: 'Prof. Mark Smith', initials: 'MS', color: 'bg-emerald-500' },
        status: 'Completed',
        present: 45,
        total: 45,
    },
    {
        id: 3,
        name: 'LIT200: World Literature',
        session: 'Afternoon Session (14:00)',
        hall: 'Room 204B',
        invigilator: { name: 'Lisa Wong', initials: 'LW', color: 'bg-violet-500' },
        status: 'Not Started',
        present: 0,
        total: 88,
    },
    {
        id: 4,
        name: 'BIO205: Microbiology',
        session: 'Morning Session (09:00)',
        hall: 'Lecture Theatre C',
        invigilator: { name: 'Ahmed Khan', initials: 'AK', color: 'bg-amber-500' },
        status: 'Pending Report',
        present: 202,
        total: 210,
    },
    {
        id: 5,
        name: 'PHY301: Quantum Mechanics',
        session: 'Morning Session (09:00)',
        hall: 'Science Block B',
        invigilator: { name: 'Dr. Priya Nair', initials: 'PN', color: 'bg-rose-500' },
        status: 'Completed',
        present: 78,
        total: 80,
    },
    {
        id: 6,
        name: 'CHE102: Organic Chemistry',
        session: 'Afternoon Session (14:00)',
        hall: 'Lab Complex A',
        invigilator: { name: 'Tom Bradley', initials: 'TB', color: 'bg-sky-500' },
        status: 'Not Started',
        present: 0,
        total: 55,
    },
    {
        id: 7,
        name: 'ECO401: Macroeconomics',
        session: 'Morning Session (09:00)',
        hall: 'Room 101',
        invigilator: { name: 'Sarah Johnson', initials: 'SJ', color: 'bg-teal-500' },
        status: 'In Progress',
        present: 61,
        total: 72,
    },
];

const WEEKLY_DATA = [
    { day: 'MON', rate: 88 },
    { day: 'TUE', rate: 91 },
    { day: 'WED', rate: 95 },
    { day: 'THU', rate: 93, today: true },
    { day: 'FRI', rate: 70 },
    { day: 'SAT', rate: 45 },
    { day: 'SUN', rate: 0 },
];

const RECENT_ACTIVITY = [
    {
        id: 1,
        title: 'Calculus III Hall Report',
        desc: 'Submitted by Prof. Mark Smith • 12m ago',
        dot: 'bg-emerald-500',
    },
    {
        id: 2,
        title: 'New Session Started',
        desc: 'Great Hall - North is now active • 45m ago',
        dot: 'bg-blue-500',
    },
    {
        id: 3,
        title: 'Attendance Warning',
        desc: 'Low check-in rate for Room 204B • 1h ago',
        dot: 'bg-amber-500',
    },
    {
        id: 4,
        title: 'BIO205 Submission Pending',
        desc: 'Report not yet submitted • 2h ago',
        dot: 'bg-rose-500',
    },
];

// ─── Status Config ─────────────────────────────────────────────────────────────

type StatusKey = 'In Progress' | 'Completed' | 'Not Started' | 'Pending Report';

const STATUS_CONFIG: Record<StatusKey, { label: string; chipClass: string; icon: React.ReactNode; actionLabel: string; actionClass: string }> = {
    'In Progress': {
        label: 'In Progress',
        chipClass: 'bg-blue-50 text-blue-600 border-blue-100',
        icon: <PlayCircle size={12} />,
        actionLabel: 'Manage',
        actionClass: 'text-blue-600 hover:text-blue-800',
    },
    'Completed': {
        label: 'Completed',
        chipClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        icon: <CheckCircle2 size={12} />,
        actionLabel: 'View Report',
        actionClass: 'text-blue-600 hover:text-blue-800',
    },
    'Not Started': {
        label: 'Not Started',
        chipClass: 'bg-gray-50 text-gray-500 border-gray-200',
        icon: <Clock size={12} />,
        actionLabel: 'Manage',
        actionClass: 'text-blue-600 hover:text-blue-800',
    },
    'Pending Report': {
        label: 'Pending Report',
        chipClass: 'bg-amber-50 text-amber-600 border-amber-100',
        icon: <AlertTriangle size={12} />,
        actionLabel: 'Request Report',
        actionClass: 'bg-orange-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-orange-600',
    },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getProgressColor(pct: number) {
    if (pct === 0) return 'bg-gray-200';
    if (pct >= 95) return 'bg-emerald-500';
    if (pct >= 75) return 'bg-blue-500';
    return 'bg-amber-500';
}

function StatCard({
    icon,
    iconBg,
    badge,
    badgeColor,
    label,
    value,
    accent = false,
}: {
    icon: React.ReactNode;
    iconBg: string;
    badge?: string;
    badgeColor?: string;
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col gap-3 transition-shadow hover:shadow-md ${accent ? 'border-l-4 border-l-orange-400 border-gray-100' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                    {icon}
                </div>
                {badge && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${badgeColor}`}>
                        {badge}
                    </span>
                )}
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{value}</p>
            </div>
        </div>
    );
}

// ─── Custom Tooltip for Chart ──────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-100 shadow-xl rounded-xl px-3 py-2 text-sm">
                <p className="font-bold text-gray-700">{label}</p>
                <p className="text-blue-600 font-semibold">{payload[0].value}%</p>
            </div>
        );
    }
    return null;
}

// ─── Main Component ─────────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 4;

const Attendance: React.FC = () => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return MOCK_EXAMS.filter(
            (e) =>
                e.name.toLowerCase().includes(q) ||
                e.hall.toLowerCase().includes(q) ||
                e.invigilator.name.toLowerCase().includes(q)
        );
    }, [search]);

    const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const currentPage = Math.min(page, pages);
    const pageItems = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

    // KPI aggregations
    const totalStudents = MOCK_EXAMS.reduce((a, e) => a + e.total, 0);
    const totalPresent = MOCK_EXAMS.reduce((a, e) => a + e.present, 0);
    const overallRate = totalStudents > 0 ? ((totalPresent / totalStudents) * 100).toFixed(1) : '0.0';
    const pendingReports = MOCK_EXAMS.filter((e) => e.status === 'Pending Report').length;

    return (
        <div className="min-h-screen bg-[#F8F9FA] p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1.5">
                            <span className="hover:text-gray-600 cursor-pointer transition-colors">Dashboard</span>
                            <ChevronRight size={14} />
                            <span className="text-gray-700 font-medium">Attendance Overview</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Attendance Overview</h1>
                        <p className="text-gray-500 text-sm mt-1">Real-time monitoring of exam hall check-ins and invigilator status.</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 mt-1">
                        {/* Date Badge */}
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm text-sm font-semibold text-gray-700">
                            <Calendar size={16} className="text-gray-400" />
                            Oct 24, 2023 – Oct 30, 2023
                        </div>
                        {/* Send Reminders */}
                        <Button
                            className="bg-blue-600 text-white font-semibold shadow-md shadow-blue-200 rounded-xl h-10 px-5"
                            startContent={<Bell size={16} />}
                        >
                            Send Reminders
                        </Button>
                        {/* Export */}
                        <Button
                            variant="bordered"
                            className="bg-white border-gray-200 text-gray-600 font-semibold rounded-xl h-10 px-4"
                            startContent={<Download size={16} />}
                        >
                            Export All Data
                        </Button>
                    </div>
                </div>

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                        icon={<Calendar size={20} className="text-blue-600" />}
                        iconBg="bg-blue-50"
                        badge="+2%"
                        badgeColor="text-emerald-600 bg-emerald-50"
                        label="Total Scheduled Exams"
                        value={String(MOCK_EXAMS.length)}
                    />
                    <StatCard
                        icon={<Users size={20} className="text-violet-600" />}
                        iconBg="bg-violet-50"
                        badge="+150"
                        badgeColor="text-emerald-600 bg-emerald-50"
                        label="Total Students Today"
                        value={totalStudents.toLocaleString()}
                    />
                    <StatCard
                        icon={<TrendingUp size={20} className="text-emerald-600" />}
                        iconBg="bg-emerald-50"
                        badge="+1.2%"
                        badgeColor="text-emerald-600 bg-emerald-50"
                        label="Overall Attendance Rate"
                        value={`${overallRate}%`}
                    />
                    <StatCard
                        icon={<AlertTriangle size={20} className="text-orange-500" />}
                        iconBg="bg-orange-50"
                        badge="Urgent"
                        badgeColor="text-orange-600 bg-orange-50"
                        label="Pending Reports"
                        value={String(pendingReports)}
                        accent
                    />
                </div>

                {/* ── Search & Filter Bar ── */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-1 w-full">
                        <Input id="field-v9fpend" name="field-v9fpend" aria-label="Search by Hall or Invigilator..." placeholder="Search by Hall or Invigilator..."
                            startContent={<Search size={16} className="text-gray-400" />}
                            value={search}
                            onValueChange={(v) => { setSearch(v); setPage(1); }}
                            classNames={{
                                inputWrapper: 'bg-gray-50 shadow-none border border-gray-100 group-data-[focus=true]:border-blue-400 rounded-xl h-10',
                                input: 'text-sm text-gray-700',
                            }}
                            aria-label="Search attendance"
                        />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="bordered"
                            className="bg-white border-gray-200 text-gray-600 font-semibold rounded-xl h-10 text-sm"
                            startContent={<Filter size={15} />}
                        >
                            Filter
                        </Button>
                        <Button
                            variant="bordered"
                            className="bg-white border-gray-200 text-gray-600 font-semibold rounded-xl h-10 text-sm"
                            startContent={<ArrowUpDown size={15} />}
                        >
                            Sort
                        </Button>
                    </div>
                </div>

                {/* ── Exam Attendance Table ── */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    {/* Column Headers */}
                    <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.2fr_1.5fr_1fr] px-6 py-3 border-b border-gray-50 bg-gray-50/60">
                        {['EXAM NAME', 'HALL / LOCATION', 'INVIGILATOR', 'STATUS', 'PROGRESS', 'ACTION'].map((col) => (
                            <span key={col} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{col}</span>
                        ))}
                    </div>

                    {/* Rows */}
                    {pageItems.length === 0 ? (
                        <div className="py-16 text-center text-gray-400 text-sm font-medium">
                            <ClipboardCheck size={32} className="mx-auto mb-3 text-gray-200" />
                            No exams match your search.
                        </div>
                    ) : (
                        pageItems.map((exam, idx) => {
                            const pct = exam.total > 0 ? Math.round((exam.present / exam.total) * 100) : 0;
                            const cfg = STATUS_CONFIG[exam.status as StatusKey];
                            const isLast = idx === pageItems.length - 1;

                            return (
                                <div
                                    key={exam.id}
                                    className={`grid grid-cols-[2fr_1.5fr_1.5fr_1.2fr_1.5fr_1fr] px-6 py-4 items-center hover:bg-gray-50/60 transition-colors ${!isLast ? 'border-b border-gray-50' : ''}`}
                                >
                                    {/* Exam Name */}
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 leading-tight">{exam.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{exam.session}</p>
                                    </div>

                                    {/* Hall */}
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        <MapPin size={13} className="text-gray-400 shrink-0" />
                                        <span className="font-medium">{exam.hall}</span>
                                    </div>

                                    {/* Invigilator */}
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full ${exam.invigilator.color} flex items-center justify-center text-white text-[11px] font-bold shrink-0`}>
                                            {exam.invigilator.initials}
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">{exam.invigilator.name}</span>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.chipClass}`}>
                                            {cfg.icon}
                                            {cfg.label}
                                        </span>
                                    </div>

                                    {/* Progress */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${getProgressColor(pct)}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="text-xs font-bold text-gray-600 shrink-0 w-16 text-right">
                                            {exam.present}/{exam.total} <span className="text-gray-400">{pct}%</span>
                                        </span>
                                    </div>

                                    {/* Action */}
                                    <div className="flex justify-end">
                                        {exam.status === 'Pending Report' ? (
                                            <button className={cfg.actionClass}>
                                                Request Report
                                            </button>
                                        ) : (
                                            <button className={`text-sm font-bold ${cfg.actionClass}`}>
                                                {cfg.actionLabel}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Footer / Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 bg-white">
                        <span className="text-xs font-semibold text-gray-400">
                            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * ROWS_PER_PAGE + 1} to {Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} exams
                        </span>
                        <Pagination
                            total={pages}
                            page={currentPage}
                            onChange={setPage}
                            classNames={{
                                wrapper: 'gap-1',
                                item: 'bg-transparent text-gray-500 font-bold text-xs w-8 h-8 min-w-[32px] rounded-lg',
                                cursor: 'bg-blue-700 text-white font-bold text-xs w-8 h-8 rounded-lg',
                            }}
                        />
                    </div>
                </div>

                {/* ── Bottom Row: Chart + Activity ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Attendance Trends Chart */}
                    <Card className="lg:col-span-3 border border-gray-100 shadow-sm rounded-2xl bg-white">
                        <CardBody className="p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <TrendingUp size={18} className="text-gray-700" />
                                <h2 className="text-base font-bold text-gray-900">Attendance Trends</h2>
                            </div>
                            <ResponsiveContainer width="100%" height={220} minWidth={1} minHeight={1}>
                                <BarChart data={WEEKLY_DATA} barSize={32} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        domain={[0, 100]}
                                        tickFormatter={(v) => `${v}%`}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                                    <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                                        {WEEKLY_DATA.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.today ? '#4f46e5' : entry.rate === 0 ? '#e2e8f0' : '#c7d2fe'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            {/* Today label under chart */}
                            <div className="flex items-center gap-2 mt-2">
                                <span className="w-3 h-3 rounded bg-indigo-600 inline-block" />
                                <span className="text-xs text-gray-500 font-medium">Today (Thursday)</span>
                                <span className="w-3 h-3 rounded bg-indigo-200 inline-block ml-3" />
                                <span className="text-xs text-gray-500 font-medium">Previous days</span>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="lg:col-span-2 border border-gray-100 shadow-sm rounded-2xl bg-white">
                        <CardBody className="p-6">
                            <div className="flex items-center gap-2 mb-5">
                                <Bell size={18} className="text-gray-700" />
                                <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
                            </div>

                            <div className="space-y-4">
                                {RECENT_ACTIVITY.map((item) => (
                                    <div key={item.id} className="flex gap-3 items-start">
                                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${item.dot}`} />
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 leading-snug">{item.title}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button className="mt-6 w-full py-2.5 text-sm font-bold text-blue-600 border border-blue-100 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
                                View All Activity
                            </button>
                        </CardBody>
                    </Card>
                </div>

            </div>
        </div>
    );
};

export default Attendance;
