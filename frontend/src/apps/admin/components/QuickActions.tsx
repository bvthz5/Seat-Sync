import React from 'react';
import { Card, CardBody, CardHeader, Button, Tooltip } from '@heroui/react';
import { Printer, UserX, Play, TriangleAlert } from 'lucide-react';

export const QuickActions: React.FC = () => {
    return (
        <Card className="h-full border-none shadow-sm rounded-2xl bg-white">
            <CardHeader className="px-6 py-5 border-b border-gray-100">
                <h3 className="font-normal text-lg text-[#202124]">Quick Actions</h3>
            </CardHeader>
            <CardBody className="p-6">
                <div className="grid grid-cols-2 gap-4">
                    <ActionButton
                        icon={<Play size={20} />}
                        label="Auto-Allocate"
                        subLabel="Next Slot"
                        color="bg-blue-50 text-blue-600 hover:bg-blue-100"
                    />
                    <ActionButton
                        icon={<UserX size={20} />}
                        label="Swap Invigilator"
                        subLabel="Manage Absence"
                        color="bg-orange-50 text-orange-600 hover:bg-orange-100"
                    />
                    <ActionButton
                        icon={<Printer size={20} />}
                        label="Print Seat Plan"
                        subLabel="2 Pending"
                        color="bg-purple-50 text-purple-600 hover:bg-purple-100"
                    />
                    <ActionButton
                        icon={<TriangleAlert size={20} />}
                        label="Emergency Stop"
                        subLabel="Pause System"
                        color="bg-red-50 text-red-600 hover:bg-red-100"
                    />
                </div>
            </CardBody>
        </Card>
    );
};

interface ActionButtonProps {
    icon: React.ReactNode;
    label: string;
    subLabel: string;
    color: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, subLabel, color }) => {
    return (
        <button className={`flex flex-col items-start justify-center p-4 rounded-xl transition-all duration-200 border border-transparent hover:border-black/5 ${color}`}>
            <div className="mb-3">
                {icon}
            </div>
            <span className="font-semibold text-sm leading-tight">{label}</span>
            <span className="text-[10px] opacity-80 mt-1 uppercase tracking-wider font-medium">{subLabel}</span>
        </button>
    );
};
