import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const LiveClock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const date = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const clock = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    return (
        <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-200 bg-white text-sm">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium text-xs">{date}</span>
            <span className="w-px h-3 bg-slate-200" />
            <span className="text-slate-800 font-semibold tabular-nums text-xs">{clock}</span>
        </div>
    );
};
