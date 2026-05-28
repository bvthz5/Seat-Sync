import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Search, 
    Calendar, 
    MapPin, 
    ChevronRight, 
    Loader2,
    CalendarDays,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { studentPortalApi } from '../services/studentPortal';
import { useStudentTheme } from '../components/StudentThemeContext';

const StudentExams: React.FC = () => {
    const navigate = useNavigate();
    const { theme } = useStudentTheme();
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

    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500 dark:text-indigo-400 mb-4" size={28} />
                <p className="text-indigo-600 dark:text-indigo-300/60 font-black uppercase tracking-[0.25em] text-[10px]">Syncing Schedule...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 flex flex-col justify-start h-full w-full max-w-7xl mx-auto">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className={`text-3xl font-black tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Registered Papers</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-semibold">Your exam schedule and real-time seating availability.</p>
                </div>
                
                {/* Search Bar */}
                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search by course code or title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-semibold shadow-sm text-sm ${
                            isDark 
                                ? 'bg-slate-900/80 border-slate-800 shadow-inner text-slate-200 focus:bg-slate-900' 
                                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
                        }`}
                    />
                </div>
            </header>

            {/* Desktop Timetable Grid */}
            <div className={`rounded-3xl border overflow-hidden shadow-2xl backdrop-blur-xl transition-colors duration-500 ${
                isDark ? 'bg-[#131B2F]/90 border-slate-800/70 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-slate-200'
            }`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b transition-colors duration-500 ${isDark ? 'bg-slate-900/60 border-slate-800/60' : 'bg-slate-50 border-slate-100'}`}>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Subject Details</th>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Chronology</th>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Duration</th>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500">Operational Status</th>
                                <th className="px-8 py-4.5 text-[9px] font-black uppercase tracking-wider text-slate-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y transition-colors duration-500 ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                            {filteredExams.length > 0 ? (
                                filteredExams.map((exam, i) => {
                                    const seatingEnabled = exam.isSeatingVisible;
                                    const isToday = new Date(exam.startTime).toDateString() === now.toDateString();
                                    
                                    return (
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
                                                <p className={`text-sm font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{exam.dateLabel}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{exam.session} Session</p>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                    {exam.duration} MINS
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`relative flex h-2 w-2 ${exam.status === 'LIVE' || isToday ? 'block' : 'hidden'}`}>
                                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                                            exam.status === 'LIVE' ? 'bg-emerald-400' : 'bg-indigo-400'
                                                        }`}></span>
                                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                                            exam.status === 'LIVE' ? 'bg-emerald-500' : 'bg-indigo-500'
                                                        }`}></span>
                                                    </span>
                                                    <span className={`text-[9px] font-black uppercase tracking-wider ${
                                                        exam.status === 'LIVE' ? 'text-emerald-500 dark:text-emerald-400' : isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                                                    }`}>
                                                        {exam.status === 'UPCOMING' && isToday ? 'TODAY' : exam.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => seatingEnabled && navigate(`/student/seating/${exam.examId}${exam.isInternal ? '?isInternal=true' : ''}`)}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                                                        seatingEnabled 
                                                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] shadow-md' 
                                                            : isDark 
                                                                ? 'bg-[#0E1526] text-slate-600 cursor-not-allowed border border-slate-800' 
                                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                                    }`}
                                                >
                                                    <MapPin size={12} />
                                                    {seatingEnabled ? 'SEATING' : 'LOCKED'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-14 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center mb-4 ${
                                                isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                                            }`}>
                                                <CalendarDays size={20} />
                                            </div>
                                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No matching papers found</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Timetable Layout */}
            <div className="md:hidden space-y-4">
                {filteredExams.length > 0 ? (
                    filteredExams.map((exam) => {
                        const seatingEnabled = exam.isSeatingVisible;
                        const isToday = new Date(exam.startTime).toDateString() === now.toDateString();
                        
                        return (
                            <div key={exam.examId} className={`rounded-3xl border p-6 space-y-5 shadow-lg backdrop-blur-xl transition-colors duration-500 ${
                                isDark ? 'bg-[#131B2F]/90 border-slate-800/70 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-slate-200'
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className={`font-extrabold text-[15px] transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{exam.subject}</h4>
                                            {exam.isInternal && (
                                                <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 dark:text-purple-400 text-[8px] font-black uppercase border border-purple-500/20">INT</span>
                                            )}
                                        </div>
                                        <p className="text-[9px] font-black text-slate-500 mt-1 uppercase tracking-widest">{exam.subjectCode}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0 ${
                                        exam.status === 'LIVE' 
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                            : isToday
                                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                                : isDark ? 'bg-slate-900 text-slate-500 border-slate-800' : 'bg-slate-55 border-slate-200 text-slate-500'
                                    }`}>
                                        {isToday ? 'TODAY' : exam.status}
                                    </span>
                                </div>

                                <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl border text-xs transition-colors duration-500 ${
                                    isDark ? 'bg-slate-900/40 border-slate-800/60' : 'bg-slate-50 border-slate-100'
                                }`}>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Chronology</p>
                                        <p className={`font-extrabold mt-1 text-[13px] transition-colors duration-500 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{exam.dateLabel}</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{exam.session} Session</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Duration</p>
                                        <p className="font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 text-[13px]">{exam.duration} Mins</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => seatingEnabled && navigate(`/student/seating/${exam.examId}${exam.isInternal ? '?isInternal=true' : ''}`)}
                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                                        seatingEnabled 
                                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] shadow-md' 
                                            : isDark 
                                                ? 'bg-[#0E1526] text-slate-600 cursor-not-allowed border border-slate-800' 
                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    }`}
                                >
                                    <MapPin size={12} />
                                    {seatingEnabled ? 'VIEW SEATING DETAILS' : 'SEATING ASSIGNMENT LOCKED'}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className={`py-14 text-center border border-dashed rounded-3xl transition-colors duration-500 ${
                        isDark ? 'bg-[#0C1220]/40 border-slate-800/80' : 'bg-white border-slate-200'
                    }`}>
                        <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                            isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                            <CalendarDays size={20} />
                        </div>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No papers registered</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentExams;
