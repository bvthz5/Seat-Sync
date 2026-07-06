import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { 
    MapPin, 
    Building2, 
    Layers, 
    Clock, 
    Loader2,
    ShieldAlert,
    RefreshCcw,
    Calendar,
    ArrowLeft,
    Maximize,
    Minimize,
} from 'lucide-react';
import { studentPortalApi } from '../services/studentPortal';
import SeatingVisualization from '../components/SeatingVisualization';
import { useStudentTheme } from '../components/StudentThemeContext';

const StudentSeating: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const [searchParams] = useSearchParams();
    const isInternal = searchParams.get('isInternal') === 'true';
    const [seatingData, setSeatingData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { theme } = useStudentTheme();

    const fetchSeating = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await studentPortalApi.getSeating(examId, isInternal);
            
            if (res?.success === false) {
                setError(res.message || 'Seating records for this session are currently restricted or unavailable.');
                setSeatingData(res.data || null);
            } else if (!res || !res.data) {
                setError('Seating records for this session are currently restricted or unavailable.');
                setSeatingData(null);
            } else {
                setSeatingData(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch seating:', err);
            setError('Access restricted. Seating details are typically released 60 minutes before the exam.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeating();
    }, [examId]);

    const isDark = theme === 'dark';

    if (loading) {
        return (
            <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500 dark:text-indigo-400 mb-4" size={28} />
                <p className="text-indigo-600 dark:text-indigo-300/60 font-black uppercase tracking-[0.25em] text-[10px]">Assembling Seating Map...</p>
            </div>
        );
    }

    if (error && !seatingData?.exam) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[70vh] p-6">
                <div className={`max-w-lg w-full rounded-3xl border p-12 text-center shadow-2xl backdrop-blur-xl transition-all duration-500 relative overflow-hidden ${
                    isDark ? 'bg-[#131B2F]/95 border-slate-800/70 shadow-[0_8px_30px_rgb(0,0,0,0.6)]' : 'bg-white/90 border-slate-200'
                }`}>
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none" />
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />
                    
                    <div className="relative z-10">
                        <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 border shadow-lg ${
                            isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-600'
                        }`}>
                            <ShieldAlert size={36} strokeWidth={1.5} />
                        </div>
                        <h2 className={`text-3xl font-black mb-3 tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            Access Restricted
                        </h2>
                        <p className={`mb-10 text-sm font-semibold leading-relaxed max-w-sm mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {error}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link to="/student/dashboard" className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]">
                                Return to Dashboard
                            </Link>
                            <button onClick={fetchSeating} className={`w-full sm:w-auto p-3.5 rounded-xl border flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all group ${
                                isDark ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900' : 'border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50'
                            }`}>
                                <RefreshCcw size={14} className="group-active:rotate-180 transition-transform duration-500" />
                                <span>Reload</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { exam, assignment, layout } = seatingData || {};

    return (
        <div className="space-y-8 flex flex-col justify-start h-full w-full max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <Link to="/student/exams" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-black uppercase tracking-wider text-[9px] transition-colors mt-1.5 shrink-0">
                        <ArrowLeft size={14} /> Back
                    </Link>
                    <div className={`hidden sm:block w-px h-8 mt-0.5 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
                    <div>
                        <h1 className={`text-3xl font-black tracking-tight transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Assignment Matrix</h1>
                        <p className={`text-sm font-bold mt-1.5 uppercase tracking-wide transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{exam?.subject || 'Direct Assignment'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Verified Record</span>
                </div>
            </header>

            {error ? (
                <div className={`rounded-3xl border p-10 text-center shadow-xl backdrop-blur-xl transition-colors duration-500 ${
                    isDark ? 'bg-[#131B2F]/90 border-slate-800/70 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-slate-200'
                }`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 border ${
                        isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                        <Clock size={24} />
                    </div>
                    <h3 className={`text-lg font-black mb-2 uppercase tracking-wide transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Seating Schedule Restrained</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-semibold max-w-sm mx-auto leading-relaxed text-xs mb-6">
                        {error}
                    </p>
                    <button onClick={fetchSeating} className={`inline-flex items-center gap-2 px-5 py-3 border rounded-xl font-black uppercase tracking-wider text-[9px] transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm'}`}>
                        <RefreshCcw size={13} /> Try Reloading
                    </button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-[380px_1fr] gap-8 items-start">
                    {/* LEFT Column: Exam Location Details */}
                    <div className="space-y-6">
                        <section className={`rounded-3xl border p-8 space-y-8 shadow-xl backdrop-blur-xl transition-colors duration-500 ${
                            isDark ? 'bg-[#131B2F]/90 border-slate-800/70 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-slate-200'
                        }`}>
                            <div>
                                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-5">Exam Metadata</h3>
                                <div className="space-y-5">
                                    <InfoItem icon={Calendar} label="Official Date" value={exam?.dateLabel} isDark={isDark} />
                                    <InfoItem icon={Clock} label="Session & Duration" value={`${exam?.session} • ${exam?.duration || 180} Mins`} isDark={isDark} />
                                </div>
                            </div>

                            <div className={`pt-6 border-t ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`}>
                                <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-5">Global Location</h3>
                                <div className="space-y-5">
                                    <InfoItem icon={Building2} label="Institutional Block" value={assignment?.blockName || 'Pending'} isDark={isDark} />
                                    <InfoItem icon={Layers} label="Floor Assignment" value={assignment?.floorName || 'Pending'} isDark={isDark} />
                                    <InfoItem icon={MapPin} label="Examination Hall" value={assignment?.roomCode || 'Allocating...'} color="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20" isDark={isDark} />
                                </div>
                            </div>

                            <div className={`pt-6 border-t ${isDark ? 'border-slate-800/50' : 'border-slate-100'}`}>
                                <div className={`rounded-2xl p-4 flex gap-4 border transition-colors duration-500 ${
                                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                                }`}>
                                    <ShieldAlert size={20} className="text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className={`text-[9px] font-black uppercase tracking-wider mb-1 transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Gate Instructions</p>
                                        <p className={`text-[11px] font-semibold leading-relaxed transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            Present Physical ID Card. Reporting starts 30 minutes prior to session launch.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT Column: Visual Layout & Seat details */}
                    <div className="space-y-6">
                        {/* Highlights Row Cards */}
                        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                            <SeatCard label="SEAT NUMBER" value={assignment?.seatNumber || '-'} highlight isDark={isDark} />
                            <SeatCard label="ROW" value={assignment?.rowLabel || '-'} isDark={isDark} />
                            <SeatCard label="BENCH" value={assignment?.benchNumber || '-'} isDark={isDark} />
                        </section>

                        {/* Top Down Visualization Map */}
                        <section className={`rounded-3xl border p-6 sm:p-8 shadow-xl backdrop-blur-xl relative overflow-hidden transition-colors duration-500 ${
                            isDark ? 'bg-[#131B2F]/90 border-slate-800/70 shadow-[0_8px_30px_rgb(0,0,0,0.5)]' : 'bg-white border-slate-200'
                        }`}>
                            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                                <div>
                                    <h3 className={`text-lg font-black tracking-tight uppercase transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Room Layout Profile</h3>
                                    <p className="text-slate-500 text-[9px] font-black mt-1 uppercase tracking-widest">Orientation Hall {assignment?.roomCode}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsFullscreen(true)} className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border transition-all duration-300 ${
                                        isDark 
                                            ? 'text-indigo-400 hover:text-indigo-300 bg-slate-900/60 hover:bg-slate-900 border-slate-800' 
                                            : 'text-indigo-600 hover:text-indigo-800 bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-sm'
                                    }`}>
                                        <Maximize size={12} /> Full Screen
                                    </button>
                                    <button onClick={fetchSeating} className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border transition-all duration-300 ${
                                        isDark 
                                            ? 'text-indigo-400 hover:text-indigo-300 bg-slate-900/60 hover:bg-slate-900 border-slate-800' 
                                            : 'text-indigo-600 hover:text-indigo-800 bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-sm'
                                    }`}>
                                        <RefreshCcw size={12} /> Update Sync
                                    </button>
                                </div>
                            </div>
                            
                            {/* Layout Wrapper with full screen width limit */}
                            <div className={`rounded-2xl border p-6 sm:p-10 shadow-inner flex items-center justify-center overflow-x-auto w-full transition-colors duration-500 ${
                                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                            }`}>
                                <div className="min-w-fit w-full flex justify-center">
                                    <SeatingVisualization layout={layout} mySeat={assignment} isDark={isDark} />
                                </div>
                            </div>

                            {/* Legend Panel */}
                            <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 px-2">
                                <div className="flex flex-wrap items-center gap-6">
                                    <LegendItem color="bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]" label="Active Seat" />
                                    <LegendItem color={`bg-transparent border border-dashed ${isDark ? 'border-slate-800' : 'border-slate-300'}`} label="Vacant Slot" />
                                </div>
                                <div className={`px-3 py-1 border rounded-lg shrink-0 transition-colors duration-500 ${
                                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
                                }`}>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Perspective: Top-Down view</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {/* Full Screen Overlay Modal */}
            {isFullscreen && (
                <div className={`fixed inset-0 z-50 flex flex-col p-6 sm:p-12 transition-colors duration-500 ${
                    isDark ? 'bg-[#0C1220]/95 backdrop-blur-xl' : 'bg-white/95 backdrop-blur-xl'
                }`}>
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className={`text-2xl font-black tracking-tight uppercase transition-colors duration-500 ${isDark ? 'text-white' : 'text-slate-800'}`}>Full Room Layout</h3>
                            <p className="text-slate-500 text-[10px] font-black mt-1 uppercase tracking-widest">{assignment?.roomCode}</p>
                        </div>
                        <button onClick={() => setIsFullscreen(false)} className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-xl border transition-all duration-300 ${
                            isDark 
                                ? 'text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20' 
                                : 'text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-200 shadow-sm'
                        }`}>
                            <Minimize size={14} /> Exit Full Screen
                        </button>
                    </div>
                    
                    <div className={`flex-1 rounded-3xl border shadow-inner flex items-center justify-center overflow-auto p-4 sm:p-10 transition-colors duration-500 ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                        <div className="min-w-fit w-full flex items-center justify-center h-full">
                            <SeatingVisualization layout={layout} mySeat={assignment} isDark={isDark} />
                        </div>
                    </div>
                    
                    <div className="mt-8 flex justify-center gap-8">
                        <LegendItem color="bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]" label="Active Seat" />
                        <LegendItem color={`bg-transparent border border-dashed ${isDark ? 'border-slate-800' : 'border-slate-300'}`} label="Vacant Slot" />
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoItem = ({ icon: Icon, label, value, color, isDark }: any) => (
    <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
            color || (isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-500 shadow-sm')
        }`}>
            <Icon size={16} />
        </div>
        <div className="min-w-0">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
            <p className={`text-sm font-extrabold truncate transition-colors duration-500 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{value || '—'}</p>
        </div>
    </div>
);

const SeatCard = ({ label, value, highlight, isDark }: any) => (
    <div className={`p-5 sm:p-6.5 rounded-3xl text-center border transition-all duration-300 group relative overflow-hidden ${
        highlight 
            ? isDark 
                ? 'bg-slate-900 border-slate-800 shadow-lg text-white' 
                : 'bg-indigo-600 border-indigo-500 shadow-lg text-white'
            : isDark 
                ? 'bg-[#0C1220]/80 border-slate-800/80 text-slate-200 shadow-md' 
                : 'bg-white border-slate-200 text-slate-800 shadow-sm'
    }`}>
        <p className={`text-[8px] font-black uppercase tracking-[0.3em] mb-2 relative z-10 ${
            highlight ? (isDark ? 'text-indigo-400' : 'text-indigo-200') : 'text-slate-500'
        }`}>{label}</p>
        <p className="text-2xl sm:text-3xl font-black relative z-10">{value}</p>
    </div>
);

const LegendItem = ({ color, label }: any) => (
    <div className="flex items-center gap-2">
        <div className={`w-3.5 h-3.5 rounded-lg shrink-0 ${color}`} />
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
);

export default StudentSeating;
