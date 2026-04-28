
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Calendar,
    Search,
    Filter,
    Clock,
    Shield,
    User,
    FileText,
    Download,
    CheckCircle,
    AlertTriangle,
    XCircle,
    ChevronLeft,
    ChevronRight,
    SearchX
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminManagementService } from '../services/adminManagementService';

interface AdminActivityDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    admin: {
        UserID: number;
        Email: string;
        FullName: string | null;
        Role: string;
        IsRootAdmin: boolean;
        IsActive: boolean;
    } | null;
}

interface ActivityLog {
    LogID: number;
    Action: string;
    Details: string;
    Timestamp: string;
    IPAddress?: string;
    UserAgent?: string;
    EntityType?: string;
}

const AdminActivityDrawer: React.FC<AdminActivityDrawerProps> = ({ isOpen, onClose, admin }) => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [search, setSearch] = useState('');
    const [type, setType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    useEffect(() => {
        if (isOpen && admin) {
            fetchLogs();
        } else {
            // Reset state on close
            setLogs([]);
            setPage(1);
            setSearch('');
            setType('');
            setStartDate('');
            setEndDate('');
        }
    }, [isOpen, admin, page, type, startDate, endDate]); // Trigger fetch on filter change

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen && admin) fetchLogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchLogs = async () => {
        if (!admin) return;
        try {
            setLoading(true);
            const response = await AdminManagementService.getActivity(admin.UserID, {
                page,
                limit: LIMIT,
                search,
                type,
                startDate,
                endDate
            });
            setLogs(response.data.logs);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error("Failed to fetch logs", error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('login') || lower.includes('logout')) return <User size={16} className="text-blue-600" />;
        if (lower.includes('exam')) return <FileText size={16} className="text-purple-600" />;
        if (lower.includes('seating')) return <Shield size={16} className="text-amber-600" />;
        if (lower.includes('student')) return <User size={16} className="text-green-600" />;
        if (lower.includes('download') || lower.includes('report')) return <Download size={16} className="text-indigo-600" />;
        if (lower.includes('delete') || lower.includes('disable')) return <AlertTriangle size={16} className="text-red-600" />;
        if (lower.includes('create') || lower.includes('enable')) return <CheckCircle size={16} className="text-teal-600" />;
        return <ActivityIcon size={16} className="text-slate-600" />;
    };

    const ActivityIcon = ({ size, className }: any) => (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
    );

    const getStatusColor = (action: string) => {
        const lower = action.toLowerCase();
        if (lower.includes('failed') || lower.includes('error')) return 'bg-red-50 border-red-100 text-red-700';
        if (lower.includes('delete') || lower.includes('disable')) return 'bg-orange-50 border-orange-100 text-orange-700';
        if (lower.includes('login')) return 'bg-blue-50 border-blue-100 text-blue-700';
        return 'bg-slate-50 border-slate-100 text-slate-700';
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-[50px] bottom-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-white z-10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                                    <ActivityIcon size={24} className="text-blue-600" />
                                    Activity Log
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* User Profile Summary */}
                            {admin && (
                                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
                                        {admin.FullName ? admin.FullName.charAt(0).toUpperCase() : admin.Email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">{admin.FullName || 'Admin User'}</h3>
                                        <p className="text-sm text-slate-500">{admin.Email}</p>
                                    </div>
                                    <div className="ml-auto">
                                        {admin.IsRootAdmin ? (
                                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                                                Root Admin
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                                                Exam Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Filters */}
                        <div className="p-4 bg-white border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-3 sticky top-0 z-10 shadow-sm">
                            <div className="col-span-2 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    name="activity-search"
                                    id="activity-search"
                                    placeholder="Search activity..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="relative">
                                <select
                                    name="activity-type"
                                    id="activity-type"
                                    value={type}
                                    onChange={(e) => { setType(e.target.value); setPage(1); }}
                                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                    <option value="">All Types</option>
                                    <option value="Login">Login / Auth</option>
                                    <option value="Exam">Exams</option>
                                    <option value="Seating">Seating</option>
                                    <option value="Student">Students</option>
                                </select>
                                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="activity-date"
                                    id="activity-date"
                                    value={startDate}
                                    onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                    className="w-full pl-3 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-full space-y-3">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                                    <p className="text-slate-400 text-sm">Loading activity logs...</p>
                                </div>
                            ) : !logs || logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                                        <SearchX size={32} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-slate-800 font-medium">No activity found</h4>
                                        <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search terms</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-200">
                                    {logs.map((log) => (
                                        <motion.div
                                            key={log.LogID}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="relative pl-12 group"
                                        >
                                            {/* Timeline Dot */}
                                            <div className="absolute left-0 top-1.5 w-10 h-10 bg-white rounded-full border-2 border-slate-100 flex items-center justify-center z-10 shadow-sm group-hover:border-blue-200 group-hover:scale-110 transition-all duration-300">
                                                {getActionIcon(log.Action)}
                                            </div>

                                            {/* Card */}
                                            <div className={`p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow ${getStatusColor(log.Action)} bg-opacity-10 border-opacity-50`}>
                                                <div className="flex items-start justify-between gap-4">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-800 text-sm">{log.Action}</h4>
                                                        <p className="text-slate-600 text-sm mt-1 mb-2">{log.Details}</p>

                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                <Clock size={12} />
                                                                {format(new Date(log.Timestamp), 'PPp')}
                                                            </span>
                                                            {log.IPAddress && (
                                                                <span className="font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                                                    IP: {log.IPAddress}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer / Pagination */}
                        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <span className="text-sm text-slate-500">
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AdminActivityDrawer;
