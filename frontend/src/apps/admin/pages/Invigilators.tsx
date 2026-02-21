import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Button,
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    useDisclosure,
    Spinner,
    Pagination,
    Tooltip,
} from '@heroui/react';
import {
    Search,
    Trash2,
    ShieldCheck,
    Users,
    UserMinus,
    Flag,
    CheckCircle2,
    ChevronDown,
    Building2,
    UserPlus,
    Upload,
    Filter,
    MoreVertical,
    Activity,
    Clock,
    Briefcase,
    X,
    TrendingUp,
    ClipboardList,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { invigilatorService, Invigilator, InvigilatorStats } from '../services/invigilatorService';
import AddInvigilatorModal from '../components/invigilators/AddInvigilatorModal';
import BulkImportModal from '../components/invigilators/BulkImportModal';

/* ─── helpers ──────────────────────────────────────────── */
const staffId = (id: number) => `#IV-2024-${String(id).padStart(3, '0')}`;

const mockEmail = (name?: string) => {
    if (!name) return 'user@faculty.edu';
    const parts = name.trim().split(' ');
    const first = parts[0]?.toLowerCase() || 'user';
    const last = parts[1]?.toLowerCase() || 'x';
    return `${first}.${last}@faculty.edu`;
};

const mockPhone = (id?: number) => {
    if (!id) return '+91 9800 000234';
    const digits = String(id).padStart(4, '0');
    return `+91 98${digits.slice(0, 2)} ${digits.slice(2)}234`;
};

const initials = (name?: string) => {
    if (!name) return 'NA';
    return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2);
};

type StatusKey = 'active' | 'on-leave' | 'inactive';

const resolveStatus = (inv: Invigilator): StatusKey => {
    if (!inv.isEligible) return 'inactive';
    if (inv.isFlagged) return 'on-leave';
    return 'active';
};

const STATUS_CFG: Record<StatusKey, { label: string; dotBg: string; chipBg: string; chipText: string; badgeBg: string }> = {
    'active': { label: 'Active', dotBg: '#22c55e', chipBg: '#f0fdf4', chipText: '#15803d', badgeBg: 'bg-emerald-500' },
    'on-leave': { label: 'On Leave', dotBg: '#f59e0b', chipBg: '#fffbeb', chipText: '#b45309', badgeBg: 'bg-amber-400' },
    'inactive': { label: 'Inactive', dotBg: '#94a3b8', chipBg: '#f8fafc', chipText: '#475569', badgeBg: 'bg-slate-400' },
};

