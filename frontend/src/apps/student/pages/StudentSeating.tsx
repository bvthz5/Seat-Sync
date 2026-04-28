import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
    const [seatingData, setSeatingData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSeating = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await studentPortalApi.getSeating(examId);
            if (!data) {
                setError('Seating records for this session are currently restricted or unavailable.');
            } else {
                setSeatingData(data);
            }
        } catch (err) {
            console.error('Failed to fetch seating:', err);
            setError('Access restricted. Seating details are typically released 1 hour before the exam.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeating();
    }, [examId]);

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20">
                <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
                <p className="text-slate-500 font-medium tracking-wide">Retrieving official seating matrix...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-xl mx-auto py-24 text-center">
                <div className="w-20 h-20 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-rose-500 mx-auto mb-8 shadow-inner">
                    <ShieldAlert size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Access Control Restricted</h2>
                <p className="text-slate-500 mb-10 font-medium leading-relaxed">
                    {error}
                </p>
                <div className="flex items-center justify-center gap-4">
                    <Link to="/student/dashboard" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                        Back to Dashboard
                    </Link>
                    <button onClick={fetchSeating} className="p-4 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all group">
                        <RefreshCcw size={20} className="group-active:rotate-180 transition-transform duration-500" />
                    </button>
                </div>
            </div>
        );
    }

    const { exam, assignment, layout } = seatingData;

    return (
        <div className="space-y-10 max-w-7xl mx-auto pb-24">
            {/* Minimal Header with Back Button */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <Link to="/student/exams" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm">Exams</span>
                    </Link>
                    <div className="w-px h-6 bg-slate-200" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Seating Details</h1>
                        <p className="text-slate-400 text-sm font-medium mt-0.5">{exam?.subject}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Verified Assignment</span>
                </div>
            </header>

            <div className="grid lg:grid-cols-[400px_1fr] gap-10">
                {/* LEFT: Exam & Room Info */}
                <div className="space-y-8">
                    <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-8">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-6">Examination Info</h3>
                            <div className="space-y-6">
                                <InfoItem icon={Calendar} label="Date & Session" value={`${exam?.dateLabel} • ${exam?.session}`} />
                                <InfoItem icon={Clock} label="Duration" value={`${exam?.duration} Minutes`} />
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-6">Location Matrix</h3>
                            <div className="space-y-6">
                                <InfoItem icon={Building2} label="Building Block" value={assignment?.blockName || 'Main Block'} />
                                <InfoItem icon={Layers} label="Floor Level" value={assignment?.floorName || 'Ground Floor'} />
                                <InfoItem icon={MapPin} label="Room / Hall" value={assignment?.roomCode || 'TBD'} color="text-indigo-600 bg-indigo-50" />
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-100">
                            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex gap-4">
                                <ShieldAlert size={24} className="text-amber-600 shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Reporting Instructions</p>
                                    <p className="text-xs font-medium text-amber-800/80 leading-relaxed">
                                        Candidates must present their ID card and hall ticket at the entrance. Reporting time is 30 minutes before the session starts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* RIGHT: Seat Card & Grid Visual */}
                <div className="space-y-8">
                    {/* Highlighted Seat Card */}
                    <section className="grid sm:grid-cols-3 gap-6">
                        <SeatCard label="Seat ID" value={assignment?.seatNumber || '-'} highlight />
                        <SeatCard label="Row Label" value={assignment?.rowLabel || '-'} />
                        <SeatCard label="Bench Number" value={assignment?.benchNumber || '-'} />
                    </section>

                    {/* Room Layout Visual */}
                    <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Physical Room Preview</h3>
                                <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-widest">Hall {assignment?.roomCode}</p>
                            </div>
                            <button onClick={fetchSeating} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                                <RefreshCcw size={14} /> Refresh Grid
                            </button>
                        </div>
                        
                        <div className="bg-slate-50 rounded-[1.5rem] border border-slate-100 p-8 shadow-inner min-h-[400px]">
                            <SeatingVisualization layout={layout} mySeat={assignment} />
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                            <div className="flex items-center gap-6">
                                <LegendItem color="bg-cyan-500" label="Your Assigned Seat" />
                                <LegendItem color="bg-slate-200" label="Occupied" />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Scale: 1:1 Orientation</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon: Icon, label, value, color }: any) => (
    <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color || 'bg-slate-50 text-slate-400'}`}>
            <Icon size={18} />
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-bold text-slate-700 mt-0.5">{value}</p>
        </div>
    </div>
);

const SeatCard = ({ label, value, highlight }: any) => (
    <div className={`p-6 rounded-[1.5rem] text-center border transition-all ${
        highlight 
            ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-200 transform scale-[1.02]' 
            : 'bg-white border-slate-100 shadow-sm'
    }`}>
        <p className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-2 ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>{label}</p>
        <p className={`text-3xl font-black ${highlight ? 'text-white' : 'text-slate-900'}`}>{value}</p>
    </div>
);

const LegendItem = ({ color, label }: any) => (
    <div className="flex items-center gap-2.5">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
    </div>
);

export default StudentSeating;
