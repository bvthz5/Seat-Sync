import React, { useEffect } from 'react';
import { Card, CardBody } from '@heroui/react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Users, FileText, Layout, UserCheck, Activity, ArrowUpRight, TrendingUp } from 'lucide-react';
import { ExamService } from '../services/examService';

// Professional CountUp
const CountUp = ({ value, suffix = "" }: { value: number, suffix?: string }) => {
    const spring = useSpring(0, { mass: 1, stiffness: 100, damping: 30 });
    const display = useTransform(spring, (current) =>
        Math.floor(current).toLocaleString() + suffix
    );

    useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
};

interface SummaryCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    trend?: string;
    color: 'indigo' | 'emerald' | 'orange' | 'slate';
    loading?: boolean;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, trend, color, loading }) => {
    const colors = {
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-600' },
        emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-600' },
        orange: { bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-600' },
        slate: { bg: 'bg-slate-50', text: 'text-slate-600', bar: 'bg-slate-600' }
    };

    const theme = colors[color];
    const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : value;
    const isNumber = !isNaN(numValue as number);

    return (
        <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardBody className="p-0">
                <div className={`h-1 w-full ${theme.bar}`} />
                <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${theme.bg} ${theme.text}`}>
                            {React.cloneElement(icon as any, { size: 18 })}
                        </div>
                        {trend && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                <TrendingUp size={10} />
                                {trend}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight h-8">
                                {loading ? (
                                    <div className="w-16 h-8 bg-slate-100 animate-pulse rounded" />
                                ) : isNumber ? (
                                    <CountUp value={numValue as number} />
                                ) : (
                                    value
                                )}
                            </h3>
                        </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enterprise Meta</span>
                        <ArrowUpRight size={14} className="text-slate-300" />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};

export const DashboardCards: React.FC<{ seriesId?: number }> = ({ seriesId }) => {
    const [stats, setStats] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => {
        fetchStats();
    }, [seriesId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await ExamService.getStats({ seriesId });
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard
                title="Consolidated Exams"
                value={stats?.total || 0}
                icon={<FileText />}
                color="indigo"
                trend="+12%"
                loading={loading}
            />
            <SummaryCard
                title="Successfully Completed"
                value={stats?.completed || 0}
                icon={<UserCheck />}
                color="emerald"
                trend="98%"
                loading={loading}
            />
            <SummaryCard
                title="Upcoming Sessions"
                value={stats?.upcoming || 0}
                icon={<Layout />}
                color="slate"
                trend="4 slots"
                loading={loading}
            />
            <SummaryCard
                title="Active Hall Operations"
                value={stats?.activeToday || 0}
                icon={<Activity />}
                color="orange"
                trend="Live"
                loading={loading}
            />
        </div>
    );
};
