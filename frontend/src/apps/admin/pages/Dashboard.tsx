import React, { useState, useEffect } from 'react';
import { Button, Select, SelectItem, Card, CardBody, Divider } from '@heroui/react';
import {
    LayoutDashboard,
    RefreshCw,
    Download,
    Terminal,
    ShieldAlert,
    Clock,
    Filter,
    Activity,
    Monitor,
    BarChart3,
    Zap,
    History
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

const Dashboard: React.FC = () => {
    const { user } = useAuth();
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

    const IsRootAdmin = user?.Role?.toLowerCase() === 'root';

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Enterprise Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-2">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            <LayoutDashboard className="text-indigo-600" size={24} />
                            Administrative Console
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 font-medium">
                            Real-time examination monitoring and infrastructure oversight.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                            <Clock size={16} className="text-slate-400" />
                            <LiveClock />
                        </div>

                        <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

                        <Select
                            placeholder="Select Exam Series"
                            size="sm"
                            className="w-56"
                            variant="bordered"
                            selectedKeys={selectedSeries ? [selectedSeries.toString()] : []}
                            onChange={(e) => setSelectedSeries(Number(e.target.value))}
                            startContent={<Filter size={14} className="text-slate-400" />}
                            isLoading={loading}
                        >
                            {series.map((s) => (
                                <SelectItem key={s.SeriesID} textValue={s.SeriesName}>
                                    {s.SeriesName}
                                </SelectItem>
                            ))}
                        </Select>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                isIconOnly
                                className="bg-white border border-slate-200 text-slate-600"
                                onClick={fetchSeries}
                                isLoading={loading}
                            >
                                <RefreshCw size={16} />
                            </Button>
                            <Button
                                size="sm"
                                className="bg-indigo-600 text-white shadow-sm font-bold px-4 h-9 rounded-lg"
                                startContent={<Download size={16} />}
                            >
                                Export Data
                            </Button>
                        </div>
                    </div>
                </header>

                <Divider className="opacity-50" />

                {/* Primary Intelligence Metrics */}
                <section>
                    <DashboardCards seriesId={selectedSeries} />
                </section>

                <div className="grid grid-cols-12 gap-8">
                    {/* Main Monitoring Column */}
                    <main className="col-span-12 lg:col-span-8 space-y-8">

                        {/* Live Examination Monitoring */}
                        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                            <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Monitor className="text-indigo-600" size={18} />
                                    <h2 className="text-base font-bold text-slate-800 tracking-tight">Real-Time Hall Monitoring</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Feed</span>
                                </div>
                            </div>
                            <CardBody className="p-0">
                                <LiveMonitor />
                            </CardBody>
                        </Card>

                        {/* Detailed Session Intelligence */}
                        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-2">
                                <Activity className="text-indigo-600" size={18} />
                                <h2 className="text-base font-bold text-slate-800 tracking-tight">Active Session Intelligence</h2>
                            </div>
                            <CardBody className="p-0">
                                <LiveExamDetails />
                            </CardBody>
                        </Card>

                        {/* Root Infrastructure (Conditional) */}
                        {IsRootAdmin && (
                            <Card className="border-slate-800 bg-[#0f172a] shadow-xl rounded-xl overflow-hidden dark">
                                <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="text-amber-500" size={20} />
                                        <h2 className="text-base font-bold text-slate-100">Root Infrastructure Control</h2>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2 py-1 bg-slate-800 rounded">Privileged Access</span>
                                </div>
                                <CardBody className="p-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <RootUtilityCard icon={<Terminal />} title="Audit Logs" desc="Security & access tracing" color="text-amber-400" />
                                        <RootUtilityCard icon={<Activity />} title="System Health" desc="Compute & memory utilization" color="text-emerald-400" />
                                        <RootUtilityCard icon={<Zap />} title="Database" desc="Refine indexes & cleanup" color="text-blue-400" />
                                    </div>
                                </CardBody>
                            </Card>
                        )}
                    </main>

                    {/* Secondary Insights Column */}
                    <aside className="col-span-12 lg:col-span-4 space-y-8">

                        {/* High-Level Controls */}
                        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-2">
                                <Zap className="text-indigo-600" size={18} />
                                <h2 className="text-base font-bold text-slate-800 tracking-tight">Quick Actions</h2>
                            </div>
                            <CardBody className="p-6">
                                <QuickActions />
                            </CardBody>
                        </Card>

                        {/* Visual Distribution Intelligence */}
                        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-2">
                                <BarChart3 className="text-indigo-600" size={18} />
                                <h2 className="text-base font-bold text-slate-800 tracking-tight">Distribution Analytics</h2>
                            </div>
                            <CardBody className="p-6">
                                <AnalyticsChart />
                            </CardBody>
                        </Card>

                        {/* Activity Audit Feed */}
                        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                            <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-2">
                                <History className="text-indigo-600" size={18} />
                                <h2 className="text-base font-bold text-slate-800 tracking-tight">Activity Log</h2>
                            </div>
                            <CardBody className="p-6">
                                <ActivityFeed />
                            </CardBody>
                        </Card>

                    </aside>
                </div>
            </div>
        </div>
    );
};

function RootUtilityCard({ icon, title, desc, color }: any) {
    return (
        <div className="p-5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors group cursor-pointer">
            <div className={`${color} mb-3 group-hover:scale-110 transition-transform`}>{icon}</div>
            <p className="text-sm font-bold text-slate-100">{title}</p>
            <p className="text-xs text-slate-500 mt-1">{desc}</p>
        </div>
    );
}

export default Dashboard;
