import React from 'react';
import { Avatar } from '@heroui/react';
import { Clock, ShieldCheck, User } from 'lucide-react';

const activities = [
    { id: 1, user: 'John Doe', action: 'Approved', target: 'Room 101 Allocation', time: '2m ago', type: 'success' },
    { id: 2, user: 'Jane Smith', action: 'Modified', target: 'Staff Schedule', time: '15m ago', type: 'info' },
    { id: 3, user: 'Admin', action: 'System Alert', target: 'Backup Completed', time: '1h ago', type: 'system' },
    { id: 4, user: 'Mike Ross', action: 'Report', target: 'Exam Series B Generated', time: '3h ago', type: 'info' },
    { id: 5, user: 'System', action: 'Audit', target: 'Log integrity verified', time: '5h ago', type: 'system' },
];

export const ActivityFeed: React.FC = () => {
    return (
        <div className="relative pl-4">
            <div className="absolute left-[3px] top-2 bottom-2 w-px bg-slate-100"></div>

            <div className="space-y-6">
                {activities.map((activity) => (
                    <div key={activity.id} className="relative">
                        {/* Minimalist Timeline Marker */}
                        <div className={`absolute -left-[16px] top-1.5 h-1.5 w-1.5 rounded-full border border-white z-10 ${activity.type === 'success' ? 'bg-emerald-500' :
                                activity.type === 'system' ? 'bg-indigo-500' :
                                    'bg-slate-300'
                            }`}></div>

                        <div className="flex items-start gap-3">
                            <Avatar
                                src={`https://i.pravatar.cc/150?u=${activity.user}`}
                                className="w-8 h-8 rounded-lg border border-slate-100"
                                fallback={<User size={14} className="text-slate-400" />}
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-bold text-slate-800 truncate tracking-tight">{activity.user}</p>
                                    <div className="flex items-center gap-1 text-slate-300 shrink-0">
                                        <Clock size={10} />
                                        <span className="text-[9px] font-bold uppercase">{activity.time}</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                    <span className="font-bold text-indigo-600/70">{activity.action}</span> {activity.target}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button className="w-full mt-8 py-2.5 rounded-lg border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-colors">
                Audit Logs Archive
            </button>
        </div>
    );
};
