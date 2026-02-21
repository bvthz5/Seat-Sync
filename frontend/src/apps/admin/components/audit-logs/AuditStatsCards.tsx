import React from 'react';
import { Card, CardBody } from "@heroui/react";
import { Activity, ShieldAlert, UserCog, Server } from 'lucide-react';
import { AuditStats } from '../../types/audit';

interface AuditStatsCardsProps {
    stats: AuditStats;
}

export const AuditStatsCards: React.FC<AuditStatsCardsProps> = ({ stats }) => {
    const items = [
        {
            title: "Total Logs Today",
            value: stats.totalToday || 0,
            icon: Activity,
            color: "text-blue-500",
            bg: "bg-blue-50",
            desc: "System-wide activity"
        },
        {
            title: "Emergency Actions",
            value: stats.emergencyActions || 0,
            icon: ShieldAlert,
            color: "text-red-500",
            bg: "bg-red-50",
            desc: "Critical interventions"
        },
        {
            title: "Admin Actions",
            value: stats.adminActions || 0,
            icon: UserCog,
            color: "text-purple-500",
            bg: "bg-purple-50",
            desc: "Operational changes"
        },
        {
            title: "System Events",
            value: stats.systemEvents || 0,
            icon: Server,
            color: "text-slate-500",
            bg: "bg-slate-50",
            desc: "Background processes"
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item, index) => (
                <Card key={index} shadow="sm" className="border border-slate-100 hover:shadow-md transition-shadow duration-300">
                    <CardBody className="flex flex-row items-center gap-5 p-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${item.bg} ${item.color}`}>
                            <item.icon className="w-7 h-7" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">{item.title}</span>
                            <span className="text-2xl font-black text-slate-800 tracking-tight leading-none">{item.value}</span>
                            <span className="text-[10px] font-medium text-slate-400 mt-1">{item.desc}</span>
                        </div>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
};
