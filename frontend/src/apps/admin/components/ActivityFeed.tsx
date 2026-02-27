import React from 'react';
import { CheckCircle2, Info, Cpu, Clock } from 'lucide-react';

const activities = [
    { id: 1, user: 'John Doe', initials: 'JD', action: 'Approved', target: 'Room 101 Allocation', time: '2m ago', type: 'success' },
    { id: 2, user: 'Jane Smith', initials: 'JS', action: 'Modified', target: 'Staff Schedule', time: '15m ago', type: 'info' },
    { id: 3, user: 'System', initials: 'SY', action: 'Alert', target: 'Backup Completed', time: '1h ago', type: 'system' },
    { id: 4, user: 'Mike Ross', initials: 'MR', action: 'Generated', target: 'Exam Series B Report', time: '3h ago', type: 'info' },
    { id: 5, user: 'System', initials: 'SY', action: 'Verified', target: 'Log integrity check', time: '5h ago', type: 'system' },
];

const typeConfig = {
    success: { dot: 'bg-emerald-500', icon: <CheckCircle2 size={10} />, badge: 'bg-emerald-50 text-emerald-700' },
    info: { dot: 'bg-indigo-500', icon: <Info size={10} />, badge: 'bg-indigo-50 text-indigo-700' },
    system: { dot: 'bg-slate-400', icon: <Cpu size={10} />, badge: 'bg-slate-100 text-slate-600' },
};

export const ActivityFeed: React.FC = () => (
    <div className="space-y-3">
        {activities.map((activity) => {
            const cfg = typeConfig[activity.type as keyof typeof typeConfig];
            return (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0 border border-slate-200">
                        {activity.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800 leading-tight">{activity.user}</p>
                            <div className="flex items-center gap-1 text-slate-400 shrink-0">
                                <Clock size={9} />
                                <span className="text-[10px]">{activity.time}</span>
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                            <span className={`inline-block rounded px-1.5 py-px text-[10px] font-semibold mr-1 ${cfg.badge}`}>{activity.action}</span>
                            {activity.target}
                        </p>
                    </div>
                </div>
            );
        })}
        <button className="w-full mt-1 py-2 rounded-xl border border-dashed border-slate-200 text-[11px] font-semibold text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all">
            View full audit log
        </button>
    </div>
);
