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
                const data = await studentPortalApi.getExams();
                setExams(data);
            } catch (err) {
                console.error('Failed to fetch exams:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchExams();

        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    const filteredExams = exams.filter(exam => 
        exam.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Accessing Timetable Records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-20 px-4 sm:px-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Examination Schedule</h1>
                    <p className="text-slate-500 text-sm mt-1 font-semibold">Your registered papers and real-time status tracking.</p>
                </div>
                <div className="relative w-full md:w-96 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-2xl blur opacity-0 group-hover:opacity-10 transition duration-500"></div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Filter by subject or course code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
                        />
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Subject Profile</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chronology</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Window</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Operational Status</th>
                                <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-right">Interaction</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredExams.length > 0 ? (
                                filteredExams.map((exam, i) => {
                                    const seatingEnabled = exam.isSeatingVisible;
                                    const isToday = new Date(exam.startTime).toDateString() === now.toDateString();
                                    
                                    return (
                                        <motion.tr 
                                            key={exam.examId}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="hover:bg-slate-50/40 transition-colors group"
                                        >
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <p className="font-black text-slate-900 text-base group-hover:text-indigo-600 transition-colors">{exam.subject}</p>
                                                    <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">{exam.subjectCode}</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex flex-col">
                                                    <p className="font-black text-slate-700 text-sm">{exam.dateLabel}</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{exam.session}</p>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                                                    {exam.duration}m
                                                </span>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${
                                                        exam.status === 'LIVE' 
                                                            ? 'bg-emerald-500 animate-ping' 
                                                            : isToday ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'
                                                    }`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                                                        exam.status === 'LIVE' ? 'text-emerald-600' : isToday ? 'text-indigo-700' : 'text-slate-500'
                                                    }`}>
                                                        {exam.status === 'UPCOMING' && isToday ? 'TODAY' : exam.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                <div className="flex items-center justify-end gap-4">
                                                    <button
                                                        onClick={() => seatingEnabled && navigate(`/student/seating/${exam.examId}`)}
                                                        className={`flex items-center gap-3 px-6 py-3.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                                            seatingEnabled 
                                                                ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-200 hover:shadow-indigo-100 transform hover:-translate-y-0.5 active:scale-95' 
                                                                : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                                        }`}
                                                    >
                                                        <MapPin size={16} />
                                                        {seatingEnabled ? 'SEATING' : 'LOCKED'}
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                                                <CalendarDays size={40} />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight">No Records Synced</h3>
                                            <p className="text-slate-400 font-bold text-sm mt-2">Adjust your filter or check back later for updates.</p>
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
