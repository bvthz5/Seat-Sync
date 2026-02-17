import React from 'react';
import {
    Zap,
    Users,
    Printer,
    AlertTriangle,
    PlusCircle,
    Shield
} from 'lucide-react';

export const QuickActions: React.FC = () => {
    return (
        <div className="grid grid-cols-2 gap-3">
            <ActionButton
                icon={<Zap size={16} />}
                label="Auto Allocate"
                color="indigo"
            />
            <ActionButton
                icon={<Users size={16} />}
                label="Staffing"
                color="slate"
            />
            <ActionButton
                icon={<Printer size={16} />}
                label="Print Assets"
                color="slate"
            />
            <ActionButton
                icon={<AlertTriangle size={16} />}
                label="Crisis Mode"
                color="orange"
            />
            <ActionButton
                icon={<PlusCircle size={16} />}
                label="New Series"
                color="slate"
            />
            <ActionButton
                icon={<Shield size={16} />}
                label="Security"
                color="slate"
            />
        </div>
    );
};

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    color: 'indigo' | 'slate' | 'orange';
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, color }) => {
    const themes = {
        indigo: 'text-indigo-600 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white',
        slate: 'text-slate-600 bg-slate-50 hover:bg-slate-800 hover:text-white',
        orange: 'text-orange-600 bg-orange-50/50 hover:bg-orange-600 hover:text-white',
    };

    return (
        <button className={`flex items-center gap-3 p-3 rounded-lg border border-transparent transition-all duration-200 text-left font-bold text-xs ${themes[color]}`}>
            <div className="shrink-0">{icon}</div>
            <span className="tracking-tight">{label}</span>
        </button>
    );
};
