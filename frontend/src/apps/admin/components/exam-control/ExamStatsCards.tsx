import React from 'react';
import { Card, CardBody } from '@heroui/react'; // Ensure using HeroUI
import { Layers, FileText, CheckCircle2, AlertOctagon, MonitorPlay, Archive, Lock } from 'lucide-react';

interface StatsProps {
    total: number;
    draft: number;
    ready: number;
    published: number;
    inProgress: number;
    completed: number;
    emergency: number;
    locked: number; // For "Frozen" visual
}

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, bgClass }: any) => (
    <Card className={`border-none shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${bgClass} overflow-visible`}>
        <CardBody className="p-6 relative overflow-hidden">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 ${colorClass}`}></div>
            <div className="flex justify-between items-start z-10">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500/80">{title}</p>
                    <h3 className={`text-3xl font-black mt-2 ${colorClass.replace('bg-', 'text-')}`}>{value}</h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">{subtext}</p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${colorClass} text-white`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </CardBody>
    </Card>
);

export const ExamStatsCards: React.FC<StatsProps> = ({ total, draft, ready, published, inProgress, completed, emergency }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
                title="Total Exams"
                value={total}
                subtext="All records database"
                icon={Layers}
                colorClass="bg-indigo-600"
                bgClass="bg-white"
            />

            <StatCard
                title="Active & Ready"
                value={published + inProgress}
                subtext={`${inProgress} currently in progress`}
                icon={MonitorPlay}
                colorClass="bg-emerald-500"
                bgClass="bg-emerald-50/50"
            />

            <StatCard
                title="Preparation"
                value={draft + ready}
                subtext="Drafts & Ready for publish"
                icon={FileText}
                colorClass="bg-amber-500"
                bgClass="bg-amber-50/50"
            />

            {emergency > 0 ? (
                <Card className="border-none shadow-lg bg-red-500 text-white animate-pulse ring-4 ring-red-200">
                    <CardBody className="p-6 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertOctagon className="w-6 h-6 text-white" />
                            <span className="font-bold tracking-widest text-xs uppercase">Crisis Mode Active</span>
                        </div>
                        <div className="text-4xl font-black">{emergency}</div>
                        <div className="text-xs text-red-100 mt-1">Exams requiring immediate attention</div>
                    </CardBody>
                </Card>
            ) : (
                <StatCard
                    title="Completed"
                    value={completed}
                    subtext="Archived successfully"
                    icon={CheckCircle2}
                    colorClass="bg-slate-500"
                    bgClass="bg-white"
                />
            )}
        </div>
    );
};
