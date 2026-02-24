import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const barData = [
    { name: 'CSE', value: 420 },
    { name: 'ECE', value: 350 },
    { name: 'MECH', value: 280 },
    { name: 'EEE', value: 190 },
];

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

const pieData = [
    { name: 'Allocated', value: 850 },
    { name: 'Available', value: 390 },
];

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

export const AnalyticsChart: React.FC = () => (
    <div className="space-y-6">
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Department Load</p>
            <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 20, left: -15, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} width={45} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={10}>
                            {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Seat Utilization</p>
            <div className="flex items-center gap-5">
                <div className="relative w-[110px] h-[110px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value" stroke="none">
                                <Cell fill="#6366f1" />
                                <Cell fill="#f1f5f9" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xl font-black text-slate-900 leading-none">68%</span>
                        <span className="text-[9px] text-slate-400 font-semibold mt-0.5">Used</span>
                    </div>
                </div>
                <div className="space-y-2.5 flex-1">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-sm bg-indigo-500 inline-block" />Allocated
                            </span>
                            <span className="text-[11px] font-bold text-slate-900">850</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full w-[68%] rounded-full bg-indigo-500" /></div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-sm bg-slate-200 inline-block" />Available
                            </span>
                            <span className="text-[11px] font-bold text-slate-900">390</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full w-[32%] rounded-full bg-slate-300" /></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
