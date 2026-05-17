import React, { useEffect, useState } from 'react';
import { CheckCircle2, Info, Cpu, Clock } from 'lucide-react';
import { AuditService } from '../services/auditService';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@heroui/react';

const typeConfig = {
    success: { dot: 'bg-emerald-500', icon: <CheckCircle2 size={10} />, badge: 'bg-emerald-50 text-emerald-700' },
    info: { dot: 'bg-indigo-500', icon: <Info size={10} />, badge: 'bg-indigo-50 text-indigo-700' },
    system: { dot: 'bg-slate-400', icon: <Cpu size={10} />, badge: 'bg-slate-100 text-slate-600' },
};

export const ActivityFeed: React.FC = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await AuditService.getLogs(1, 5);
                if (response.success && response.data?.logs) {
                    setLogs(response.data.logs);
                }
            } catch (error) {
                console.error("Failed to load dashboard activity feed:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 15000); // refresh every 15s
        return () => clearInterval(interval);
    }, []);

    if (loading && logs.length === 0) {
        return (
            <div className="flex justify-center items-center py-10 bg-white">
                <Spinner color="indigo" size="sm" />
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="py-6 text-center text-xs font-semibold text-slate-400 bg-white">
                No recent activities recorded.
            </div>
        );
    }

    return (
        <div className="space-y-3 bg-white">
            {logs.map((log: any, idx: number) => {
                const initials = log.User?.FullName 
                    ? log.User.FullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() 
                    : 'SY';
                const user = log.User?.FullName || 'System';
                const action = log.Action || 'Executed';
                const target = log.Details || 'System event';

                // Time mapping
                const timestamp = new Date(log.Timestamp);
                const time = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                let type: 'success' | 'info' | 'system' = 'info';
                if (log.Status?.toLowerCase() === 'success') type = 'success';
                else if (log.Severity?.toLowerCase() === 'critical' || !log.User) type = 'system';

                const cfg = typeConfig[type];

                return (
                    <div key={`${log.LogID}-${idx}`} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50/80 transition-colors group">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 shrink-0 border border-slate-200 uppercase">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-800 leading-tight">{user}</p>
                                <div className="flex items-center gap-1 text-slate-400 shrink-0">
                                    <Clock size={9} />
                                    <span className="text-[10px]">{time}</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                <span className={`inline-block rounded px-1.5 py-px text-[10px] font-semibold mr-1 uppercase ${cfg.badge}`}>{action}</span>
                                {target}
                            </p>
                        </div>
                    </div>
                );
            })}
            <button 
                onClick={() => navigate('/admin/audit-logs')}
                className="w-full mt-1 py-2 rounded-xl border border-dashed border-slate-200 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
            >
                View full audit log
            </button>
        </div>
    );
};
