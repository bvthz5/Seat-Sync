import React from 'react';
import { Zap, Users, Printer, AlertTriangle, PlusCircle, Shield, ChevronRight } from 'lucide-react';

interface Action {
    icon: React.ReactNode;
    label: string;
    desc: string;
    variant: 'primary' | 'default' | 'danger';
}

const actions: Action[] = [
    { icon: <Zap size={16} />, label: 'Auto Allocate', desc: 'Assign seats automatically', variant: 'primary' },
    { icon: <PlusCircle size={16} />, label: 'New Series', desc: 'Create exam series', variant: 'default' },
    { icon: <Users size={16} />, label: 'Staffing', desc: 'Manage invigilators', variant: 'default' },
    { icon: <Printer size={16} />, label: 'Print Assets', desc: 'Hall tickets & reports', variant: 'default' },
    { icon: <Shield size={16} />, label: 'Security', desc: 'Access & audit settings', variant: 'default' },
    { icon: <AlertTriangle size={16} />, label: 'Crisis Mode', desc: 'Emergency protocols', variant: 'danger' },
];

export const QuickActions: React.FC = () => (
    <div className="space-y-2">
        {actions.map(({ icon, label, desc, variant }) => (
            <button
                key={label}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group text-left ${
                    variant === 'primary'
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200'
                        : variant === 'danger'
                        ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-100'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-100'
                }`}
            >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    variant === 'primary' ? 'bg-white/20' :
                    variant === 'danger' ? 'bg-red-100' : 'bg-white border border-slate-200'
                }`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-none">{label}</p>
                    <p className={`text-[10px] mt-0.5 leading-none ${
                        variant === 'primary' ? 'text-white/80' :
                        variant === 'danger' ? 'text-red-500' : 'text-slate-500'
                    }`}>{desc}</p>
                </div>
                <ChevronRight size={13} aria-hidden="true" className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                    variant === 'primary' ? 'text-white/70' : 'text-slate-400'
                }`} />
            </button>
        ))}
    </div>
);