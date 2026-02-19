
import React from 'react';
import { Card, CardHeader, CardBody } from "@heroui/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { BarChart as BarChartIcon } from 'lucide-react';

interface LoginActivityChartProps {
    data: {
        date: string;
        successful: number;
        failed: number;
        root: number;
    }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-slate-100 shadow-md rounded-lg text-xs">
                <p className="font-semibold text-slate-700 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-slate-500 capitalize">{entry.name}:</span>
                        <span className="font-bold text-slate-700">{entry.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const LoginActivityChart: React.FC<LoginActivityChartProps> = ({ data }) => {
    return (
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden h-[400px]">
            <CardHeader className="flex justify-between items-center p-4 bg-slate-50/50 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <BarChartIcon className="w-4 h-4 text-blue-500" />
                    Login Activity (Last 7 Days)
                </h3>
            </CardHeader>
            <CardBody className="p-4 h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{
                            top: 10,
                            right: 30,
                            left: 0,
                            bottom: 0,
                        }}
                    >
                        <defs>
                            <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorRoot" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            tickMargin={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                        />
                        <RechartsTooltip content={<CustomTooltip />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                        <Area
                            type="monotone"
                            dataKey="successful"
                            name="Successful Logins"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorSuccess)"
                        />
                        <Area
                            type="monotone"
                            dataKey="failed"
                            name="Failed Attempts"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorFailed)"
                        />
                        <Area
                            type="monotone"
                            dataKey="root"
                            name="Root Logins"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRoot)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
};
