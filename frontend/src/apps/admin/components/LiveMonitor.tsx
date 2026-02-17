import React from 'react';
import { Chip, Tooltip, Progress } from '@heroui/react';
import { AlertCircle, Users, Box, ChevronRight } from 'lucide-react';

const rooms = [
    { id: '101', name: 'Main Hall A', status: 'active', capacity: 60, occupied: 45, issue: false },
    { id: '102', name: 'Lecture Hall B', status: 'active', capacity: 40, occupied: 38, issue: true },
    { id: '103', name: 'Computer Lab 1', status: 'vacant', capacity: 30, occupied: 0, issue: false },
    { id: '104', name: 'Seminar Hall C', status: 'active', capacity: 100, occupied: 92, issue: false },
    { id: '201', name: 'Drawing Hall D', status: 'prep', capacity: 50, occupied: 0, issue: false },
    { id: '202', name: 'Multimedia Lab', status: 'active', capacity: 30, occupied: 15, issue: false },
];

export const LiveMonitor: React.FC = () => {
    return (
        <div className="w-full overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility Information</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Load Factor</th>
                            <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilization Index</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {rooms.map((room) => (
                            <tr key={room.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${room.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                            <Box size={16} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-800 tracking-tight">{room.name}</span>
                                                {room.issue && (
                                                    <Tooltip content="Capacity Alert" color="danger" size="sm">
                                                        <AlertCircle size={12} className="text-rose-500 animate-pulse" />
                                                    </Tooltip>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">REF ID: {room.id}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusIndicator status={room.status} />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-center">
                                        <span className="text-sm font-bold text-slate-900 leading-none">{room.occupied}</span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">/ {room.capacity}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 min-w-[180px]">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${(room.occupied / room.capacity) > 0.9 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                {Math.round((room.occupied / room.capacity) * 100)}% Capacity
                                            </span>
                                            <Users size={12} className="text-slate-300" />
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ${(room.occupied / room.capacity) > 0.9 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${(room.occupied / room.capacity) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-1 px-2 text-slate-400 hover:text-indigo-600 transition-colors">
                                        <ChevronRight size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    switch (status) {
        case 'active':
            return (
                <div className="flex items-center gap-2 text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                </div>
            );
        case 'vacant':
            return (
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400/70">Vacant</span>
                </div>
            );
        case 'prep':
            return (
                <div className="flex items-center gap-2 text-indigo-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Staging</span>
                </div>
            );
        default:
            return null;
    }
};
