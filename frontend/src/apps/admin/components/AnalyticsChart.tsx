import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { DashboardService } from '../services/dashboardService';

const barData = [
    { name: 'CSE', value: 420 },
    { name: 'ECE', value: 350 },
    { name: 'MECH', value: 280 },
    { name: 'EEE', value: 190 },
];

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
        return (
            <div className="bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{payload[0].name}</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{payload[0].value.toLocaleString()} <span className="text-slate-400 text-xs font-normal">students</span></p>
            </div>
        );
    }
    return null;
};

// Removed custom console warning interceptor as it obfuscated component stack traces.
const silenceConsoleWarnings = () => {
    // Only silence specific recharts warnings, don't intercept everything.
    const originalWarn = console.warn;
    console.warn = (...args: any[]) => {
        const message = args[0]?.toString?.() || '';
        if (message.includes('width') && message.includes('height') && message.includes('chart')) {
            return; // Ignore recharts layout warning
        }
        // Let React/HeroUI throw their own warnings natively to preserve their stack traces
        originalWarn(...args);
    };
};

export const AnalyticsChart: React.FC = () => {
    const [summary, setSummary] = useState<any>(null);
    const [departments, setDepartments] = useState<any[]>([]);

    useEffect(() => {
        silenceConsoleWarnings();
        DashboardService.getSummary().then(res => {
            if (res.success) setSummary(res.data);
        }).catch(err => console.error(err));

        DashboardService.getDepartmentStats().then(res => {
            if (res.success) setDepartments(res.data);
        }).catch(err => console.error(err));
    }, []);

    const allocated = summary?.allocatedStudents || 0;
    const capacity = summary?.totalCapacity || 1;
    const unallocated = summary?.unallocatedStudents || 0;
    const available = Math.max(0, capacity - allocated);
    const utilization = typeof summary?.utilizationPercentage === 'number' ? summary.utilizationPercentage : 0;

    const pieData = [
        { name: 'Allocated', value: allocated },
        { name: 'Available', value: available },
    ];

    return (
        <div className="space-y-6 w-full">
            <div className="w-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Department Load</p>
                <div className="w-full min-h-[130px]" style={{ aspectRatio: 'auto' }}>
                    <ResponsiveContainer width="100%" height={130} minWidth={0}>
                        <BarChart data={departments} layout="vertical" margin={{ top: 0, right: 20, left: -15, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} width={45} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={10}>
                                {departments.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="w-full">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Seat Utilization</p>
                <div className="flex items-center gap-5 w-full">
                    <div className="relative w-[110px] h-[110px] shrink-0">
                            <PieChart width={110} height={110}>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                                    <Cell fill="#6366f1" />
                                    <Cell fill="#f1f5f9" />
                                </Pie>
                            </PieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-black text-slate-900 leading-none">{Math.round(utilization)}%</span>
                            <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Used</span>
                        </div>
                    </div>
                    <div className="space-y-2.5 flex-1">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" />Allocated
                                </span>
                                <span className="text-[11px] font-bold text-slate-900">{allocated}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full w-[{Math.round(utilization)}%] rounded-full bg-indigo-500" /></div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-sm bg-slate-200 inline-block" />Available
                                </span>
                                <span className="text-[11px] font-bold text-slate-900">{available}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full w-[100 - {Math.round(utilization)}%] rounded-full bg-slate-300" /></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
