import React from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const data = [
    { name: 'CSE', students: 420 },
    { name: 'ECE', students: 350 },
    { name: 'MECH', students: 280 },
    { name: 'EEE', students: 190 },
];

const COLORS = ['#1a73e8', '#f9ab00', '#1e8e3e', '#d93025'];

const pieData = [
    { name: 'Allocated', value: 850 },
    { name: 'Pending', value: 390 },
];

export const AnalyticsChart: React.FC = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            {/* Chart 1: Department Distribution */}
            <Card className="border-none shadow-sm rounded-2xl bg-white h-full">
                <CardHeader className="px-6 py-5 border-b border-gray-100">
                    <h3 className="font-normal text-lg text-[#202124]">Student Distribution</h3>
                </CardHeader>
                <CardBody className="p-4 h-[250px] overflow-hidden">
                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#5f6368' }} width={40} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="students" radius={[0, 4, 4, 0]} barSize={20}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardBody>
            </Card>

            {/* Chart 2: Allocation Status */}
            <Card className="border-none shadow-sm rounded-2xl bg-white h-full">
                <CardHeader className="px-6 py-5 border-b border-gray-100">
                    <h3 className="font-normal text-lg text-[#202124]">Allocation Status</h3>
                </CardHeader>
                <CardBody className="p-4 h-[250px] relative overflow-hidden">
                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    <Cell fill="#1a73e8" />
                                    <Cell fill="#e8f0fe" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-[#202124]">68%</span>
                        <span className="text-xs text-[#5f6368] uppercase tracking-wide">Done</span>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};
