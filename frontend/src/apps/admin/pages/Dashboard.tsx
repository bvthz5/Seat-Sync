import { useState, useEffect } from 'react';
import { DashboardCards } from '../components/DashboardCards';
import { LiveMonitor } from '../components/LiveMonitor';
import { AnalyticsChart } from '../components/AnalyticsChart';
import { QuickActions } from '../components/QuickActions';
import { ActivityFeed } from '../components/ActivityFeed';
import { LiveExamDetails } from '../components/LiveExamDetails';
import { LiveClock } from '../components/LiveClock';
import { Button, Card, CardBody, CardHeader, Chip, Select, SelectItem } from '@heroui/react';
import { Download, RefreshCw, ShieldAlert, Activity, Server, AlertTriangle, BookOpen } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { SeriesService } from '../services/seriesService';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const isRoot = user?.IsRootAdmin;
    const [series, setSeries] = useState<any[]>([]);
    const [seriesFilter, setSeriesFilter] = useState<string>('All');
    const [loadingSeries, setLoadingSeries] = useState(false);

    useEffect(() => {
        fetchSeries();
    }, []);

    const fetchSeries = async () => {
        setLoadingSeries(true);
        try {
            const response = await SeriesService.getAll();
            if (response.success) {
                setSeries(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch series", error);
        } finally {
            setLoadingSeries(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto flex flex-col gap-8 p-6 pb-20 font-sans">
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-light text-[#202124] tracking-tight">Dashboard</h1>
                    <p className="text-[#5f6368] text-sm mt-1">
                        Welcome back, <span className="font-semibold">{user?.Email || 'Admin'}</span>. Here is your daily examination overview.
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    <Select
                        selectedKeys={new Set([seriesFilter])}
                        onSelectionChange={(keys) => setSeriesFilter(String(Array.from(keys)[0]))}
                        size="md"
                        variant="bordered"
                        className="w-64"
                        classNames={{
                            trigger: "bg-white border-slate-200 data-[hover=true]:border-blue-500 focus:border-blue-500 focus-within:border-blue-500 rounded-xl transition-all shadow-sm h-12 relative",
                            value: "text-slate-700 font-bold text-sm",
                            selectorIcon: "text-slate-500 absolute right-3",
                            popoverContent: "bg-white border border-slate-100 shadow-xl rounded-xl p-2 w-64"
                        }}
                        aria-label="Select Exam Series"
                        disallowEmptySelection
                        items={[
                            { ExamSeriesID: 'All', SeriesName: 'All Series', description: 'View all examinations' },
                            ...series.map(s => ({ ...s, description: 'Academic Series' }))
                        ]}
                        selectionMode="single"
                        renderValue={(items) => {
                            return items.map((item) => (
                                <div key={item.key} className="flex items-center gap-2">
                                    <div className="p-1 rounded-md bg-blue-50 text-blue-600">
                                        <BookOpen size={14} />
                                    </div>
                                    <span className="font-bold text-slate-700">{item.textValue}</span>
                                </div>
                            ));
                        }}
                    >
                        {(item: any) => (
                            <SelectItem
                                key={String(item.ExamSeriesID)}
                                textValue={item.SeriesName}
                                startContent={
                                    <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-data-[hover=true]:bg-blue-50 group-data-[hover=true]:text-blue-600 transition-colors">
                                        <BookOpen size={18} strokeWidth={2} />
                                    </div>
                                }
                                description={item.description}
                                classNames={{
                                    base: "rounded-lg data-[hover=true]:bg-gray-50 data-[selectable=true]:focus:bg-gray-50 mb-1 py-2",
                                    title: "text-slate-700 font-bold text-sm",
                                    description: "text-slate-400 text-xs font-medium"
                                }}
                            >
                                {item.SeriesName}
                            </SelectItem>
                        )}
                    </Select>
                    <Button
                        startContent={<RefreshCw size={16} />}
                        variant="bordered"
                        radius="sm"
                        className="font-medium text-[#5f6368] border-gray-300 hover:bg-gray-50"
                        onPress={fetchSeries}
                    >
                        Refresh
                    </Button>
                    <LiveClock />
                </div>
            </div>

            {/* 2. KPI Cards Strip */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Key Metrics</h3>
                </div>
                <DashboardCards seriesId={seriesFilter === 'All' ? undefined : parseInt(seriesFilter)} />
            </section>

            {/* 3. Main Bento Grid Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">

                {/* LEFT COLUMN: Main Monitoring (Span 8) */}
                <div className="xl:col-span-8 flex flex-col gap-8 w-full">
                    {/* Visual Analytics Row */}
                    <Card className="border-none shadow-sm bg-white rounded-xl">
                        <CardHeader className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-800">Analytics Overview</h3>
                            <Button size="sm" variant="light" className="text-blue-600 font-medium">View Full Report</Button>
                        </CardHeader>
                        <CardBody className="p-0 overflow-hidden">
                            <div className="h-[350px] w-full">
                                <AnalyticsChart />
                            </div>
                        </CardBody>
                    </Card>

                    {/* Live Monitor Table */}
                    <div className="min-h-[450px] w-full">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Live Occupancy</h3>
                        </div>
                        <LiveMonitor />
                    </div>
                </div>

                {/* RIGHT COLUMN: Action & Feed (Span 4) */}
                <div className="xl:col-span-4 flex flex-col gap-8 w-full h-full">
                    {/* Quick Action Tiles */}
                    <div className="w-full">
                        <QuickActions />
                    </div>

                    {/* Activity Feed */}
                    <div className="flex-1 w-full min-h-[400px]">
                        <ActivityFeed />
                    </div>
                </div>

                {/* BOTTOM ROW: Live Details (Span 12) */}
                <div className="xl:col-span-12 w-full">
                    <LiveExamDetails />
                </div>

                {/* 4. ROOT ADMIN SECTION (Conditional) */}
                {isRoot && (
                    <div className="xl:col-span-12 w-full mt-4 animate-fade-in-up">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldAlert className="text-red-600" size={20} />
                            <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider">Root Administration Control</h3>
                            <div className="h-px bg-red-200 flex-1 ml-4"></div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* System Health */}
                            <Card className="border border-red-100 shadow-sm bg-red-50/30">
                                <CardHeader className="flex gap-3">
                                    <Server className="text-slate-600" size={20} />
                                    <div className="flex flex-col">
                                        <p className="text-md font-bold text-slate-800">System Health</p>
                                        <p className="text-xs text-slate-500">Server Status & Load</p>
                                    </div>
                                    <Chip size="sm" color="success" variant="flat" className="ml-auto">Healthy</Chip>
                                </CardHeader>
                                <CardBody>
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-slate-600">CPU Load</span>
                                        <span className="font-mono font-bold">12%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
                                        <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '12%' }}></div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-slate-600">Memory</span>
                                        <span className="font-mono font-bold">4.2GB / 16GB</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '26%' }}></div>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Security Alerts */}
                            <Card className="border border-red-100 shadow-sm bg-red-50/30">
                                <CardHeader className="flex gap-3">
                                    <AlertTriangle className="text-orange-500" size={20} />
                                    <div className="flex flex-col">
                                        <p className="text-md font-bold text-slate-800">Security Alerts</p>
                                        <p className="text-xs text-slate-500">Active Threats</p>
                                    </div>
                                    <Chip size="sm" color="warning" variant="flat" className="ml-auto">1 Warning</Chip>
                                </CardHeader>
                                <CardBody>
                                    <div className="bg-white p-3 rounded-lg border border-orange-100 flex gap-3 items-start">
                                        <div className="min-w-[4px] h-full bg-orange-400 rounded-full"></div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">Multiple failed logins</p>
                                            <p className="text-[10px] text-slate-500 mt-1">IP 192.168.1.45 attempted 5 times in 1 min.</p>
                                            <Button size="sm" variant="flat" color="warning" className="h-6 text-[10px] mt-2">Block IP</Button>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>

                            {/* Admin Activity */}
                            <Card className="border border-red-100 shadow-sm bg-red-50/30">
                                <CardHeader className="flex gap-3">
                                    <Activity className="text-blue-600" size={20} />
                                    <div className="flex flex-col">
                                        <p className="text-md font-bold text-slate-800">Admin Activity</p>
                                        <p className="text-xs text-slate-500">Recent Super Admin Actions</p>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <ul className="space-y-3">
                                        <li className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">System backup started</span>
                                            <span className="text-slate-400">2m ago</span>
                                        </li>
                                        <li className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">Role updated for 'j.doe'</span>
                                            <span className="text-slate-400">1h ago</span>
                                        </li>
                                        <li className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600">Config changed (Exam Rules)</span>
                                            <span className="text-slate-400">3h ago</span>
                                        </li>
                                    </ul>
                                    <Button size="sm" variant="light" className="w-full mt-3 text-xs font-semibold text-blue-600">View Audit Log</Button>
                                </CardBody>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
