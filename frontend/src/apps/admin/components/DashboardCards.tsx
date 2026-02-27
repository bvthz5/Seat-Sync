import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { FileText, UserCheck, Layout, Activity, TrendingUp, ArrowRight } from 'lucide-react';
import { ExamService } from '../services/examService';

const CountUp = ({ value }: { value: number }) => {
    const spring = useSpring(0, { mass: 1, stiffness: 80, damping: 25 });
    const display = useTransform(spring, (current) => Math.floor(current).toLocaleString());
    useEffect(() => { spring.set(value); }, [value, spring]);
    return <motion.span>{display}</motion.span>;
};

interface CardConfig {
    title: string;
    subtitle: string;
    value: number;
    icon: React.ReactNode;
    trend: string;
    trendUp: boolean;
    accent: string;
    iconBg: string;
    iconColor: string;
}

const MetricCard = ({ title, subtitle, value, icon, trend, trendUp, accent, iconBg, iconColor, loading }: CardConfig & { loading: boolean }) => (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow group">
        <div className="flex items-start justify-between">
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
                {React.cloneElement(icon as any, { size: 18 })}
            </div>
            <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>
                {trendUp && <TrendingUp size={10} />}
                <span>{trend}</span>
            </div>
        </div>
        <div>
            <div className={`h-0.5 w-8 rounded-full ${accent} mb-3`} />
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">{title}</p>
            <div className="mt-1 flex items-baseline gap-1">
                {loading ? (
                    <div className="w-14 h-8 rounded-lg bg-slate-100 animate-pulse" />
                ) : (
                    <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                        <CountUp value={value} />
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors cursor-pointer">
            <span>View details</span>
            <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
    </div>
);

export const DashboardCards: React.FC<{ seriesId?: number }> = ({ seriesId }) => {
    const [stats, setStats] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);

    useEffect(() => { fetchStats(); }, [seriesId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await ExamService.getStats({ seriesId });
            setStats(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const cards: (CardConfig & { loading: boolean })[] = [
        { title: 'Total Exams', subtitle: 'Across all series', value: stats?.total || 0, icon: <FileText />, trend: '+12%', trendUp: true, accent: 'bg-indigo-500', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', loading },
        { title: 'Completed', subtitle: 'Successfully finished', value: stats?.completed || 0, icon: <UserCheck />, trend: '98% rate', trendUp: true, accent: 'bg-emerald-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', loading },
        { title: 'Upcoming', subtitle: 'Scheduled sessions', value: stats?.upcoming || 0, icon: <Layout />, trend: '4 slots', trendUp: false, accent: 'bg-violet-500', iconBg: 'bg-violet-50', iconColor: 'text-violet-600', loading },
        { title: 'Active Today', subtitle: 'Currently running', value: stats?.activeToday || 0, icon: <Activity />, trend: 'Live', trendUp: true, accent: 'bg-orange-500', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', loading },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {cards.map(card => <MetricCard key={card.title} {...card} />)}
        </div>
    );
};
