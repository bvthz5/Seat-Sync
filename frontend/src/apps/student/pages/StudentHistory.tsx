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

const StudentHistory: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium">Retrieving exam history...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Exam <span className="text-indigo-600">History</span></h2>
                    <p className="text-slate-500 mt-1 font-medium">Review your past performance and attendance records.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search history..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all">
                        <Download size={18} /> Export
                    </button>
                </div>
            </header>

            <div className="grid lg:grid-cols-4 gap-6">
                <StatCard label="Completed" value={String(history.length)} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard label="Missed" value="0" icon={XCircle} color="text-rose-600" bg="bg-rose-50" />
                <StatCard label="Attendance" value="100%" icon={Clock} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard label="Credits" value="18.5" icon={History} color="text-amber-600" bg="bg-amber-50" />
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mt-8">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Exam Details</th>
                                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Date & Session</th>
                                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</th>
                                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Attendance</th>
                                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredHistory.map((exam, i) => (
                                <motion.tr 
                                    key={exam.examId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="hover:bg-slate-50/50 transition-colors group"
                                >
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{exam.subject}</p>
                                            <p className="text-xs text-slate-400 font-bold mt-0.5">{exam.subjectCode}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700">
                                                {new Date(exam.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{exam.session}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                            {exam.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            {exam.attendanceStatus === 'Present' ? (
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                            ) : (
                                                <XCircle size={16} className="text-rose-500" />
                                            )}
                                            <span className={`text-sm font-bold ${
                                                exam.attendanceStatus === 'Present' ? 'text-emerald-600' : 'text-rose-600'
                                            }`}>
                                                {exam.attendanceStatus}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 underline underline-offset-4">
                                            View Report
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon: Icon, color, bg }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
        <div className={`${bg} ${color} w-12 h-12 rounded-2xl flex items-center justify-center`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{label}</p>
            <h4 className="text-2xl font-black text-slate-900">{value}</h4>
        </div>
    </div>
);

export default StudentHistory;
