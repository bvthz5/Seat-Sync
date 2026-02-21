import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const data = [
    { name: 'CSE', students: 420 },
    { name: 'ECE', students: 350 },
    { name: 'MECH', students: 280 },
    { name: 'EEE', students: 190 },
];

const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc'];

const pieData = [
    { name: 'Allocated', value: 850 },
    { name: 'Capacity', value: 390 },
];

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 p-2 shadow-lg rounded-lg">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{payload[0].name}</p>
                <p className="text-sm font-bold text-slate-900">{payload[0].value.toLocaleString()} <span className="text-slate-400 font-medium text-[10px]">Headcount</span></p>
            </div>
        );
    }
    return null;
};

export const AnalyticsChart: React.FC = () => {
    return (
        <div className="space-y-8 py-2">

            {/* Department Load Distribution */}
            <div className="h-[140px] w-full min-w-[200px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: -20, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                            width={50}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="students" radius={[0, 4, 4, 0]} barSize={12}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Strategic Resource Utilization */}
            <div className="relative h-[160px] w-full min-w-[200px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={65}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill="#4f46e5" />
                            <Cell fill="#f1f5f9" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-900 tracking-tighter">68%</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Utilization</span>
                </div>
            </div>

            {/* Tactical Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 pb-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Capacity</span>
                    <span className="text-sm font-bold text-slate-800">1,240 Units</span>
                </div>
                <div className="p-3 bg-indigo-50/30 border border-indigo-100/50 rounded-xl">
                    <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current Velocity</span>
                    <span className="text-sm font-bold text-indigo-600">Stable Ops</span>
                </div>
            </div>

        </div>
    );
};
