import React, { useEffect, useState, useRef, useCallback } from 'react';
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
} from '@heroui/react';
import {
    Search, Trash2, ShieldCheck, Users, UserMinus, Flag,
    CheckCircle2, ChevronDown, Building2, UserPlus, Upload,
    Filter, MoreVertical, Activity, Clock, Briefcase, X,
    TrendingUp, ClipboardList, Mail, Phone, Copy, Check,
    Shield, RotateCcw, LogOut, Eye, AlertTriangle, Calendar,
    ChevronRight, Star, BookOpen, Award,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { invigilatorService, Invigilator, InvigilatorStats } from '../services/invigilatorService';
import AddInvigilatorModal from '../components/invigilators/AddInvigilatorModal';
import BulkImportModal from '../components/invigilators/BulkImportModal';
import RequestsModal from '../components/invigilators/RequestsModal';

/* ─── helpers ─────────────────────────────────────────────── */
const staffId = (id: number) => `#IV-${String(id).padStart(4, '0')}`;
const mockEmail = (name?: string) => {
    if (!name) return 'user@faculty.edu';
    const parts = name.trim().split(' ');
    const first = parts[0]?.toLowerCase() || 'user';
    const last = parts[1]?.toLowerCase() || 'x';
    return `${first}.${last}@faculty.edu`;
};
const mockPhone = (id?: number) => {
    if (!id) return '+91 98000 00234';
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

const STATUS_CFG = {
    'active':   { label: 'Active',    dot: '#16a34a', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', glow: 'shadow-emerald-100' },
    'on-leave': { label: 'On Leave',  dot: '#d97706', bg: '#fffbeb', text: '#b45309', border: '#fde68a', glow: 'shadow-amber-100'   },
    'inactive': { label: 'Inactive',  dot: '#94a3b8', bg: '#f8fafc', text: '#475569', border: '#e2e8f0', glow: 'shadow-slate-100'   },
} as const;

const AVATAR_GRADIENTS = [
    'from-violet-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-indigo-500 to-blue-600',
];
const avatarGrad = (id: number) => AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length];

/* ─── Copy Button ─────────────────────────────────────────── */
const CopyBtn: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const copy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <button onClick={copy} title="Copy" className="ml-1 text-slate-300 hover:text-slate-600 transition-colors">
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
        </button>
    );
};

