import React, { useState, useMemo, useEffect } from 'react';
import {
    Button,
    Input,
    Chip,
    Select,
    SelectItem,
    Tabs,
    Tab,
    Pagination,
    Spinner,
} from '@heroui/react';
import {
    BarChart3,
    Download,
    FileSpreadsheet,
    Search,
    ChevronRight,
    MapPin,
    Users,
    ClipboardCheck,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    Clock,
    PlayCircle,
    AlertTriangle,
    Eye,
    Calendar,
    Award,
    Building2,
    FileText,
    Layers,
    RefreshCw,
    Printer,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend,
} from 'recharts';
import { SeriesService } from '../services/seriesService';

// ─── Types ─────────────────────────────────────────────────────────────────────

type ExamStatus = 'Completed' | 'In Progress' | 'Scheduled' | 'Cancelled';

interface SeriesOption {
    SeriesID: number;
    SeriesName: string;
    StartDate?: string;
    EndDate?: string;
}

interface ReportRow {
    id: number;
    examCode: string;
    subject: string;
    department: string;
    date: string;
    session: string;
    hall: string;
    invigilator: string;
    invigilatorInitials: string;
    registered: number;
    present: number;
    absent: number;
    attendanceRate: number;
    seatsAllocated: number;
    status: ExamStatus;
}

// ─── Mock Report Data per series-like sets ─────────────────────────────────────