/* ─── KPI Card ──────────────────────────────────────────── */
interface KpiProps { label: string; value: string | number; icon: React.ReactNode; accent: string; loading?: boolean; }
const KpiCard: React.FC<KpiProps> = ({ label, value, icon, accent, loading }) => (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
        <div className={`w-12 h-12 rounded-xl ${accent} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{loading ? <span className="text-slate-300">—</span> : value}</p>
        </div>
    </div>
);

/* ═══════════════════════════════════════════════════════ */

const Invigilators: React.FC = () => {
    const [invigilators, setInvigilators] = useState<Invigilator[]>([]);
    const [stats, setStats] = useState<InvigilatorStats>({ total: 0, active: 0, eligible: 0, onDuty: 0, flagged: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [page, setPage] = useState(1);
    const rowsPerPage = 8;

    const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onOpenDelete, onClose: onCloseDelete } = useDisclosure();
    const { isOpen: isDetailsOpen, onOpen: onOpenDetails, onClose: onCloseDetails } = useDisclosure();
    const { isOpen: isBulkOpen, onOpen: onBulkOpen, onClose: onBulkClose } = useDisclosure();
    const [selected, setSelected] = useState<Invigilator | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

    /* ── data ──────────────────────────────────────────── */
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [data, statData] = await Promise.all([
                invigilatorService.getAll(),
                invigilatorService.getStats(),
            ]);
            setInvigilators(data);
            setStats(statData);
        } catch { toast.error('Failed to load invigilators'); }
        finally { setIsLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    /* ── actions ───────────────────────────────────────── */
    const handleToggleFlag = async (id: number) => {
        try {
            const result = await invigilatorService.toggleFlag(id);
            setInvigilators(prev => prev.map(inv =>
                inv.InvigilatorID === id ? { ...inv, isFlagged: result.isFlagged } : inv
            ));
            toast.success(result.message);
        } catch { toast.error('Failed to update flag status'); }
    };

    const handleDelete = async () => {
        if (!selected) return;
        setIsSubmitting(true);
        try {
            await invigilatorService.delete(selected.InvigilatorID);
            toast.success('Invigilator removed successfully');
            onCloseDelete();
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || 'Failed to remove invigilator');
        } finally { setIsSubmitting(false); }
    };

    const handleToggleEligibility = async (id: number) => {
        try {
            const inv = invigilators.find(i => i.InvigilatorID === id);
            if (!inv) return;
            await invigilatorService.toggleEligibility(id);
            toast.success(`${inv.Name} marked as ${inv.isEligible ? 'ineligible' : 'eligible'}`);
            fetchData();
        } catch { toast.error('Failed to toggle eligibility'); }
    };

    /* ── derived ───────────────────────────────────────── */
    const uniqueDepts = React.useMemo(() => {
        // Collect unique department strings
        const depts = new Set<string>();
        invigilators.forEach(inv => {
            if (inv.Department) depts.add(inv.Department);
        });
        return Array.from(depts).sort();
    }, [invigilators]);

    const filtered = invigilators.filter(inv => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q ||
            inv.Name?.toLowerCase()?.includes(q) ||
            inv.Designation?.toLowerCase()?.includes(q) ||
            inv.Department?.toLowerCase()?.includes(q) ||
            staffId(inv.InvigilatorID).includes(q);
        const matchDept = !selectedDept || inv.Department === selectedDept;
        const st = resolveStatus(inv);
        const matchStatus = !selectedStatus || st === selectedStatus;
        return matchSearch && matchDept && matchStatus;
    });

    const pages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const pageItems = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const hasFilters = searchQuery || selectedDept || selectedStatus;

    /* ── export ────────────────────────────────────────── */
    const exportCSV = () => {
        const rows = [
            ['Name', 'Staff ID', 'Designation', 'Department', 'Total Exams', 'Status'],
            ...filtered.map(inv => [inv.Name, staffId(inv.InvigilatorID), inv.Designation, inv.Department || '', inv.totalExams || 0, STATUS_CFG[resolveStatus(inv)].label]),
        ];
        const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'invigilators.csv' });
        a.click();
    };

    /* ═══════════════════ RENDER ════════════════════════ */
    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            {/* ── Page Header ─────────────────────────────── */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-[1300px] mx-auto px-8 py-6">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Staff Directory</p>
                            <h1 className="text-[28px] font-bold text-slate-900 leading-tight mb-1">Invigilator Management</h1>
                            <p className="text-slate-500 text-sm max-w-[520px] leading-relaxed">
                                Centrally oversee, filter, and manage all academic staff registered for exam invigilation duties.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 shrink-0">
                            <Button
                                variant="bordered"
                                className="border-slate-200 text-slate-600 font-semibold h-10 px-5 rounded-xl bg-white text-sm hover:bg-slate-50 transition-colors"
                                startContent={<Upload size={15} />}
                                onPress={onBulkOpen}
                            >
                                Import Bulk
                            </Button>
                            <Button
                                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold h-10 px-5 rounded-xl text-sm shadow-sm transition-colors"
                                startContent={<UserPlus size={15} />}
                                onPress={onAddOpen}
                            >
                                Add Invigilator
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1300px] mx-auto px-8 py-7 flex flex-col gap-6">

                {/* ── KPI Row ─────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <KpiCard loading={isLoading} label="Total Registered" value={stats.total.toLocaleString()} icon={<Briefcase size={20} className="text-slate-600" />} accent="bg-slate-100" />
                    <KpiCard loading={isLoading} label="Active Now" value={stats.eligible} icon={<ShieldCheck size={20} className="text-emerald-600" />} accent="bg-emerald-50" />
                    <KpiCard loading={isLoading} label="On Leave" value={stats.flagged} icon={<Clock size={20} className="text-amber-500" />} accent="bg-amber-50" />
                    <KpiCard loading={isLoading} label="Departments" value={uniqueDepts.length} icon={<Building2 size={20} className="text-blue-600" />} accent="bg-blue-50" />
                </div>

                {/* ── Search + Filter bar ─────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 flex items-center gap-4 shadow-sm">
                    {/* Search */}
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                        <Search size={16} className="text-slate-400 shrink-0" />
                        <input
                            className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none min-w-0"
                            placeholder="Search by name, ID or email address..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setPage(1); }} className="text-slate-400 hover:text-slate-600 shrink-0">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className="w-px h-5 bg-slate-200 shrink-0" />

                    {/* Dept */}
                    <label className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dept</span>
                        <div className="relative">
                            <select
                                className="text-sm font-medium text-slate-700 bg-transparent outline-none appearance-none pr-5 cursor-pointer"
                                value={selectedDept}
                                onChange={e => { setSelectedDept(e.target.value); setPage(1); }}
                            >
                                <option value="">All Departments</option>
                                {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </label>

                    <div className="w-px h-5 bg-slate-200 shrink-0" />

                    {/* Status */}
                    <label className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                        <div className="relative">
                            <select
                                className="text-sm font-medium text-slate-700 bg-transparent outline-none appearance-none pr-5 cursor-pointer"
                                value={selectedStatus}
                                onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="on-leave">On Leave</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </label>

                    <div className="w-px h-5 bg-slate-200 shrink-0" />

                    <Tooltip content="Advanced filters" placement="bottom">
                        <button className="text-slate-400 hover:text-slate-700 transition-colors shrink-0">
                            <Filter size={16} />
                        </button>
                    </Tooltip>

                    {hasFilters && (
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedDept(''); setSelectedStatus(''); setPage(1); }}
                            className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors shrink-0 flex items-center gap-1"
                        >
                            <X size={12} /> Clear
                        </button>
                    )}

                    <span className="ml-auto text-xs text-slate-400 font-medium shrink-0">{filtered.length} records</span>
                </div>

                {/* ── Table Card ──────────────────────────────── */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">

                    {/* Table head */}
                    <div className="grid grid-cols-[2.2fr_1.1fr_1.4fr_1.8fr_1fr_200px] px-6 py-3.5 border-b border-slate-100 bg-slate-50/70">
                        {['Invigilator', 'Staff ID', 'Department', 'Contact', 'Status', 'Actions'].map((h, i) => (
                            <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</span>
                        ))}
                    </div>

                    {/* Body */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-24">
                            <Spinner size="lg" classNames={{ circle1: 'border-b-slate-700', circle2: 'border-b-slate-400' }} />
                        </div>
                    ) : pageItems.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Users size={28} className="text-slate-300" />
                            </div>
                            <p className="text-slate-500 font-semibold text-sm">No invigilators found</p>
                            <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        pageItems.map((inv, idx) => {
                            const st = resolveStatus(inv);
                            const cfg = STATUS_CFG[st];
                            const ini = initials(inv.Name);
                            const isLast = idx === pageItems.length - 1;

                            return (
                                <div
                                    key={inv.InvigilatorID}
                                    className={`group grid grid-cols-[2.2fr_1.1fr_1.4fr_1.8fr_1fr_200px] px-6 py-4 items-center transition-colors hover:bg-slate-50/80 ${!isLast ? 'border-b border-slate-100' : ''}`}
                                >
                                    {/* Invigilator */}
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {inv.ProfileImageURL ? (
                                            <img
                                                src={inv.ProfileImageURL}
                                                alt={inv.Name}
                                                className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm shrink-0"
                                                onError={e => (e.currentTarget.style.display = 'none')}
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                                                {ini}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{inv.Name}</p>
                                            <p className="text-xs text-slate-400 truncate mt-0.5">{inv.Designation || 'Faculty'}</p>
                                        </div>
                                    </div>

                                    {/* Staff ID */}
                                    <div>
                                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">{staffId(inv.InvigilatorID)}</span>
                                    </div>

                                    {/* Department */}
                                    <div>
                                        <span className="text-sm text-slate-700">{inv.Department || '—'}</span>
                                    </div>

                                    {/* Contact */}
                                    <div>
                                        <p className="text-xs text-slate-600 font-medium">{mockEmail(inv.Name)}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{mockPhone(inv.InvigilatorID)}</p>
                                    </div>

                                    {/* Status chip */}
                                    <div>
                                        <span
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border"
                                            style={{
                                                background: cfg.chipBg,
                                                color: cfg.chipText,
                                                borderColor: cfg.chipBg === '#f0fdf4' ? '#bbf7d0' : cfg.chipBg === '#fffbeb' ? '#fde68a' : '#e2e8f0',
                                            }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dotBg }} />
                                            {cfg.label}
                                        </span>
                                    </div>

                                    {/* Actions — separated pastel pills */}
                                    <div className="flex items-center gap-2">

                                        {/* View Profile */}
                                        <div className="relative">
                                            <button
                                                onClick={() => { setSelected(inv); onOpenDetails(); }}
                                                onMouseEnter={() => setActiveTooltip(`${inv.InvigilatorID}-view`)}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                                className="h-8 w-11 flex items-center justify-center rounded-lg border border-blue-100 bg-blue-50/50 text-blue-500 hover:bg-blue-100/50 hover:text-blue-600 transition-colors shadow-sm"
                                            >
                                                <ClipboardList size={14} strokeWidth={2.5} />
                                            </button>
                                            {activeTooltip === `${inv.InvigilatorID}-view` && (
                                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center z-[9999]">
                                                    <div className="bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                                        <p className="text-[11px] font-semibold leading-tight">View Profile</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">See full invigilator details</p>
                                                    </div>
                                                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Suspend / Restore Access */}
                                        <div className="relative">
                                            <button
                                                onClick={() => handleToggleEligibility(inv.InvigilatorID)}
                                                onMouseEnter={() => setActiveTooltip(`${inv.InvigilatorID}-elig`)}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                                className={`h-8 w-11 flex items-center justify-center rounded-lg border shadow-sm transition-colors ${inv.isEligible
                                                    ? 'border-emerald-100 bg-emerald-50/50 text-emerald-500 hover:bg-emerald-100/50 hover:text-emerald-600'
                                                    : 'border-amber-100 bg-amber-50/50 text-amber-500 hover:bg-amber-100/50 hover:text-amber-600'
                                                    }`}
                                            >
                                                {inv.isEligible ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <UserMinus size={14} strokeWidth={2.5} />}
                                            </button>
                                            {activeTooltip === `${inv.InvigilatorID}-elig` && (
                                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center z-[9999]">
                                                    <div className="bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                                        <p className="text-[11px] font-semibold leading-tight">{inv.isEligible ? 'Suspend Access' : 'Restore Access'}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{inv.isEligible ? 'Disable from exam duty' : 'Re-enable for exam duty'}</p>
                                                    </div>
                                                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Flag for Leave */}
                                        <div className="relative">
                                            <button
                                                onClick={() => handleToggleFlag(inv.InvigilatorID)}
                                                onMouseEnter={() => setActiveTooltip(`${inv.InvigilatorID}-flag`)}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                                className={`h-8 w-11 flex items-center justify-center rounded-lg border shadow-sm transition-colors ${inv.isFlagged
                                                    ? 'border-purple-200 bg-purple-100/50 text-purple-600 hover:bg-purple-200/50'
                                                    : 'border-slate-200 bg-slate-50/50 text-slate-400 hover:bg-slate-100/50 hover:text-slate-600'
                                                    }`}
                                            >
                                                <Flag size={14} strokeWidth={2.5} />
                                            </button>
                                            {activeTooltip === `${inv.InvigilatorID}-flag` && (
                                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center z-[9999]">
                                                    <div className="bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                                        <p className="text-[11px] font-semibold leading-tight">{inv.isFlagged ? 'Clear Leave Status' : 'Flag for Leave'}</p>
                                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{inv.isFlagged ? 'Remove the leave flag' : 'Mark as on approved leave'}</p>
                                                    </div>
                                                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Remove Account */}
                                        <div className="relative">
                                            <button
                                                onClick={() => { setSelected(inv); onOpenDelete(); }}
                                                onMouseEnter={() => setActiveTooltip(`${inv.InvigilatorID}-del`)}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                                className="h-8 w-11 flex items-center justify-center rounded-lg border border-rose-100 bg-rose-50/50 text-rose-500 hover:bg-rose-100/50 hover:text-rose-600 transition-colors shadow-sm"
                                            >
                                                <Trash2 size={14} strokeWidth={2.5} />
                                            </button>
                                            {activeTooltip === `${inv.InvigilatorID}-del` && (
                                                <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center z-[9999]">
                                                    <div className="bg-rose-600 text-white rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                                        <p className="text-[11px] font-semibold leading-tight">Remove Account</p>
                                                        <p className="text-[10px] text-rose-200 mt-0.5 leading-tight">Permanently delete this record</p>
                                                    </div>
                                                    <div className="w-2 h-2 bg-rose-600 rotate-45 -mt-1" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        <span className="text-xs text-slate-400 font-medium">
                            {filtered.length === 0
                                ? 'No results'
                                : `Showing ${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, filtered.length)} of ${filtered.length} results`}
                        </span>
                        {pages > 1 && (
                            <Pagination
                                total={pages}
                                page={page}
                                onChange={setPage}
                                showControls
                                classNames={{
                                    wrapper: 'gap-1',
                                    item: 'bg-white text-slate-600 font-semibold text-xs w-8 h-8 min-w-[32px] border border-slate-200 rounded-lg shadow-sm',
                                    cursor: 'bg-slate-900 text-white font-bold text-xs w-8 h-8 rounded-lg border-none shadow-md',
                                    prev: 'bg-white border border-slate-200 rounded-lg text-slate-500 shadow-sm',
                                    next: 'bg-white border border-slate-200 rounded-lg text-slate-500 shadow-sm',
                                }}
                            />
                        )}
                    </div>
                </div>

            </div>

            {/* ══════════════ MODALS ════════════════════════ */}

            <AddInvigilatorModal isOpen={isAddOpen} onClose={onAddClose} onSuccess={fetchData} />

            {/* Delete — custom portal overlay (bypasses HeroUI z-index issues) */}
            {isDeleteOpen && createPortal(
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}
                    onClick={(e) => e.target === e.currentTarget && onCloseDelete()}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                        style={{ border: '1px solid #e2e8f0' }}
                    >
                        {/* Body */}
                        <div className="px-8 pt-8 pb-8 text-center">
                            {/* Icon */}
                            <div className="flex items-center justify-center mb-5">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#fff1f2,#fecdd3)', border: '1px solid #fecaca' }}>
                                    <Trash2 size={26} className="text-rose-500" strokeWidth={1.75} />
                                </div>
                            </div>
                            {/* Title */}
                            <h3 className="text-[18px] font-bold text-slate-900 mb-2">Delete Invigilator</h3>
                            {/* Description */}
                            <p className="text-sm text-slate-500 leading-relaxed">
                                You are about to permanently remove{' '}
                                <span className="font-semibold text-slate-800">{selected?.Name}</span>{' '}
                                from the system. This action cannot be undone.
                            </p>
                            {/* Divider */}
                            <div className="my-6 h-px bg-slate-100" />
                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={onCloseDelete}
                                    className="flex-1 h-11 rounded-xl font-semibold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                    className="flex-1 h-11 rounded-xl font-bold text-sm text-white bg-rose-500 hover:bg-rose-600 transition-colors shadow-md disabled:opacity-70"
                                    style={{ boxShadow: '0 4px 14px rgba(239,68,68,0.35)' }}
                                >
                                    {isSubmitting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Profile — custom portal overlay */}
            {isDetailsOpen && selected && (() => {
                const st = resolveStatus(selected);
                const cfg = STATUS_CFG[st];
                const ini = initials(selected.Name);
                return createPortal(
                    <div
                        className="fixed inset-0 z-[99999] flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }}
                        onClick={(e) => e.target === e.currentTarget && onCloseDetails()}
                    >
                        <div
                            className="bg-white w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
                            style={{ border: '1px solid #e2e8f0', maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            {/* ── Header band ───────────────────────────── */}
                            <div className="relative" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#334155 100%)' }}>
                                {/* Close */}
                                <button
                                    onClick={onCloseDetails}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    ✕
                                </button>

                                <div className="px-7 pt-8 pb-6 flex items-center gap-5">
                                    {/* Avatar */}
                                    {selected.ProfileImageURL ? (
                                        <img src={selected.ProfileImageURL} alt={selected.Name}
                                            className="w-20 h-20 rounded-2xl object-cover ring-4 shadow-xl shrink-0"
                                            style={{ ringColor: 'rgba(255,255,255,0.15)' }} />
                                    ) : (
                                        <div
                                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-xl"
                                            style={{ background: 'linear-gradient(135deg,#475569,#1e293b)', border: '2px solid rgba(255,255,255,0.12)' }}
                                        >
                                            {ini}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <h2 className="text-xl font-bold text-white truncate leading-tight">{selected.Name}</h2>
                                        <p className="text-sm text-slate-400 mt-0.5">{selected.Designation || 'Faculty'}</p>
                                        <div className="flex items-center gap-2 mt-3">
                                            {/* Status pill */}
                                            <span
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
                                                style={{ background: cfg.chipBg, color: cfg.chipText }}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dotBg }} />
                                                {cfg.label}
                                            </span>
                                            {/* Staff ID pill */}
                                            <span className="font-mono text-[11px] text-white/50 bg-white/10 px-2.5 py-1 rounded-full">
                                                {staffId(selected.InvigilatorID)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Body ──────────────────────────────────── */}
                            <div className="px-7 py-6 space-y-5">

                                {/* Info grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { icon: '🏛️', label: 'Department', value: selected.Department || '—' },
                                        { icon: '📋', label: 'Total Exams', value: `${selected.totalExams ?? 0}` },
                                        { icon: '✅', label: 'Eligibility', value: selected.isEligible ? 'Eligible' : 'Not Eligible', green: selected.isEligible, red: !selected.isEligible },
                                        { icon: '🚩', label: 'Leave Status', value: selected.isFlagged ? 'On Leave' : 'Available', amber: selected.isFlagged },
                                    ].map(item => (
                                        <div key={item.label} className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                            <p className={`text-sm font-semibold ${(item as any).green ? 'text-emerald-600' : (item as any).red ? 'text-rose-500' : (item as any).amber ? 'text-amber-600' : 'text-slate-800'}`}>
                                                {item.value}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Contact */}
                                <div className="rounded-xl p-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contact</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0" style={{ fontSize: 13 }}>@</div>
                                            <span className="text-sm text-slate-700 font-medium">{mockEmail(selected.Name)}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0" style={{ fontSize: 11 }}>☎</div>
                                            <span className="text-sm text-slate-500">{mockPhone(selected.InvigilatorID)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-slate-100" />

                                {/* Action buttons */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => { handleToggleEligibility(selected.InvigilatorID); onCloseDetails(); }}
                                        className={`flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold border transition-colors ${selected.isEligible ? 'border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100' : 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                                    >
                                        {selected.isEligible ? <><UserMinus size={13} /> Mark Ineligible</> : <><CheckCircle2 size={13} /> Mark Eligible</>}
                                    </button>
                                    <button
                                        onClick={() => { handleToggleFlag(selected.InvigilatorID); onCloseDetails(); }}
                                        className={`flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold border transition-colors ${selected.isFlagged ? 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100' : 'border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100'}`}
                                    >
                                        <Flag size={13} /> {selected.isFlagged ? 'Clear Leave' : 'Flag for Leave'}
                                    </button>
                                    <button
                                        onClick={() => { onCloseDetails(); setTimeout(onOpenDelete, 150); }}
                                        className="ml-auto flex items-center gap-1.5 px-3.5 h-9 rounded-xl text-xs font-semibold border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                                    >
                                        <Trash2 size={13} /> Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                );
            })()}

            {/* Bulk Import */}
            <BulkImportModal isOpen={isBulkOpen} onClose={onBulkClose} onSuccess={fetchData} />
        </div >
    );
};

export default Invigilators;