/* ─── KPI Card ─────────────────────────────────────────────── */
interface KpiProps { label: string; value: string | number; icon: React.ReactNode; accent: string; delta?: string; loading?: boolean; }
const KpiCard: React.FC<KpiProps> = ({ label, value, icon, accent, delta, loading }) => (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-lg hover:border-slate-200 transition-all duration-200 group relative overflow-hidden">
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
            style={{ background: 'radial-gradient(ellipse at 0% 0%, rgba(248,250,252,0.8) 0%, transparent 70%)' }} />
        <div className={`w-12 h-12 rounded-xl ${accent} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
            {icon}
        </div>
        <div className="relative">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-bold text-slate-900">{loading ? <span className="text-slate-200 animate-pulse">—</span> : value}</p>
            {delta && <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{delta}</p>}
        </div>
    </div>
);

/* ─── Action Menu singleton (only one open at a time) ─────── */
let _activeMenuId: string | null = null;
let _menuListeners: Array<(id: string | null) => void> = [];
const setActiveMenuId = (id: string | null) => {
    _activeMenuId = id;
    _menuListeners.forEach(fn => fn(id));
};

interface ActionMenuItem {
    key: string; label: string; description: string; icon: React.ReactNode;
    danger?: boolean; warning?: boolean; onClick: () => void;
}
const ActionMenu: React.FC<{ menuId: string; items: ActionMenuItem[] }> = ({ menuId, items }) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const btnRef = useRef<HTMLButtonElement>(null);

    // Subscribe to the global active-menu changes
    useEffect(() => {
        const listener = (id: string | null) => {
            if (id !== menuId) setOpen(false);
        };
        _menuListeners.push(listener);
        return () => { _menuListeners = _menuListeners.filter(l => l !== listener); };
    }, [menuId]);

    const openMenu = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = btnRef.current?.getBoundingClientRect();
        if (!rect) return;
        const menuW = 240;
        const menuH = items.length * 68 + 16;
        const left = rect.right - menuW < 8 ? rect.left : rect.right - menuW;
        const top  = rect.bottom + menuH > window.innerHeight - 8 ? rect.top - menuH - 4 : rect.bottom + 6;
        setPos({ top, left });
        setActiveMenuId(menuId); // close all others
        setOpen(true);
    }, [menuId, items.length]);

    const closeMenu = useCallback(() => {
        setOpen(false);
        setActiveMenuId(null);
    }, []);

    useEffect(() => {
        if (!open) return;
        const onClickOutside = () => closeMenu();
        const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
        document.addEventListener('click', onClickOutside);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('click', onClickOutside);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open, closeMenu]);

    return (
        <>
            <button ref={btnRef} onClick={openMenu}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    open ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title="Actions"
            >
                <MoreVertical size={15} />
            </button>
            {open && createPortal(
                <div onClick={e => e.stopPropagation()}
                    style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 999999, width: 240, animation: 'amFadeScale .14s cubic-bezier(.16,1,.3,1)' }}
                    className="bg-white rounded-2xl shadow-2xl border border-slate-100/80 py-1.5 overflow-hidden"
                >
                    <style>{`@keyframes amFadeScale{from{opacity:0;transform:scale(.94) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
                    {items.map((item, i) => (
                        <button key={item.key} onClick={() => { item.onClick(); closeMenu(); }}
                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-all group/item ${
                                item.danger  ? 'hover:bg-rose-50 text-rose-600'
                              : item.warning ? 'hover:bg-amber-50 text-amber-700'
                              : 'hover:bg-slate-50 text-slate-700'
                            } ${i < items.length - 1 ? 'border-b border-slate-50' : ''}`}
                        >
                            <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                item.danger  ? 'bg-rose-50 text-rose-400 group-hover/item:bg-rose-100'
                              : item.warning ? 'bg-amber-50 text-amber-500 group-hover/item:bg-amber-100'
                              : 'bg-slate-100 text-slate-400 group-hover/item:bg-slate-200'
                            }`}>{item.icon}</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold leading-tight">{item.label}</p>
                                <p className={`text-[11px] mt-0.5 ${item.danger ? 'text-rose-400' : item.warning ? 'text-amber-500' : 'text-slate-400'}`}>{item.description}</p>
                            </div>
                            <ChevronRight size={12} className="text-slate-300 group-hover/item:text-slate-400 shrink-0" />
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};


/* ─── Profile Drawer ────────────────────────────────────────── */
const ProfileDrawer: React.FC<{
    inv: Invigilator | null; open: boolean; onClose: () => void;
    onToggleEligibility: (id: number) => void;
    onToggleFlag: (id: number) => void;
    onDelete: () => void;
}> = ({ inv, open, onClose, onToggleEligibility, onToggleFlag, onDelete }) => {
    if (!inv) return null;
    const st = resolveStatus(inv);
    const cfg = STATUS_CFG[st];
    const ini = initials(inv.Name);
    const grad = avatarGrad(inv.InvigilatorID);

    const statCards = [
        { label: 'Total Duties', value: inv.totalExams ?? 0, icon: <BookOpen size={14} />, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Completed', value: 0, icon: <CheckCircle2 size={14} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Upcoming', value: 0, icon: <Calendar size={14} />, color: 'text-violet-600', bg: 'bg-violet-50' },
        { label: 'Leave Days', value: inv.isFlagged ? '—' : 0, icon: <Clock size={14} />, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return createPortal(
        <>
            {/* Backdrop */}
            <div onClick={onClose} className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} style={{ zIndex: 99990 }} />
            {/* Drawer */}
            <div className={`fixed top-0 right-0 h-full w-[520px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ zIndex: 99991 }}>
                {/* Drawer Header — gradient banner */}
                <div className="relative shrink-0 overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)', minHeight: 100 }}>
                    {/* Decorative blobs */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(99,102,241,0.35) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(6,182,212,0.25) 0%, transparent 45%)' }} />
                    {/* Close button */}
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all">
                            <X size={15} />
                        </button>
                    </div>
                    {/* Identity row */}
                    <div className="flex items-center gap-4 px-6 py-5">
                        {/* Avatar — fully inside the header, no overflow tricks */}
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-black text-xl shrink-0 shadow-lg ring-2 ring-white/20`}>
                            {ini}
                        </div>
                        <div className="min-w-0">
                            <p className="text-white font-bold text-[17px] leading-snug truncate">{inv.Name}</p>
                            <p className="text-white/55 text-sm mt-0.5">{inv.Designation || 'Faculty'}</p>
                            <div className="flex items-center gap-2 mt-2.5">
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                                    style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
                                    {cfg.label}
                                </span>
                                <span className="font-mono text-[11px] text-white/40 bg-white/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    {staffId(inv.InvigilatorID)}<CopyBtn text={staffId(inv.InvigilatorID)} />
                                </span>
                                {inv.isEligible && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        <Award size={9} /> Eligible
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">


                    {/* Quick Stats */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Quick Stats</p>
                        <div className="grid grid-cols-4 gap-2">
                            {statCards.map(s => (
                                <div key={s.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                                    <div className={`w-7 h-7 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mx-auto mb-1.5`}>{s.icon}</div>
                                    <p className="text-base font-bold text-slate-900">{s.value}</p>
                                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Academic Info */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Academic Info</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Department</p>
                                <p className="text-sm font-semibold text-slate-800">{inv.Department || 'Not Assigned'}</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Eligibility</p>
                                <p className={`text-sm font-bold flex items-center gap-1 ${inv.isEligible ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {inv.isEligible ? <><CheckCircle2 size={13}/> Eligible</> : <><AlertTriangle size={13}/> Ineligible</>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Duty History placeholder */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Duty History</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-center">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-2">
                                <BookOpen size={18} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-400">No assignments yet</p>
                            <p className="text-xs text-slate-300 mt-0.5">Duty records will appear here</p>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Contact</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden">
                            <a href={`mailto:${mockEmail(inv.Name)}`}
                                className="flex items-center gap-3 px-4 py-3.5 hover:bg-white transition-colors group border-b border-slate-100">
                                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                    <Mail size={13} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                                    <p className="text-sm font-medium text-slate-700 truncate">{mockEmail(inv.Name)}</p>
                                </div>
                                <CopyBtn text={mockEmail(inv.Name)} />
                            </a>
                            <div className="flex items-center gap-3 px-4 py-3.5">
                                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                    <Phone size={13} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</p>
                                    <p className="text-sm font-medium text-slate-700">{mockPhone(inv.InvigilatorID)}</p>
                                </div>
                                <CopyBtn text={mockPhone(inv.InvigilatorID)} />
                            </div>
                        </div>
                    </div>

                    {/* Account Controls */}
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Account Controls</p>
                        <div className="space-y-2">
                            <button onClick={() => { onToggleEligibility(inv.InvigilatorID); onClose(); }}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:shadow-sm ${
                                    inv.isEligible ? 'border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-700' : 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                }`}>
                                {inv.isEligible ? <UserMinus size={15} /> : <CheckCircle2 size={15} />}
                                <span className="text-sm font-semibold">{inv.isEligible ? 'Mark Ineligible' : 'Mark Eligible'}</span>
                            </button>
                            <button onClick={() => { onToggleFlag(inv.InvigilatorID); onClose(); }}
                                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all hover:shadow-sm ${
                                    inv.isFlagged ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700' : 'border-amber-100 bg-amber-50 hover:bg-amber-100 text-amber-700'
                                }`}>
                                <Flag size={15} />
                                <span className="text-sm font-semibold">{inv.isFlagged ? 'Remove Leave Flag' : 'Flag for Leave'}</span>
                            </button>
                            <button onClick={() => { onClose(); setTimeout(onDelete, 200); }}
                                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-rose-100 bg-rose-50 hover:bg-rose-100 text-rose-700 text-left transition-all hover:shadow-sm">
                                <Trash2 size={15} />
                                <span className="text-sm font-semibold">Remove Account</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

/* ═══════════════════════════════════════════════════════════ */

const Invigilators: React.FC = () => {
    const [invigilators,        setInvigilators]        = useState<Invigilator[]>([]);
    const [stats,               setStats]               = useState<InvigilatorStats>({ total: 0, active: 0, eligible: 0, onDuty: 0, flagged: 0 });
    const [pendingRequestsCount,setPendingRequestsCount] = useState(0);
    const [isLoading,           setIsLoading]           = useState(true);
    const [searchQuery,         setSearchQuery]         = useState('');
    const [selectedDept,        setSelectedDept]        = useState('');
    const [selectedStatus,      setSelectedStatus]      = useState('');
    const [page,                setPage]                = useState(1);
    const rowsPerPage = 10;

    const { isOpen: isAddOpen,    onOpen: onAddOpen,    onClose: onAddClose    } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onOpenDelete, onClose: onCloseDelete } = useDisclosure();
    const { isOpen: isBulkOpen,   onOpen: onBulkOpen,   onClose: onBulkClose  } = useDisclosure();
    const { isOpen: isReqOpen,    onOpen: onReqOpen,    onClose: onReqClose   } = useDisclosure();

    const [selected,     setSelected]     = useState<Invigilator | null>(null);
    const [drawerOpen,   setDrawerOpen]   = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /* ── data ─────────────────────────────────────────────── */
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [data, statData, requestsData] = await Promise.all([
                invigilatorService.getAll(),
                invigilatorService.getStats(),
                invigilatorService.getRequests(),
            ]);
            setInvigilators(data);
            setStats(statData);
            setPendingRequestsCount(requestsData.filter(r => r.Status === 'PENDING').length);
        } catch { toast.error('Failed to load invigilators'); }
        finally { setIsLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    /* ── actions ──────────────────────────────────────────── */
    const handleToggleFlag = async (id: number) => {
        try {
            const result = await invigilatorService.toggleFlag(id);
            setInvigilators(prev => prev.map(inv => inv.InvigilatorID === id ? { ...inv, isFlagged: result.isFlagged } : inv));
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

    const openProfile = (inv: Invigilator) => { setSelected(inv); setDrawerOpen(true); };

    /* ── derived ──────────────────────────────────────────── */
    const uniqueDepts = React.useMemo(() => {
        const s = new Set<string>();
        invigilators.forEach(inv => { if (inv.Department) s.add(inv.Department); });
        return Array.from(s).sort();
    }, [invigilators]);

    const filtered = invigilators.filter(inv => {
        const q = searchQuery.toLowerCase();
        const matchSearch = !q
            || inv.Name?.toLowerCase()?.includes(q)
            || inv.Designation?.toLowerCase()?.includes(q)
            || inv.Department?.toLowerCase()?.includes(q)
            || staffId(inv.InvigilatorID).includes(q);
        const matchDept   = !selectedDept   || inv.Department === selectedDept;
        const st          = resolveStatus(inv);
        const matchStatus = !selectedStatus || st === selectedStatus;
        return matchSearch && matchDept && matchStatus;
    });

    const pages     = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const pageItems = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const hasFilters = searchQuery || selectedDept || selectedStatus;

    /* ── export ───────────────────────────────────────────── */
    const exportCSV = () => {
        const rows = [
            ['Name', 'Staff ID', 'Designation', 'Department', 'Total Exams', 'Status'],
            ...filtered.map(inv => [inv.Name, staffId(inv.InvigilatorID), inv.Designation, inv.Department || '', inv.totalExams || 0, STATUS_CFG[resolveStatus(inv)].label]),
        ];
        const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'invigilators.csv' });
        a.click();
    };

    /* ═════════════════════════ RENDER ══════════════════════ */
    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>

            {/* ── Page Header ───────────────────────────────── */}
            <div className="bg-white border-b border-slate-200/70 sticky top-0 z-30">
                <div className="max-w-[1400px] mx-auto px-8 py-5">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
                                <Users size={18} className="text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold text-slate-900">Invigilator Management</h1>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{stats.total} registered</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">Staff Directory · Exam Duty Management</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            <button onClick={onReqOpen}
                                className="relative h-9 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                                <Activity size={14} />
                                Review Requests
                                {pendingRequestsCount > 0 && (
                                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center">
                                        <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60" />
                                        <span className="relative rounded-full bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 leading-none">
                                            {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                                        </span>
                                    </span>
                                )}
                            </button>
                            <button onClick={onBulkOpen}
                                className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                                <Upload size={14} /> Import
                            </button>
                            <button onClick={exportCSV}
                                className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                                Export CSV
                            </button>
                            <button onClick={onAddOpen}
                                className="h-9 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-900/20">
                                <UserPlus size={14} /> Add Invigilator
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto px-8 py-7 flex flex-col gap-6">

                {/* ── KPI Row ─────────────────────────────────── */}
                <div className="grid grid-cols-4 gap-4">
                    <KpiCard loading={isLoading} label="Total Registered" value={stats.total}   icon={<Briefcase size={19} className="text-slate-600" />}   accent="bg-slate-100" delta="All time" />
                    <KpiCard loading={isLoading} label="Active & Eligible" value={stats.eligible} icon={<ShieldCheck size={19} className="text-emerald-600" />} accent="bg-emerald-50" />
                    <KpiCard loading={isLoading} label="On Leave / Flagged" value={stats.flagged}  icon={<Clock size={19} className="text-amber-500" />}       accent="bg-amber-50" />
                    <KpiCard loading={isLoading} label="Departments" value={uniqueDepts.length} icon={<Building2 size={19} className="text-blue-600" />}     accent="bg-blue-50" />
                </div>

                {/* ── Search + Filter ──────────────────────────── */}
                <div className="bg-white border border-slate-200/70 rounded-2xl px-5 py-3 flex items-center gap-4 shadow-sm">
                    <div className="flex-1 flex items-center gap-2.5 min-w-0">
                        <Search size={15} className="text-slate-400 shrink-0" />
                        <input
                            id="searchQuery" name="searchQuery" autoComplete="off"
                            className="flex-1 text-sm text-slate-800 placeholder-slate-400 bg-transparent outline-none min-w-0"
                            placeholder="Search by name, ID, department…"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                        />
                        {searchQuery && (
                            <button onClick={() => { setSearchQuery(''); setPage(1); }} className="text-slate-300 hover:text-slate-600 shrink-0 transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="w-px h-5 bg-slate-200 shrink-0" />
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dept</span>
                        <div className="relative">
                            <select id="deptFilter" name="deptFilter"
                                className="text-sm font-semibold text-slate-700 bg-transparent outline-none appearance-none pr-5 cursor-pointer"
                                value={selectedDept} onChange={e => { setSelectedDept(e.target.value); setPage(1); }}>
                                <option value="">All</option>
                                {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown size={11} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="w-px h-5 bg-slate-200 shrink-0" />
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
                        <div className="relative">
                            <select id="statusFilter" name="statusFilter"
                                className="text-sm font-semibold text-slate-700 bg-transparent outline-none appearance-none pr-5 cursor-pointer"
                                value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}>
                                <option value="">All</option>
                                <option value="active">Active</option>
                                <option value="on-leave">On Leave</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <ChevronDown size={11} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    {hasFilters && (
                        <>
                            <div className="w-px h-5 bg-slate-200 shrink-0" />
                            <button onClick={() => { setSearchQuery(''); setSelectedDept(''); setSelectedStatus(''); setPage(1); }}
                                className="text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 shrink-0">
                                <X size={11} /> Clear
                            </button>
                        </>
                    )}
                    <span className="ml-auto text-xs text-slate-400 font-semibold shrink-0 bg-slate-50 px-2.5 py-1 rounded-lg">
                        {filtered.length} records
                    </span>
                </div>

                {/* ── Table ───────────────────────────────────── */}
                <div className="bg-white border border-slate-200/70 rounded-2xl overflow-hidden shadow-sm">

                    {/* Table head */}
                    <div className="grid items-center px-6 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white"
                        style={{ gridTemplateColumns: '2.2fr 0.9fr 1fr 1.8fr 0.9fr 1.1fr 56px' }}>
                        {['Invigilator', 'Staff ID', 'Department', 'Contact', 'Duty Load', 'Status', ''].map((h, i) => (
                            <span key={i} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">{h}</span>
                        ))}
                    </div>

                    {/* Body */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-28 gap-4">
                            <Spinner size="lg" classNames={{ circle1: 'border-b-slate-800', circle2: 'border-b-slate-300' }} />
                            <p className="text-sm text-slate-400 font-medium">Loading invigilators…</p>
                        </div>
                    ) : pageItems.length === 0 ? (
                        <div className="py-24 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Users size={26} className="text-slate-300" />
                            </div>
                            <p className="text-slate-600 font-bold text-base">No invigilators found</p>
                            <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
                            {hasFilters && (
                                <button onClick={() => { setSearchQuery(''); setSelectedDept(''); setSelectedStatus(''); }}
                                    className="mt-4 text-xs font-bold text-slate-500 hover:text-slate-900 underline transition-colors">
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    ) : (
                        pageItems.map((inv, idx) => {
                            const st = resolveStatus(inv);
                            const cfg = STATUS_CFG[st];
                            const ini = initials(inv.Name);
                            const grad = avatarGrad(inv.InvigilatorID);
                            const isLast = idx === pageItems.length - 1;

                            return (
                                <div key={inv.InvigilatorID}
                                    className={`grid items-center px-6 py-4 transition-all duration-150 hover:bg-slate-50/70 cursor-pointer group ${!isLast ? 'border-b border-slate-100' : ''}`}
                                    style={{ gridTemplateColumns: '2.2fr 0.9fr 1fr 1.8fr 0.9fr 1.1fr 56px' }}
                                    onClick={() => openProfile(inv)}
                                >
                                    {/* Invigilator */}
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                                            {ini}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[13px] font-bold text-slate-900 truncate group-hover:text-slate-700 transition-colors">{inv.Name}</p>
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{inv.Designation || 'Faculty'}</p>
                                        </div>
                                    </div>

                                    {/* Staff ID */}
                                    <div onClick={e => e.stopPropagation()}>
                                        <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg flex items-center gap-1 w-fit">
                                            {staffId(inv.InvigilatorID)}
                                            <CopyBtn text={staffId(inv.InvigilatorID)} />
                                        </span>
                                    </div>

                                    {/* Department */}
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                            <Building2 size={10} className="text-slate-400" />
                                            {inv.Department || '—'}
                                        </span>
                                    </div>

                                    {/* Contact */}
                                    <div className="min-w-0" onClick={e => e.stopPropagation()}>
                                        <a href={`mailto:${mockEmail(inv.Name)}`} className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-blue-600 transition-colors font-medium truncate">
                                            <Mail size={10} className="text-slate-300 shrink-0" />
                                            {mockEmail(inv.Name)}
                                        </a>
                                        <p className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                            <Phone size={10} className="shrink-0" />
                                            {mockPhone(inv.InvigilatorID)}
                                        </p>
                                    </div>

                                    {/* Duty Load */}
                                    <div className="pr-3">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-slate-700">{inv.totalExams ?? 0}</span>
                                                <span className="text-[9px] font-semibold text-slate-300">/ 10</span>
                                            </div>
                                            <div className="h-1 w-full max-w-[80px] bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${Math.min(100, ((inv.totalExams ?? 0) / 10) * 100)}%`,
                                                        background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                                                        minWidth: inv.totalExams ? '8px' : '0',
                                                    }}
                                                />
                                            </div>
                                            <span className="text-[9px] text-slate-300 font-medium leading-none">duties assigned</span>
                                        </div>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full border"
                                            style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
                                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.dot }} />
                                            {cfg.label}
                                        </span>
                                    </div>

                                    {/* Action menu */}
                                    <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                                        <ActionMenu menuId={`inv-${inv.InvigilatorID}`} items={[
                                            { key: 'view',   label: 'View Profile',   description: 'Full details & history',   icon: <Eye size={14} />,
                                              onClick: () => openProfile(inv) },
                                            { key: 'toggle', label: inv.isEligible ? 'Mark Ineligible' : 'Mark Eligible',
                                              description: inv.isEligible ? 'Disable duty access' : 'Enable duty access',
                                              icon: inv.isEligible ? <UserMinus size={14} /> : <CheckCircle2 size={14} />,
                                              warning: inv.isEligible,
                                              onClick: () => handleToggleEligibility(inv.InvigilatorID) },
                                            { key: 'flag',   label: inv.isFlagged ? 'Remove Leave Flag' : 'Flag for Leave',
                                              description: inv.isFlagged ? 'Remove leave status' : 'Put on leave',
                                              icon: <Flag size={14} />, warning: !inv.isFlagged,
                                              onClick: () => handleToggleFlag(inv.InvigilatorID) },
                                            { key: 'delete', label: 'Remove Account', description: 'Permanently remove',
                                              icon: <Trash2 size={14} />, danger: true,
                                              onClick: () => { setSelected(inv); onOpenDelete(); } },
                                        ]} />
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/40">
                        <span className="text-xs text-slate-400 font-semibold">
                            {filtered.length === 0 ? 'No results' : `Showing ${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, filtered.length)} of ${filtered.length}`}
                        </span>
                        {pages > 1 && (
                            <Pagination total={pages} page={page} onChange={setPage} showControls
                                classNames={{
                                    wrapper: 'gap-1',
                                    item: 'bg-white text-slate-600 font-bold text-xs w-8 h-8 min-w-[32px] border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50',
                                    cursor: 'bg-slate-900 text-white font-bold text-xs w-8 h-8 rounded-lg border-none shadow-md',
                                    prev: 'bg-white border border-slate-200 rounded-lg text-slate-500 shadow-sm',
                                    next: 'bg-white border border-slate-200 rounded-lg text-slate-500 shadow-sm',
                                }}
                            />
                        )}
                    </div>
                </div>

            </div>

            {/* ══════════════ PROFILE DRAWER ═════════════════ */}
            <ProfileDrawer
                inv={selected} open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onToggleEligibility={handleToggleEligibility}
                onToggleFlag={handleToggleFlag}
                onDelete={() => { setDrawerOpen(false); setTimeout(onOpenDelete, 250); }}
            />

            {/* ══════════════ MODALS ══════════════════════════ */}
            <AddInvigilatorModal isOpen={isAddOpen} onClose={onAddClose} onSuccess={fetchData} existingInvigilators={invigilators} />

            {/* Delete Confirm */}
            {isDeleteOpen && createPortal(
                <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 999998 }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCloseDelete} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-[420px] p-8 flex flex-col items-center text-center"
                        style={{ animation: 'amFadeScale .2s cubic-bezier(.16,1,.3,1)' }}>
                        <style>{`@keyframes amFadeScale{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}`}</style>
                        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-5 shadow-lg shadow-rose-50">
                            <Trash2 size={24} className="text-rose-500" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Invigilator?</h3>
                        <div className="mb-5">
                            <p className="text-sm text-slate-500 leading-relaxed">
                                This will permanently remove{' '}
                                <span className="font-bold text-slate-900">{selected?.Name}</span>{' '}
                                from the system.
                            </p>
                            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-rose-500 font-semibold bg-rose-50 rounded-xl px-4 py-2.5">
                                <AlertTriangle size={12} />
                                This action cannot be undone
                            </div>
                        </div>
                        <div className="flex gap-3 w-full">
                            <button onClick={onCloseDelete}
                                className="flex-1 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
                                Cancel
                            </button>
                            <button onClick={handleDelete} disabled={isSubmitting}
                                className="flex-1 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:from-rose-600 hover:to-rose-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                                {isSubmitting ? <><Spinner size="sm" color="white" /> Removing…</> : <><Trash2 size={14} /> Remove Account</>}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}


            {/* Bulk Import */}
            <BulkImportModal isOpen={isBulkOpen} onClose={onBulkClose} onSuccess={fetchData} />

            {/* Requests */}
            <RequestsModal isOpen={isReqOpen} onClose={onReqClose} onSuccess={fetchData} />
        </div>
    );
};

export default Invigilators;
