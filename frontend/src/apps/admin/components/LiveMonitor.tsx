import React from 'react';
import { Card, CardBody, CardHeader, Chip, Tooltip } from '@heroui/react';
import { MoreHorizontal, AlertCircle } from 'lucide-react';

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
        <Card className="h-full border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="px-6 py-5 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
                <div className="flex flex-col gap-1">
                    <h3 className="font-normal text-lg text-[#202124]">Live Occupancy</h3>
                    <p className="text-xs text-[#5f6368]">Real-time room status across campus</p>
                </div>
                <button className="text-[#5f6368] hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <MoreHorizontal size={20} />
                </button>
            </CardHeader>
            <CardBody className="p-0 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f8f9fa] sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Room</th>
                            <th className="px-6 py-3 text-xs font-semibold text-[#5f6368] uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-[#5f6368] uppercase tracking-wider text-right">Capacity</th>
                            <th className="px-6 py-3 text-xs font-semibold text-[#5f6368] uppercase tracking-wider text-right w-1/3">Utilization</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rooms.map((room) => (
                            <tr key={room.id} className="hover:bg-[#f8f9fa] transition-colors group cursor-default">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-[#202124]">{room.name}</span>
                                        {room.issue && (
                                            <Tooltip content=" overcrowding alert">
                                                <AlertCircle size={14} className="text-orange-500" />
                                            </Tooltip>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-[#5f6368]">ID: {room.id}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusPill status={room.status} />
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="text-sm text-[#5f6368] font-medium">{room.occupied}</span>
                                    <span className="text-xs text-gray-400 mx-1">/</span>
                                    <span className="text-xs text-[#5f6368]">{room.capacity}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className="text-xs font-semibold text-[#5f6368]">{Math.round((room.occupied / room.capacity) * 100)}%</span>
                                        <div className="w-full h-1.5 bg-[#e8eaed] rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${(room.occupied / room.capacity) > 0.9 ? 'bg-[#ea4335]' :
                                                    (room.occupied / room.capacity) > 0.7 ? 'bg-[#fbbc04]' : 'bg-[#1a73e8]'
                                                    }`}
                                                style={{ width: `${(room.occupied / room.capacity) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardBody>
        </Card>
    );
};

const StatusPill = ({ status }: { status: string }) => {
    switch (status) {
        case 'active':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-700 border border-green-200/50">Active</span>;
        case 'vacant':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-50 text-gray-600 border border-gray-200/50">Vacant</span>;
        case 'prep':
            return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 border border-blue-200/50">Prep</span>;
        default:
            return null;
    }
};
