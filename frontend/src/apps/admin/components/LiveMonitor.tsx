import React, { useEffect, useState } from 'react';
import { Chip, Tooltip, Progress } from '@heroui/react';
import { AlertCircle, Users, Box, ChevronRight } from 'lucide-react';
import { DashboardService } from '../services/dashboardService';

export const LiveMonitor: React.FC = () => {
    const [rooms, setRooms] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<'internal' | 'endsem'>('endsem');

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await DashboardService.getRooms(activeTab);
                if (response.success) {
                    setRooms(response.data);
                }
            } catch (err) {
                console.error("fetch rooms failed", err);
            }
        };
        fetchRooms();
    }, [activeTab]);

    return (
        <div className="w-full flex flex-col h-full">
            {/* Tabs */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                <button 
                    onClick={() => setActiveTab('internal')}
                    className={`text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all ${activeTab === 'internal' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                >
                    Internal Exams
                </button>
                <button 
                    onClick={() => setActiveTab('endsem')}
                    className={`text-[11px] font-bold uppercase tracking-wider px-4 py-2 rounded-lg transition-all ${activeTab === 'endsem' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                >
                    End-Semester Exams
                </button>
            </div>
            
            <div className="w-full overflow-hidden flex-1 flex flex-col">
                {/* Table Header - Fixed */}
                <div className="overflow-x-auto w-full bg-slate-50/50 border-b border-slate-100">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[30%]">Facility Information</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[20%]">Current Status</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-[15%]">Load Factor</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[25%]">Utilization Index</th>
                                <th className="px-6 py-3 w-[10%]"></th>
                            </tr>
                        </thead>
                    </table>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto max-h-[450px] custom-scrollbar bg-white">
                    <table className="w-full text-left border-collapse table-fixed">
                        <tbody className="divide-y divide-slate-50">
                            {rooms.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                                        No active halls found for this category.
                                    </td>
                                </tr>
                            ) : rooms.map((room) => (
                                <tr key={room.roomName} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 w-[30%]">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${room.status === 'ACTIVE' || room.status === 'FULL' || room.status === 'OVERLOADED' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <Box size={16} />
                                            </div>
                                            <div className="truncate">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-800 tracking-tight truncate">{room.roomName}</span>
                                                    {(room.status === 'OVERLOADED') && (
                                                        <Tooltip content="Capacity Alert" color="danger" size="sm">
                                                            <AlertCircle size={12} className="text-rose-500 animate-pulse shrink-0" />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate block">REF ID: {room.roomName}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 w-[20%]">
                                        <StatusIndicator status={room.status} />
                                    </td>
                                    <td className="px-6 py-4 w-[15%]">
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm font-bold text-slate-900 leading-none">{room.allocated}</span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">/ {room.capacity}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 w-[25%]">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${(room.capacity > 0 && (room.allocated / room.capacity) > 0.9) ? 'text-rose-600' : 'text-slate-500'}`}>
                                                    {room.capacity > 0 ? Math.round((room.allocated / room.capacity) * 100) : 0}% Capacity
                                                </span>
                                                <Users size={12} className="text-slate-300 shrink-0" />
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${(room.capacity > 0 && (room.allocated / room.capacity) > 0.9) ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${room.capacity > 0 ? Math.min((room.allocated / room.capacity) * 100, 100) : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right w-[10%]">
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
        </div>
    );
};

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    switch (status) {
        case 'ACTIVE':
            return (
                <div className="flex items-center gap-2 text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                </div>
            );
        case 'EMPTY':
            return (
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400/70">Vacant</span>
                </div>
            );
        case 'FULL':
            return (
                <div className="flex items-center gap-2 text-indigo-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Full Capacity</span>
                </div>
            );
        case 'OVERLOADED':
            return (
                <div className="flex items-center gap-2 text-rose-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Overloaded</span>
                </div>
            );
        default:
            return null;
    }
};