const BASE_REPORTS: ReportRow[] = [
    { id: 1, examCode: 'CS101', subject: 'Data Structures', department: 'Computer Science', date: '2023-10-24', session: 'Morning', hall: 'Great Hall – North', invigilator: 'Dr. Jane Doe', invigilatorInitials: 'JD', registered: 160, present: 145, absent: 15, attendanceRate: 90.6, seatsAllocated: 165, status: 'Completed' },
    { id: 2, examCode: 'MATH302', subject: 'Calculus III', department: 'Mathematics', date: '2023-10-24', session: 'Morning', hall: 'Main Lab 4', invigilator: 'Prof. Mark Smith', invigilatorInitials: 'MS', registered: 45, present: 45, absent: 0, attendanceRate: 100, seatsAllocated: 50, status: 'Completed' },
    { id: 3, examCode: 'LIT200', subject: 'World Literature', department: 'Humanities', date: '2023-10-24', session: 'Afternoon', hall: 'Room 204B', invigilator: 'Lisa Wong', invigilatorInitials: 'LW', registered: 88, present: 71, absent: 17, attendanceRate: 80.7, seatsAllocated: 90, status: 'Completed' },
    { id: 4, examCode: 'BIO205', subject: 'Microbiology', department: 'Life Sciences', date: '2023-10-25', session: 'Morning', hall: 'Lecture Theatre C', invigilator: 'Ahmed Khan', invigilatorInitials: 'AK', registered: 210, present: 202, absent: 8, attendanceRate: 96.2, seatsAllocated: 215, status: 'In Progress' },
    { id: 5, examCode: 'PHY301', subject: 'Quantum Mechanics', department: 'Physics', date: '2023-10-25', session: 'Morning', hall: 'Science Block B', invigilator: 'Dr. Priya Nair', invigilatorInitials: 'PN', registered: 80, present: 78, absent: 2, attendanceRate: 97.5, seatsAllocated: 85, status: 'Completed' },
    { id: 6, examCode: 'CHE102', subject: 'Organic Chemistry', department: 'Chemistry', date: '2023-10-25', session: 'Afternoon', hall: 'Lab Complex A', invigilator: 'Tom Bradley', invigilatorInitials: 'TB', registered: 55, present: 0, absent: 0, attendanceRate: 0, seatsAllocated: 60, status: 'Scheduled' },
    { id: 7, examCode: 'ECO401', subject: 'Macroeconomics', department: 'Economics', date: '2023-10-26', session: 'Morning', hall: 'Room 101', invigilator: 'Sarah Johnson', invigilatorInitials: 'SJ', registered: 72, present: 61, absent: 11, attendanceRate: 84.7, seatsAllocated: 75, status: 'Completed' },
    { id: 8, examCode: 'ENG303', subject: 'Advanced English', department: 'Humanities', date: '2023-10-26', session: 'Afternoon', hall: 'Hall B', invigilator: 'Dr. Raj Kumar', invigilatorInitials: 'RK', registered: 110, present: 98, absent: 12, attendanceRate: 89.1, seatsAllocated: 115, status: 'Completed' },
    { id: 9, examCode: 'ME201', subject: 'Thermodynamics', department: 'Mechanical Eng.', date: '2023-10-27', session: 'Morning', hall: 'Engg. Block 1', invigilator: 'Prof. Anita Patel', invigilatorInitials: 'AP', registered: 130, present: 119, absent: 11, attendanceRate: 91.5, seatsAllocated: 135, status: 'Completed' },
    { id: 10, examCode: 'CS305', subject: 'Operating Systems', department: 'Computer Science', date: '2023-10-28', session: 'Morning', hall: 'Great Hall – South', invigilator: 'Dr. James Lee', invigilatorInitials: 'JL', registered: 145, present: 138, absent: 7, attendanceRate: 95.2, seatsAllocated: 150, status: 'Completed' },
    { id: 11, examCode: 'PSY101', subject: 'Intro to Psychology', department: 'Psychology', date: '2023-10-28', session: 'Afternoon', hall: 'Room 302', invigilator: 'Dr. Mei Lin', invigilatorInitials: 'ML', registered: 65, present: 58, absent: 7, attendanceRate: 89.2, seatsAllocated: 70, status: 'Completed' },
    { id: 12, examCode: 'STAT202', subject: 'Applied Statistics', department: 'Mathematics', date: '2023-10-29', session: 'Morning', hall: 'Main Lab 2', invigilator: 'Prof. David Chen', invigilatorInitials: 'DC', registered: 95, present: 87, absent: 8, attendanceRate: 91.6, seatsAllocated: 100, status: 'Cancelled' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ExamStatus, { chipClass: string; icon: React.ReactNode }> = {
    Completed: { chipClass: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle2 size={11} /> },
    'In Progress': { chipClass: 'bg-blue-50 text-blue-700 border-blue-100', icon: <PlayCircle size={11} /> },
    Scheduled: { chipClass: 'bg-violet-50 text-violet-700 border-violet-100', icon: <Clock size={11} /> },
    Cancelled: { chipClass: 'bg-rose-50 text-rose-600 border-rose-100', icon: <AlertTriangle size={11} /> },
};

const AVATAR_COLORS: Record<string, string> = {
    JD: '#4f46e5', MS: '#059669', LW: '#7c3aed', AK: '#d97706',
    PN: '#dc2626', TB: '#0284c7', SJ: '#0891b2', RK: '#65a30d',
    AP: '#9333ea', JL: '#e11d48', ML: '#f97316', DC: '#6366f1',
};

function rateColor(r: number) {
    if (r >= 90) return 'text-emerald-600';
    if (r >= 75) return 'text-amber-500';
    if (r > 0) return 'text-rose-500';
    return 'text-slate-300';
}

function exportToCSV(data: ReportRow[], filename = 'report.csv') {
    const headers = ['Code', 'Subject', 'Department', 'Date', 'Session', 'Hall', 'Invigilator', 'Registered', 'Present', 'Absent', 'Rate %', 'Seats Allocated', 'Status'];
    const rows = data.map(r => [r.examCode, r.subject, r.department, r.date, r.session, r.hall, r.invigilator, r.registered, r.present, r.absent, r.attendanceRate.toFixed(1), r.seatsAllocated, r.status]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
}

function ChartTooltip({ active, payload, label }: any) {
    if (active && payload?.length) return (
        <div className="bg-white border border-slate-100 shadow-xl rounded-xl px-3 py-2 text-xs space-y-0.5">
            <p className="font-bold text-slate-700">{label}</p>
            {payload.map((p: any) => <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}{typeof p.value === 'number' && p.value <= 100 ? '%' : ''}</p>)}
        </div>
    );
    return null;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiTile({ label, value, sub, icon, iconBg, trend }: { label: string; value: string; sub: string; icon: React.ReactNode; iconBg: string; trend?: 'up' | 'down' | 'neutral' }) {
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-105 transition-transform`}>{icon}</div>
                {trend === 'up' && <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600"><TrendingUp size={12} />{sub}</span>}
                {trend === 'down' && <span className="flex items-center gap-1 text-[11px] font-bold text-rose-500"><TrendingDown size={12} />{sub}</span>}
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight">{value}</p>
                {trend === 'neutral' && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 8;

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState('records');
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sessionFilter, setSessionFilter] = useState('');
    const [page, setPage] = useState(1);
    const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [loadingSeries, setLoadingSeries] = useState(true);

    // Fetch real series list on mount
    useEffect(() => {
        const load = async () => {
            setLoadingSeries(true);
            try {
                const res = await SeriesService.getAll();
                const data: SeriesOption[] = res?.data ?? res ?? [];
                setSeriesList(data);
                if (data.length > 0) setSelectedSeriesId(String(data[0].SeriesID));
            } catch {
                // fall back to placeholder
                setSeriesList([{ SeriesID: 0, SeriesName: 'Demo Series – Odd Sem 2023' }]);
                setSelectedSeriesId('0');
            } finally {
                setLoadingSeries(false);
            }
        };
        load();
    }, []);

    const selectedSeries = seriesList.find(s => String(s.SeriesID) === selectedSeriesId);

    // For now, all series show the same mock data (in production, refetch by seriesId)
    const seriesReports = BASE_REPORTS;

    const departments = useMemo(() => [...new Set(seriesReports.map(r => r.department))].sort(), [seriesReports]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return seriesReports.filter(r => {
            const ms = !search || r.subject.toLowerCase().includes(q) || r.examCode.toLowerCase().includes(q) || r.hall.toLowerCase().includes(q) || r.invigilator.toLowerCase().includes(q);
            const md = !deptFilter || r.department === deptFilter;
            const mst = !statusFilter || r.status === statusFilter;
            const mss = !sessionFilter || r.session === sessionFilter;
            return ms && md && mst && mss;
        });
    }, [search, deptFilter, statusFilter, sessionFilter, seriesReports]);

    const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
    const cp = Math.min(page, pages);
    const pageItems = filtered.slice((cp - 1) * ROWS_PER_PAGE, cp * ROWS_PER_PAGE);
    const clearFilters = () => { setSearch(''); setDeptFilter(''); setStatusFilter(''); setSessionFilter(''); setPage(1); };

    // Aggregates
    const totalReg = seriesReports.reduce((a, r) => a + r.registered, 0);
    const totalPres = seriesReports.reduce((a, r) => a + r.present, 0);
    const totalSeats = seriesReports.reduce((a, r) => a + r.seatsAllocated, 0);
    const overallRate = totalReg > 0 ? ((totalPres / totalReg) * 100).toFixed(1) : '0.0';
    const completedCount = seriesReports.filter(r => r.status === 'Completed').length;

    const deptChartData = useMemo(() => {
        const map: Record<string, { total: number; present: number }> = {};
        seriesReports.forEach(r => {
            if (!map[r.department]) map[r.department] = { total: 0, present: 0 };
            map[r.department]!.total += r.registered;
            map[r.department]!.present += r.present;
        });
        return Object.entries(map).map(([dept, v]) => ({
            dept: dept.replace(/ /g, '\n').substring(0, 6),
            rate: v.total > 0 ? parseFloat(((v.present / v.total) * 100).toFixed(1)) : 0,
        }));
    }, [seriesReports]);

    const statusDist = useMemo(() => {
        const counts = { Completed: 0, 'In Progress': 0, Scheduled: 0, Cancelled: 0 };
        seriesReports.forEach(r => { counts[r.status]++; });
        return [
            { name: 'Completed', value: counts['Completed'], fill: '#10b981' },
            { name: 'In Progress', value: counts['In Progress'], fill: '#3b82f6' },
            { name: 'Scheduled', value: counts['Scheduled'], fill: '#8b5cf6' },
            { name: 'Cancelled', value: counts['Cancelled'], fill: '#ef4444' },
        ].filter(d => d.value > 0);
    }, [seriesReports]);

    const sessionData = [
        { session: 'Morning', count: seriesReports.filter(r => r.session === 'Morning').length, rate: 93.4 },
        { session: 'Afternoon', count: seriesReports.filter(r => r.session === 'Afternoon').length, rate: 85.1 },
    ];

    const csvName = `${selectedSeries?.SeriesName.replace(/\s+/g, '-') ?? 'series'}-report.csv`;

    return (
        <div className="min-h-screen bg-[#F4F6F9]">

            {/* ── Top Header Bar ── */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-[1400px] mx-auto px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                            <span className="hover:text-slate-600 cursor-pointer">Dashboard</span>
                            <ChevronRight size={12} />
                            <span className="text-slate-600 font-semibold">Reports & Analytics</span>
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                            <BarChart3 size={20} className="text-indigo-600" />
                            Reports & Analytics
                        </h1>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Series Selector */}
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                            <Layers size={15} className="text-indigo-500 shrink-0" />
                            {loadingSeries ? (
                                <Spinner size="sm" />
                            ) : (
                                <Select
                                    aria-label="Exam Series"
                                    size="sm"
                                    className="w-56"
                                    variant="flat"
                                    selectedKeys={selectedSeriesId ? new Set([selectedSeriesId]) : new Set()}
                                    onSelectionChange={k => { setSelectedSeriesId(Array.from(k as Set<string>)[0] || ''); setPage(1); }}
                                    classNames={{
                                        trigger: '!bg-transparent shadow-none border-none h-8 min-h-8 font-bold text-slate-700',
                                        value: 'text-sm font-bold text-slate-800',
                                        popoverContent: 'bg-white border border-slate-100 shadow-xl rounded-xl',
                                    }}
                                    disallowEmptySelection
                                >
                                    {seriesList.map(s => (
                                        <SelectItem key={String(s.SeriesID)} textValue={s.SeriesName}>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={13} className="text-indigo-500" />
                                                <span className="font-semibold text-sm">{s.SeriesName}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </Select>
                            )}
                        </div>

                        <div className="h-8 w-px bg-slate-200" />

                        <Button isIconOnly size="sm" variant="bordered"
                            className="bg-white border-slate-200 text-slate-500 rounded-xl h-9 w-9"
                            onPress={() => window.print()}>
                            <Printer size={15} />
                        </Button>
                        <Button size="sm" variant="bordered"
                            className="bg-white border-slate-200 text-slate-600 font-semibold rounded-xl h-9 px-4 text-xs"
                            startContent={<FileSpreadsheet size={14} />}
                            onPress={() => exportToCSV(filtered, csvName)}>
                            Export CSV
                        </Button>
                        <Button size="sm"
                            className="bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200 rounded-xl h-9 px-5 text-xs"
                            startContent={<Download size={14} />}
                            onPress={() => exportToCSV(seriesReports, csvName)}>
                            Download Report
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-8 py-6 space-y-6">

                {/* ── Series Context Banner ── */}
                {selectedSeries && (
                    <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 rounded-2xl px-7 py-5 flex items-center justify-between shadow-lg">
                        <div>
                            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Currently Viewing</p>
                            <h2 className="text-white text-xl font-black tracking-tight">{selectedSeries.SeriesName}</h2>
                            <p className="text-indigo-200 text-sm mt-0.5">{seriesReports.length} exams · {totalReg.toLocaleString()} students registered</p>
                        </div>
                        <div className="hidden md:flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-black text-white">{overallRate}%</p>
                                <p className="text-indigo-200 text-xs font-semibold mt-0.5">Avg. Attendance</p>
                            </div>
                            <div className="w-px h-12 bg-indigo-400/40" />
                            <div className="text-center">
                                <p className="text-2xl font-black text-white">{completedCount}/{seriesReports.length}</p>
                                <p className="text-indigo-200 text-xs font-semibold mt-0.5">Exams Done</p>
                            </div>
                            <div className="w-px h-12 bg-indigo-400/40" />
                            <div className="text-center">
                                <p className="text-2xl font-black text-white">{((totalPres / totalSeats) * 100).toFixed(0)}%</p>
                                <p className="text-indigo-200 text-xs font-semibold mt-0.5">Seat Utilization</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── KPI Row ── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <KpiTile icon={<FileText size={19} className="text-indigo-600" />} iconBg="bg-indigo-50" label="Total Exams" value={String(seriesReports.length)} sub="This series" trend="neutral" />
                    <KpiTile icon={<Users size={19} className="text-violet-600" />} iconBg="bg-violet-50" label="Registered Students" value={totalReg.toLocaleString()} sub="+8.2% vs last" trend="up" />
                    <KpiTile icon={<ClipboardCheck size={19} className="text-emerald-600" />} iconBg="bg-emerald-50" label="Avg. Attendance" value={`${overallRate}%`} sub="+3.1% vs last" trend="up" />
                    <KpiTile icon={<CheckCircle2 size={19} className="text-sky-600" />} iconBg="bg-sky-50" label="Exams Completed" value={`${completedCount}/${seriesReports.length}`} sub="1 cancelled" trend="neutral" />
                    <KpiTile icon={<MapPin size={19} className="text-amber-600" />} iconBg="bg-amber-50" label="Seats Allocated" value={totalSeats.toLocaleString()} sub="-2.4% gap" trend="down" />
                </div>

                {/* ── Main Body (Tabs) ── */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-6 bg-white">
                        <Tabs
                            selectedKey={activeTab}
                            onSelectionChange={k => setActiveTab(k as string)}
                            variant="underlined"
                            classNames={{
                                tabList: 'gap-8 w-full rounded-none p-0 bg-transparent',
                                cursor: 'w-full bg-indigo-600 h-0.5',
                                tab: 'max-w-fit px-0 h-14',
                                tabContent: 'group-data-[selected=true]:text-indigo-600 text-slate-400 font-semibold text-sm',
                            }}
                        >
                            <Tab key="records" title={<div className="flex items-center gap-1.5"><FileText size={15} />Exam Records</div>} />
                            <Tab key="overview" title={<div className="flex items-center gap-1.5"><BarChart3 size={15} />Analytics</div>} />
                            <Tab key="seating" title={<div className="flex items-center gap-1.5"><Building2 size={15} />Seating</div>} />
                            <Tab key="invig" title={<div className="flex items-center gap-1.5"><Users size={15} />Invigilators</div>} />
                        </Tabs>
                    </div>

                    <div className="p-6">

                        {/* ── TAB: EXAM RECORDS ── */}
                        {activeTab === 'records' && (
                            <div className="space-y-4">
                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Input
                                        className="sm:max-w-xs"
                                        placeholder="Search exam, hall, invigilator…"
                                        startContent={<Search size={14} className="text-slate-400" />}
                                        value={search}
                                        onValueChange={v => { setSearch(v); setPage(1); }}
                                        classNames={{ inputWrapper: 'bg-slate-50 shadow-none border border-slate-100 group-data-[focus=true]:border-indigo-400 rounded-xl h-10', input: 'text-sm' }}
                                        aria-label="Search records"
                                    />
                                    <div className="flex gap-2 flex-wrap">
                                        <Select aria-label="Department" placeholder="All Departments" size="sm" className="w-44" variant="bordered"
                                            selectedKeys={deptFilter ? new Set([deptFilter]) : new Set()}
                                            onSelectionChange={k => { setDeptFilter(Array.from(k as Set<string>)[0] || ''); setPage(1); }}
                                            classNames={{ trigger: 'bg-white border-slate-200 rounded-xl h-10', popoverContent: 'bg-white border border-slate-100 shadow-xl rounded-xl' }}>
                                            {departments.map(d => <SelectItem key={d}>{d}</SelectItem>)}
                                        </Select>
                                        <Select aria-label="Status" placeholder="All Statuses" size="sm" className="w-36" variant="bordered"
                                            selectedKeys={statusFilter ? new Set([statusFilter]) : new Set()}
                                            onSelectionChange={k => { setStatusFilter(Array.from(k as Set<string>)[0] || ''); setPage(1); }}
                                            classNames={{ trigger: 'bg-white border-slate-200 rounded-xl h-10', popoverContent: 'bg-white border border-slate-100 shadow-xl rounded-xl' }}>
                                            {(['Completed', 'In Progress', 'Scheduled', 'Cancelled'] as ExamStatus[]).map(s => <SelectItem key={s}>{s}</SelectItem>)}
                                        </Select>
                                        <Select aria-label="Session" placeholder="All Sessions" size="sm" className="w-32" variant="bordered"
                                            selectedKeys={sessionFilter ? new Set([sessionFilter]) : new Set()}
                                            onSelectionChange={k => { setSessionFilter(Array.from(k as Set<string>)[0] || ''); setPage(1); }}
                                            classNames={{ trigger: 'bg-white border-slate-200 rounded-xl h-10', popoverContent: 'bg-white border border-slate-100 shadow-xl rounded-xl' }}>
                                            {['Morning', 'Afternoon'].map(s => <SelectItem key={s}>{s}</SelectItem>)}
                                        </Select>
                                        {(search || deptFilter || statusFilter || sessionFilter) && (
                                            <Button size="sm" variant="light" className="text-slate-400 font-semibold h-10 text-xs" onPress={clearFilters}>
                                                <RefreshCw size={13} /> Clear
                                            </Button>
                                        )}
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                        <span className="text-xs text-slate-400 font-semibold">{filtered.length} records</span>
                                        <Button size="sm" variant="bordered"
                                            className="bg-white border-slate-200 text-slate-600 font-semibold rounded-xl h-9 px-4 text-xs"
                                            startContent={<FileSpreadsheet size={13} />}
                                            onPress={() => exportToCSV(filtered, csvName)}>
                                            Export View
                                        </Button>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                    {/* TH */}
                                    <div className="grid bg-slate-50 border-b border-slate-100 px-5 py-3"
                                        style={{ gridTemplateColumns: '0.5fr 2fr 1.4fr 0.8fr 0.9fr 1.4fr 0.8fr 0.7fr 0.7fr 0.9fr 0.5fr' }}>
                                        {['#', 'Subject', 'Department', 'Date', 'Session', 'Hall', 'Reg.', 'Present', 'Absent', 'Status', ''].map(c => (
                                            <span key={c} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{c}</span>
                                        ))}
                                    </div>
                                    {pageItems.length === 0 ? (
                                        <div className="py-20 text-center">
                                            <FileText size={32} className="mx-auto mb-3 text-slate-200" />
                                            <p className="text-slate-400 text-sm font-medium">No exam records match your filters.</p>
                                        </div>
                                    ) : pageItems.map((row, idx) => (
                                        <div key={row.id}
                                            className={`grid px-5 py-4 items-center hover:bg-slate-50/80 transition-colors ${idx < pageItems.length - 1 ? 'border-b border-slate-50' : ''}`}
                                            style={{ gridTemplateColumns: '0.5fr 2fr 1.4fr 0.8fr 0.9fr 1.4fr 0.8fr 0.7fr 0.7fr 0.9fr 0.5fr' }}>
                                            <span className="text-[11px] font-black text-indigo-500">{row.examCode}</span>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 leading-snug">{row.subject}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-black shrink-0"
                                                        style={{ backgroundColor: AVATAR_COLORS[row.invigilatorInitials] || '#6366f1' }}>
                                                        {row.invigilatorInitials}
                                                    </div>
                                                    <span className="text-[11px] text-slate-400 truncate">{row.invigilator}</span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-slate-500 font-medium truncate pr-2">{row.department}</span>
                                            <span className="text-xs text-slate-500">{row.date.slice(5)}</span>
                                            <span className="text-xs font-medium text-slate-600">{row.session}</span>
                                            <div className="flex items-center gap-1 min-w-0">
                                                <MapPin size={11} className="text-slate-300 shrink-0" />
                                                <span className="text-xs text-slate-600 truncate">{row.hall}</span>
                                            </div>
                                            <span className="text-sm font-bold text-slate-800">{row.registered}</span>
                                            <div>
                                                <span className={`text-sm font-black ${rateColor(row.attendanceRate)}`}>
                                                    {row.attendanceRate > 0 ? `${row.attendanceRate.toFixed(0)}%` : '—'}
                                                </span>
                                                <p className="text-[10px] text-slate-400">{row.present}/{row.registered}</p>
                                            </div>
                                            <span className={`text-xs font-bold ${row.absent > 15 ? 'text-rose-500' : 'text-slate-500'}`}>{row.absent || '—'}</span>
                                            <Chip size="sm"
                                                className={`text-[10px] font-bold border px-2 ${STATUS_CONFIG[row.status].chipClass}`}
                                                startContent={STATUS_CONFIG[row.status].icon}>
                                                {row.status}
                                            </Chip>
                                            <button className="text-slate-300 hover:text-indigo-500 transition-colors" title="View detail">
                                                <Eye size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {/* Footer */}
                                    <div className="flex items-center justify-between px-5 py-4 border-t border-slate-50 bg-white">
                                        <span className="text-xs font-semibold text-slate-400">
                                            Showing {filtered.length === 0 ? 0 : (cp - 1) * ROWS_PER_PAGE + 1}–{Math.min(cp * ROWS_PER_PAGE, filtered.length)} of {filtered.length} exams
                                        </span>
                                        <Pagination total={pages} page={cp} onChange={setPage}
                                            classNames={{ wrapper: 'gap-1', item: 'bg-transparent text-slate-500 font-bold text-xs w-8 h-8 min-w-[32px] rounded-lg', cursor: 'bg-indigo-700 text-white font-bold text-xs w-8 h-8 rounded-lg' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: ANALYTICS ── */}
                        {activeTab === 'overview' && (
                            <div className="space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                                    {/* Dept bar */}
                                    <div className="lg:col-span-3">
                                        <h3 className="text-sm font-bold text-slate-700 mb-4">Attendance Rate by Department</h3>
                                        <ResponsiveContainer width="100%" height={230}>
                                            <BarChart data={deptChartData} barSize={26} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="dept" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                                                <Tooltip content={<ChartTooltip />} />
                                                <Bar dataKey="rate" name="Attendance" radius={[5, 5, 0, 0]}>
                                                    {deptChartData.map((e, i) => <Cell key={i} fill={e.rate >= 90 ? '#10b981' : e.rate >= 75 ? '#4f46e5' : e.rate > 0 ? '#f59e0b' : '#e2e8f0'} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {/* Donut */}
                                    <div className="lg:col-span-2">
                                        <h3 className="text-sm font-bold text-slate-700 mb-4">Exam Status Breakdown</h3>
                                        <ResponsiveContainer width="100%" height={230}>
                                            <PieChart>
                                                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                                                    {statusDist.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                                </Pie>
                                                <Tooltip formatter={(v, n) => [`${v} exams`, n]} />
                                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Session comparison */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-4">Session Comparison</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {sessionData.map(s => (
                                            <div key={s.session} className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-sm font-bold text-slate-700">{s.session} Session</span>
                                                    <Chip size="sm" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold text-xs">{s.count} exams</Chip>
                                                </div>
                                                <p className="text-3xl font-black text-slate-900">{s.rate}%</p>
                                                <p className="text-xs text-slate-400 mt-1">average attendance rate</p>
                                                <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.rate}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Highlight cards */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 mb-4">Series Highlights</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: 'Highest Attendance', value: '100%', sub: 'MATH302 · Calculus III', icon: <Award size={16} className="text-emerald-600" />, bg: 'bg-emerald-50' },
                                            { label: 'Lowest Attendance', value: '80.7%', sub: 'LIT200 · World Literature', icon: <AlertTriangle size={16} className="text-amber-600" />, bg: 'bg-amber-50' },
                                            { label: 'Largest Hall Used', value: '215', sub: 'Lecture Theatre C', icon: <Building2 size={16} className="text-sky-600" />, bg: 'bg-sky-50' },
                                            { label: 'Absent Students', value: String(BASE_REPORTS.reduce((a, r) => a + r.absent, 0)), sub: 'Across all exams', icon: <Users size={16} className="text-rose-500" />, bg: 'bg-rose-50' },
                                        ].map(c => (
                                            <div key={c.label} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg} mb-3`}>{c.icon}</div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{c.label}</p>
                                                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{c.value}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{c.sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: SEATING ── */}
                        {activeTab === 'seating' && (
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Total Seats Allocated', value: totalSeats.toLocaleString(), sub: 'Across all halls', icon: <MapPin size={17} className="text-amber-600" />, bg: 'bg-amber-50' },
                                        { label: 'Seat Utilization Rate', value: `${((totalPres / totalSeats) * 100).toFixed(1)}%`, sub: 'Present vs. allocated', icon: <TrendingUp size={17} className="text-indigo-600" />, bg: 'bg-indigo-50' },
                                        { label: 'Avg. Hall Fill Rate', value: '88.3%', sub: 'Per session average', icon: <Building2 size={17} className="text-emerald-600" />, bg: 'bg-emerald-50' },
                                    ].map(c => (
                                        <div key={c.label} className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} mb-3`}>{c.icon}</div>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-wide">{c.label}</p>
                                            <p className="text-2xl font-extrabold text-slate-900 mt-1">{c.value}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                                        </div>
                                    ))}
                                </div>

                                <h3 className="text-sm font-bold text-slate-700">Hall-wise Seat Utilization</h3>
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                    <div className="grid bg-slate-50 border-b border-slate-100 px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                                        style={{ gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 1.5fr 0.8fr' }}>
                                        {['Hall', 'Capacity', 'Registered', 'Present', 'Utilization', 'Level'].map(c => <span key={c}>{c}</span>)}
                                    </div>
                                    {BASE_REPORTS.map((r, i, a) => {
                                        const pct = r.seatsAllocated > 0 ? (r.present / r.seatsAllocated) * 100 : 0;
                                        const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-400' : pct > 0 ? 'bg-rose-400' : 'bg-slate-200';
                                        const level = pct >= 80 ? 'High' : pct >= 50 ? 'Medium' : pct > 0 ? 'Low' : 'Pending';
                                        const chipCls = pct >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-100' : pct > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100';
                                        return (
                                            <div key={r.id} className={`grid px-5 py-3.5 items-center hover:bg-slate-50/70 transition-colors ${i < a.length - 1 ? 'border-b border-slate-50' : ''}`}
                                                style={{ gridTemplateColumns: '2fr 0.8fr 0.8fr 0.8fr 1.5fr 0.8fr' }}>
                                                <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                    <MapPin size={12} className="text-slate-300" />{r.hall}
                                                </div>
                                                <span className="text-sm text-slate-600">{r.seatsAllocated}</span>
                                                <span className="text-sm text-slate-600">{r.registered}</span>
                                                <span className="text-sm font-bold text-slate-800">{r.present || '—'}</span>
                                                <div className="flex items-center gap-2 pr-4">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-600 w-9 text-right">{pct > 0 ? `${pct.toFixed(0)}%` : '—'}</span>
                                                </div>
                                                <Chip size="sm" className={`text-[10px] font-bold border px-2 ${chipCls}`}>{level}</Chip>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── TAB: INVIGILATORS ── */}
                        {activeTab === 'invig' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-700">Invigilator Performance — {selectedSeries?.SeriesName}</h3>
                                    <Button size="sm" variant="bordered"
                                        className="bg-white border-slate-200 text-slate-600 font-semibold rounded-xl h-9 text-xs"
                                        startContent={<FileSpreadsheet size={13} />}
                                        onPress={() => exportToCSV(seriesReports, `invigilator-${csvName}`)}>
                                        Export
                                    </Button>
                                </div>
                                <div className="border border-slate-100 rounded-xl overflow-hidden">
                                    <div className="grid bg-slate-50 border-b border-slate-100 px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                                        style={{ gridTemplateColumns: '2.5fr 1.5fr 0.8fr 1fr 1fr 1fr 0.8fr' }}>
                                        {['Invigilator', 'Department', 'Exams', 'Avg. Attendance', 'Students Managed', 'Absent', 'Rating'].map(c => <span key={c}>{c}</span>)}
                                    </div>
                                    {[
                                        { name: 'Dr. Jane Doe', initials: 'JD', dept: 'Computer Science', exams: 2, rate: 91.2, students: 305, absent: 22, rating: 4.8 },
                                        { name: 'Prof. Mark Smith', initials: 'MS', dept: 'Mathematics', exams: 1, rate: 100, students: 45, absent: 0, rating: 5.0 },
                                        { name: 'Lisa Wong', initials: 'LW', dept: 'Humanities', exams: 2, rate: 84.9, students: 198, absent: 29, rating: 4.2 },
                                        { name: 'Ahmed Khan', initials: 'AK', dept: 'Life Sciences', exams: 1, rate: 96.2, students: 210, absent: 8, rating: 4.7 },
                                        { name: 'Dr. Priya Nair', initials: 'PN', dept: 'Physics', exams: 1, rate: 97.5, students: 80, absent: 2, rating: 4.9 },
                                        { name: 'Tom Bradley', initials: 'TB', dept: 'Chemistry', exams: 1, rate: 0, students: 55, absent: 0, rating: 3.5 },
                                        { name: 'Sarah Johnson', initials: 'SJ', dept: 'Economics', exams: 1, rate: 84.7, students: 72, absent: 11, rating: 4.3 },
                                        { name: 'Dr. James Lee', initials: 'JL', dept: 'Computer Science', exams: 1, rate: 95.2, students: 145, absent: 7, rating: 4.6 },
                                        { name: 'Prof. Anita Patel', initials: 'AP', dept: 'Mechanical Eng.', exams: 1, rate: 91.5, students: 130, absent: 11, rating: 4.5 },
                                        { name: 'Dr. Mei Lin', initials: 'ML', dept: 'Psychology', exams: 1, rate: 89.2, students: 65, absent: 7, rating: 4.4 },
                                        { name: 'Prof. David Chen', initials: 'DC', dept: 'Mathematics', exams: 1, rate: 0, students: 95, absent: 0, rating: 3.8 },
                                        { name: 'Dr. Raj Kumar', initials: 'RK', dept: 'Humanities', exams: 1, rate: 89.1, students: 110, absent: 12, rating: 4.3 },
                                    ].map((inv, i, a) => (
                                        <div key={inv.name} className={`grid px-5 py-4 items-center hover:bg-slate-50/70 transition-colors ${i < a.length - 1 ? 'border-b border-slate-50' : ''}`}
                                            style={{ gridTemplateColumns: '2.5fr 1.5fr 0.8fr 1fr 1fr 1fr 0.8fr' }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0"
                                                    style={{ backgroundColor: AVATAR_COLORS[inv.initials] || '#6366f1' }}>
                                                    {inv.initials}
                                                </div>
                                                <span className="text-sm font-bold text-slate-900">{inv.name}</span>
                                            </div>
                                            <span className="text-xs text-slate-500 font-medium">{inv.dept}</span>
                                            <span className="text-sm font-bold text-slate-800">{inv.exams}</span>
                                            <span className={`text-sm font-black ${inv.rate >= 90 ? 'text-emerald-600' : inv.rate >= 75 ? 'text-amber-500' : inv.rate > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
                                                {inv.rate > 0 ? `${inv.rate.toFixed(1)}%` : '—'}
                                            </span>
                                            <span className="text-sm font-bold text-slate-800">{inv.students}</span>
                                            <span className={`text-sm font-bold ${inv.absent > 15 ? 'text-rose-500' : 'text-slate-600'}`}>{inv.absent > 0 ? inv.absent : '—'}</span>
                                            <div className="flex items-center gap-1">
                                                <span className="text-amber-400 font-black text-sm">★</span>
                                                <span className="text-sm font-bold text-slate-700">{inv.rating}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;
