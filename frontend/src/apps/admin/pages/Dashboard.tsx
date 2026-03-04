import React, { useState, useEffect } from 'react';
import { Select, SelectItem } from '@heroui/react';
import {
    RefreshCw,
    Download,
    Terminal,
    ShieldAlert,
    Filter,
    Activity,
    Monitor,
    BarChart3,
    Zap,
    History,
    AlertCircle,
    CheckCircle2,
    Database
} from 'lucide-react';
import { DashboardCards } from '../components/DashboardCards';
import { LiveMonitor } from '../components/LiveMonitor';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { QuickActions } from '../components/QuickActions';
import { ActivityFeed } from '../components/ActivityFeed';
import { LiveExamDetails } from '../components/LiveExamDetails';
import { LiveClock } from '../components/LiveClock';
import { SeriesService } from '../services/seriesService';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [series, setSeries] = useState<any[]>([]);
    const [selectedSeries, setSelectedSeries] = useState<number>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSeries();
    }, []);

    const fetchSeries = async () => {
        setLoading(true);
        try {
            const response = await SeriesService.getAll();
            if (response.success) {
                setSeries(response.data);
                if (response.data.length > 0) setSelectedSeries(response.data[0].SeriesID);
            }
        } catch (error) {
            console.error("Failed to fetch series", error);
        } finally {
            setLoading(false);
        }
    };

    const IsRootAdmin = user?.Role?.toLowerCase() === 'root' || user?.IsRootAdmin;
    const showPasswordWarning = user?.Role === 'exam_admin' && !user?.IsPasswordChanged;

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="min-h-screen bg-[#f4f6f9]">
            {/* Page Header */}
            <div className="bg-white border-b border-slate-200/80 px-8 py-5">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">Administrative Console</p>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            {greeting()}, {user?.FullName?.split(' ')[0] || 'Admin'}
                        </h1>
                        <p className="text-sm text-slate-400 mt-0.5">
                            Real-time examination monitoring & infrastructure oversight
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <LiveClock />

                        <div className="w-px h-7 bg-slate-200 hidden md:block" />

                        <Select
                            id="dashboard-series-select"
                            name="dashboardSeriesSelect"
                            aria-label="Select Exam Series"
                            placeholder="Filter by series"
                            size="sm"
                            className="w-52"
                            variant="bordered"
                            classNames={{
                                trigger: "bg-white border-slate-200 rounded-lg h-9 text-sm",
                                value: "text-slate-700 text-sm",
                            }}
                            selectedKeys={selectedSeries ? [selectedSeries.toString()] : []}
                            onChange={(e) => setSelectedSeries(Number(e.target.value))}
                            startContent={<Filter size={14} className="text-slate-400 shrink-0" />}
                            isLoading={loading}
                        >
                            {series.map((s) => (
                                <SelectItem key={s.SeriesID} textValue={s.SeriesName}>
                                    {s.SeriesName}
                                </SelectItem>
                            ))}
                        </Select>

                        <button
                            onClick={fetchSeries}
                            disabled={loading}
                            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        </button>
                        <button className="h-9 flex items-center gap-2 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                            <Download size={14} />
                            <span>Export</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-8 py-7 space-y-7">

                {/* Password Warning Banner */}
                {showPasswordWarning && (
                    <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <ShieldAlert className="text-amber-600" size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-amber-900">Action Required — Temporary Password</p>
                                <p className="text-xs text-amber-700 mt-0.5">You are using a default password. Update your credentials immediately to secure your account.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/admin/profile', { state: { openChangePassword: true } })}
                            className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors"
                        >
                            Change Password
                        </button>
                    </div>
                )}

                {/* Metric Cards */}
                <DashboardCards seriesId={selectedSeries} />

                {/* Main Content Grid */}
                <div className="grid grid-cols-12 gap-6">

                    {/* Left column  */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">

                        {/* Live Hall Monitor */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                        <Monitor size={15} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-sm font-bold text-slate-800">Real-Time Hall Monitoring</h2>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Live feed of all active exam halls</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Live</span>
                                </div>
                            </div>
                            <LiveMonitor />
                        </div>

                        {/* Active Session Intelligence */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <Activity size={15} className="text-violet-600" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">Active Session Intelligence</h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Detailed view of ongoing exam sessions</p>
                                </div>
                            </div>
                            <LiveExamDetails />
                        </div>

                        {/* Root Infrastructure Panel */}
                        {IsRootAdmin && (
                            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-xl">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                            <ShieldAlert size={15} className="text-amber-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-slate-100">Root Infrastructure Control</h2>
                                            <p className="text-[11px] text-slate-500 mt-0.5">Privileged system-level operations</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.18em] px-2.5 py-1 bg-slate-800/80 rounded-lg border border-slate-700">
                                        Root Access
                                    </span>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <RootUtilityCard icon={<Terminal size={18} />} title="Audit Logs" desc="Security & access tracing" color="text-amber-400" bg="bg-amber-500/10 border-amber-500/20" />
                                    <RootUtilityCard icon={<CheckCircle2 size={18} />} title="System Health" desc="Compute & memory utilization" color="text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
                                    <RootUtilityCard icon={<Database size={18} />} title="Database" desc="Indexes & data cleanup" color="text-blue-400" bg="bg-blue-500/10 border-blue-500/20" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right sidebar column */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                                    <Zap size={15} className="text-orange-500" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-800">Quick Actions</h2>
                            </div>
                            <div className="p-5">
                                <QuickActions />
                            </div>
                        </div>

                        {/* Distribution Analytics */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <BarChart3 size={15} className="text-indigo-600" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-800">Distribution Analytics</h2>
                            </div>
                            <div className="p-5">
                                <AnalyticsChart />
                            </div>
                        </div>

                        {/* Activity Log */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <History size={15} className="text-slate-600" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-800">Activity Log</h2>
                            </div>
                            <div className="p-5">
                                <ActivityFeed />
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

function RootUtilityCard({ icon, title, desc, color, bg }: any) {
    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl border ${bg} hover:brightness-125 transition-all cursor-pointer group`}>
            <div className={`mt-0.5 shrink-0 ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
            <div>
                <p className="text-sm font-semibold text-slate-100">{title}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

export default Dashboard;

