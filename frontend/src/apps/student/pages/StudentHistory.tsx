import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    History, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Loader2,
    Download,
    Search
} from 'lucide-react';
import { studentPortalApi } from '../services/studentPortal';
import { useStudentTheme } from '../components/StudentThemeContext';

const StudentHistory: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { theme } = useStudentTheme();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await studentPortalApi.getHistory();
                setHistory(data);
            } catch (err) {
                console.error('Failed to fetch history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filteredHistory = history.filter(exam => 
        exam.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500 dark:text-indigo-400 mb-4" size={28} />
                <p className="text-indigo-600 dark:text-indigo-300/60 font-black uppercase tracking-[0.25em] text-[10px]">Retrieving Records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 flex flex-col justify-start h-full w-full max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Exam History</h1>
                    <p className={`text-sm mt-1.5 font-semibold transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Review your past performance and attendance logs.</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:flex-initial group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full md:w-64 pl-11 pr-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-semibold shadow-sm text-sm ${
                                isDark 
                                    ? 'bg-slate-900/80 border-slate-800 shadow-inner text-slate-200 focus:bg-slate-900' 
                                    : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                            }`}
                        />
                    </div>
                    {/* Export */}
                    <button className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                        <Download size={14} /> Export
                    </button>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Completed" value={String(history.length)} icon={CheckCircle2} color="text-emerald-500 dark:text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" isDark={isDark} />
                <StatCard label="Missed" value="0" icon={XCircle} color="text-rose-500 dark:text-rose-400" bg="bg-rose-500/10 border-rose-500/20" isDark={isDark} />
                <StatCard label="Attendance" value={history.length > 0 ? "100%" : "—"} icon={Clock} color="text-indigo-500 dark:text-indigo-400" bg="bg-indigo-500/10 border-indigo-500/20" isDark={isDark} />
                <StatCard label="Credits" value="18.5" icon={History} color="text-amber-500 dark:text-amber-400" bg="bg-amber-500/10 border-amber-500/20" isDark={isDark} />
            </div>

            {/* Desktop Table View */}
            <div className={`rounded-3xl border overflow-hidden shadow-2xl backdrop-blur-xl transition-colors duration-500 ${
                isDark ? 'bg-[#131B2F]/90 border-slate-800/70 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-slate-200'
            }`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b transition-colors duration-500 ${isDark ? 'bg-slate-900/60 border-slate-800/60' : 'bg-slate-50 border-slate-100'}`}>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Exam Details</th>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Date & Session</th>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Attendance</th>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y transition-colors duration-500 ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                            {filteredHistory.length > 0 ? (
                                filteredHistory.map((exam, i) => (
                                    <tr key={exam.examId} className={`group transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <p className={`font-extrabold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{exam.subject}</p>
                                                {exam.isInternal && (
                                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 dark:text-purple-400 text-[8px] font-black uppercase border border-purple-500/20">INT</span>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-black text-slate-500 mt-1 uppercase tracking-widest">{exam.subjectCode}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className={`text-sm font-extrabold transition-colors duration-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {new Date(exam.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{exam.session} Session</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                {exam.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className={`flex items-center gap-2 text-xs font-semibold transition-colors duration-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {exam.attendanceStatus === 'Present' ? (
                                                    <CheckCircle2 size={15} className="text-emerald-500 dark:text-emerald-400" />
                                                ) : (
                                                    <XCircle size={15} className="text-rose-500 dark:text-rose-400" />
                                                )}
                                                <span className={exam.attendanceStatus === 'Present' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}>
                                                    {exam.attendanceStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button className="text-[9px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline underline-offset-4">
                                                View Report
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-14 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center mb-4 ${
                                                isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                                            }`}>
                                                <History size={20} />
                                            </div>
                                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No history logs synced</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color, bg, isDark }: any) => (
    <div className={`p-6 rounded-3xl border shadow-lg flex items-center gap-5 group cursor-default transition-all duration-500 ${
        isDark 
            ? 'bg-[#0C1220]/75 border-slate-800/85' 
            : 'bg-white border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.02)]'
    }`}>
        <div className={`${bg} ${color} w-13 h-13 rounded-2xl flex items-center justify-center border shadow-inner transition-transform duration-500 group-hover:rotate-3`}>
            <Icon size={20} />
        </div>
        <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">{label}</p>
            <h4 className={`text-2xl font-black mt-1 transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</h4>
        </div>
    </div>
);

export default StudentHistory;
