import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Search, 
    Calendar, 
    MapPin, 
    ChevronRight, 
    ArrowUpRight,
    Loader2,
    CalendarDays,
    ArrowRight,
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { studentPortalApi } from '../services/studentPortal';

const StudentExams: React.FC = () => {
    const navigate = useNavigate();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const data = await studentPortalApi.getUpcomingExams();
                setExams(data);
            } catch (err) {
                console.error('Failed to fetch exams:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();

        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const filteredExams = exams.filter(exam => 
        exam.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isSeatingEnabled = (examDate: string, session: string) => {
        const examStartTime = new Date(examDate);
        if (session.toLowerCase().includes('forenoon') || session.toLowerCase().includes('fn')) {
            examStartTime.setHours(9, 30, 0);
        } else {
            examStartTime.setHours(13, 30, 0);
        }
        
        const oneHourBefore = new Date(examStartTime.getTime() - 60 * 60 * 1000);
        return now >= oneHourBefore;
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium tracking-wide">Syncing exam registrations...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Exam Schedule</h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">View and manage your upcoming registered sessions.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by subject or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 shadow-sm"
                    />
                </div>
            </header>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                            <tr className="border-b border-slate-200">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Subject Details</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date & Session</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Duration</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredExams.length > 0 ? (
                                filteredExams.map((exam, i) => {
                                    const seatingEnabled = isSeatingEnabled(exam.date, exam.session);
                                    return (
                                        <motion.tr 
                                            key={exam.examId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="hover:bg-slate-50/40 transition-colors group"
                                        >
                                            <td className="px-8 py-6">
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{exam.subject}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{exam.subjectCode}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div>
                                                    <p className="font-bold text-slate-700 text-sm">
                                                        {new Date(exam.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{exam.session}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                    {exam.duration}m
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                                        exam.status === 'Today' ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'
                                                    }`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                                                        exam.status === 'Today' ? 'text-indigo-700' : 'text-slate-500'
                                                    }`}>{exam.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => seatingEnabled && navigate(`/student/seating/${exam.examId}`)}
                                                        disabled={!seatingEnabled}
                                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            seatingEnabled 
                                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 transform active:scale-95' 
                                                                : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                                        }`}
                                                    >
                                                        <MapPin size={14} />
                                                        Seating
                                                    </button>
                                                    <button 
                                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                                                        title="View Subject Details"
                                                    >
                                                        <ArrowRight size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
                                                <CalendarDays size={32} />
                                            </div>
                                            <p className="text-slate-400 font-bold tracking-tight">No exam records found for the current query.</p>
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

export default StudentExams;
