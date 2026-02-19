
import React from 'react';
import { Card, CardBody } from "@heroui/react";
import { Users, AlertTriangle, ShieldCheck, Siren, TrendingUp, TrendingDown, Activity, Lock } from 'lucide-react';
import { SecurityStats } from '../../services/securityService';

// Fallback interface if service type isn't available immediately
interface StatsProps {
    stats: SecurityStats | null;
}

export const SecurityStatsCards: React.FC<StatsProps> = ({ stats }) => {
    const data = [
        {
            title: "Active Sessions",
            value: stats?.activeSessions || 0,
            icon: Users,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            border: "border-emerald-100",
            desc: "Currently logged in users",
            trend: "+12%",
            trendUp: true
        },
        {
            title: "Failed Logins (24h)",
            value: stats?.failedLogins24h || 0,
            icon: AlertTriangle,
            color: "text-amber-500",
            bg: "bg-amber-50",
            border: "border-amber-100",
            desc: "Potential brute force attempts",
            trend: "-5%",
            trendUp: false
        },
        {
            title: "Root Admin Logins",
            value: stats?.rootLogins24h || 0,
            icon: ShieldCheck,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            border: "border-indigo-100",
            desc: "High sensitivity access",
            trend: "Stable",
            trendUp: true
        },
        {
            title: "Security Alerts",
            value: stats?.alerts || 0,
            icon: Siren,
            color: "text-rose-500",
            bg: "bg-rose-50",
            border: "border-rose-100",
            desc: "Open security risks",
            trend: "0 New",
            trendUp: true
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {data.map((item, index) => (
                <Card
                    key={index}
                    className={`border ${item.border} shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl group bg-white`}
                >
                    <CardBody className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300 ${item.bg} ${item.color} group-hover:scale-110`}>
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${item.trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {item.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {item.trend}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-3xl font-extrabold text-slate-800 tracking-tight leading-tight">
                                {item.value}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                {item.title}
                            </span>
                            <p className="text-[11px] font-medium text-slate-400 mt-2 leading-relaxed">
                                {item.desc}
                            </p>
                        </div>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
};
