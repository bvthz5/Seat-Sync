import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { 
    ChevronLeft, 
    MapPin, 
    Building2, 
    Layers, 
    Clock, 
    Loader2,
    ShieldAlert,
    RefreshCcw,
    Calendar,
    ArrowLeft,
} from 'lucide-react';
import { studentPortalApi } from '../services/studentPortal';
import SeatingVisualization from '../components/SeatingVisualization';

const StudentSeating: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const [searchParams] = useSearchParams();
    const isInternal = searchParams.get('isInternal') === 'true';
    const [seatingData, setSeatingData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSeating = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await studentPortalApi.getSeating(examId, isInternal);
            
            // Check for visibility restriction from backend
            if (res?.visibilityError) {
                setError(res.message);
                setSeatingData(res.data);
            } else if (!res) {
                setError('Seating records for this session are currently restricted or unavailable.');
            } else {
                setSeatingData(res);
            }
        } catch (err) {
            console.error('Failed to fetch seating:', err);
            setError('Access restricted. Seating details are typically released 45 minutes before the exam.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeating();
    }, [examId]);

    if (loading) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Configuring Seating Matrix...</p>
            </div>
        );
    }

    if (error && !seatingData?.exam) {
        return (
            <div className="max-w-xl mx-auto py-24 text-center px-6">
                <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-inner border border-rose-100">
                    <ShieldAlert size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Access Control Active</h2>
                <p className="text-slate-500 mb-10 font-semibold leading-relaxed">
                    {error}
                </p>
                <div className="flex items-center justify-center gap-4">
                    <Link to="/student/dashboard" className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                        Back to Dashboard
                    </Link>
                    <button onClick={fetchSeating} className="p-5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all group">
                        <RefreshCcw size={20} className="group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>
        );
    }

    const { exam, assignment, layout } = seatingData || {};

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-24 px-4 sm:px-6">
            {/* Professional Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                    <Link to="/student/exams" className="flex items-center gap-3 text-slate-400 hover:text-indigo-600 font-black uppercase tracking-widest text-[10px] transition-colors">
                        <ArrowLeft size={18} />
                        Schedule
                    </Link>
                    <div className="w-px h-8 bg-slate-200" />
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Assignment Matrix</h1>
                        <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-tighter">{exam?.subject}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Verified Seating Record</span>
                </div>
            </header>

            {error ? (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                        <Clock size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Seating Not Yet Published</h3>
                    <p className="text-slate-500 font-semibold max-w-md mx-auto leading-relaxed mb-8">
                        {error}
                    </p>
                    <button onClick={fetchSeating} className="inline-flex items-center gap-2 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">
                        <RefreshCcw size={16} /> Try Refreshing
                    </button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-[450px_1fr] gap-10">
                    {/* LEFT: Core Identity & Location */}
                    <div className="space-y-8">
                        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-10">
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Exam Metadata</h3>
                                <div className="space-y-8">
                                    <InfoItem icon={Calendar} label="Official Date" value={exam?.dateLabel} />
                                    <InfoItem icon={Clock} label="Session & Duration" value={`${exam?.session} • ${exam?.duration} Mins`} />
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-100">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Global Location</h3>
                                <div className="space-y-8">
                                    <InfoItem icon={Building2} label="Institutional Block" value={assignment?.blockName || 'Pending'} />
                                    <InfoItem icon={Layers} label="Floor Assignment" value={assignment?.floorName || 'Pending'} />
                                    <InfoItem icon={MapPin} label="Examination Hall" value={assignment?.roomCode || 'Allocating...'} color="text-indigo-600 bg-indigo-50" />
                                </div>
                            </div>

                            <div className="pt-10 border-t border-slate-100">
                                <div className="bg-slate-900 rounded-[1.5rem] p-6 flex gap-5">
                                    <ShieldAlert size={28} className="text-indigo-400 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2">Gate Instructions</p>
                                        <p className="text-xs font-bold text-slate-400 leading-relaxed">
                                            Present Physical ID Card. Reporting starts 30 minutes prior to session launch.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT: Precise Seat Mapping */}
                    <div className="space-y-10">
                        {/* Dimensional Seat Identifiers */}
                        <section className="grid sm:grid-cols-3 gap-6">
                            <SeatCard label="TERMINAL ID" value={assignment?.seatNumber || '-'} highlight />
                            <SeatCard label="ROW VECTOR" value={assignment?.rowLabel || '-'} />
                            <SeatCard label="BENCH INDEX" value={assignment?.benchNumber || '-'} />
                        </section>

                        {/* Spatial Visualization */}
                        <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none opacity-50" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Room Layout Profile</h3>
                                    <p className="text-slate-400 text-[10px] font-black mt-1 uppercase tracking-[0.2em]">Orientation Hall {assignment?.roomCode}</p>
                                </div>
                                <button onClick={fetchSeating} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-4 py-2 rounded-xl border border-transparent hover:border-indigo-100 transition-all">
                                    <RefreshCcw size={14} /> Update Sync
                                </button>
                            </div>
                            
                            <div className="bg-slate-50 rounded-[2rem] border border-slate-100 p-10 shadow-inner min-h-[500px] flex items-center justify-center">
                                <SeatingVisualization layout={layout} mySeat={assignment} />
                            </div>

                            <div className="mt-10 flex flex-wrap items-center justify-between gap-8 px-4">
                                <div className="flex flex-wrap items-center gap-8">
                                    <LegendItem color="bg-cyan-500" label="Active Allocation" />
                                    <LegendItem color="bg-slate-200" label="Reserved Seat" />
                                    <LegendItem color="bg-white border border-slate-200 border-dashed" label="Vacant Slot" />
                                </div>
                                <div className="px-4 py-1 bg-slate-100 rounded-full">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Static Vector: Perspective Top-Down</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            )}
        </div>
    );
};

const InfoItem = ({ icon: Icon, label, value, color }: any) => (
    <div className="flex items-start gap-5">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${color || 'bg-slate-50 text-slate-400'}`}>
            <Icon size={20} />
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <p className="text-base font-black text-slate-800 tracking-tight">{value}</p>
        </div>
    </div>
);

const SeatCard = ({ label, value, highlight }: any) => (
    <div className={`p-8 rounded-[2rem] text-center border transition-all duration-500 group relative overflow-hidden ${
        highlight 
            ? 'bg-slate-900 border-slate-800 shadow-2xl shadow-slate-300' 
            : 'bg-white border-slate-100 shadow-sm hover:border-indigo-200'
    }`}>
        {highlight && (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        )}
        <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-4 relative z-10 ${highlight ? 'text-indigo-400' : 'text-slate-400'}`}>{label}</p>
        <p className={`text-4xl font-black relative z-10 ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
);

const LegendItem = ({ color, label }: any) => (
    <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-lg ${color}`} />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
);

export default StudentSeating;
