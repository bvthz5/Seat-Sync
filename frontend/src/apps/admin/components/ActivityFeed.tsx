import React from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Check, Info, AlertTriangle, FileText, ArrowRight } from 'lucide-react';

const activities = [
    { id: 1, type: 'success', text: "Generated seating plan for 'Math 101'", time: '10 min ago', icon: Check },
    { id: 2, type: 'warning', text: "Auto-sync retried for 'Hall B'", time: '32 min ago', icon: AlertTriangle },
    { id: 3, type: 'error', text: "Invigilator conflict in 'Lab 1'", time: '1 hour ago', icon: Info },
    { id: 4, type: 'info', text: "Bulk student import completed", time: '2 hours ago', icon: FileText },
];

export const ActivityFeed: React.FC = () => {
    return (
        <Card className="h-full border-none shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="px-6 py-5 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
                <div className="flex flex-col gap-1">
                    <h3 className="font-normal text-lg text-[#202124]">Recent Activity</h3>
                    <p className="text-xs text-[#5f6368]">Audit log of system events</p>
                </div>
                <button className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    View All
                </button>
            </CardHeader>
            <CardBody className="p-0 overflow-auto custom-scrollbar">
                <div className="flex flex-col">
                    {activities.map((item, index) => (
                        <div
                            key={item.id}
                            className={`flex items-start gap-4 px-6 py-4 hover:bg-[#f8f9fa] transition-colors group cursor-pointer ${index !== activities.length - 1 ? 'border-b border-gray-50' : ''}`}
                        >
                            {/* Icon Container */}
                            <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${item.type === 'success' ? 'bg-green-100 text-green-700' :
                                item.type === 'warning' ? 'bg-orange-100 text-orange-700' :
                                    item.type === 'error' ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                }`}>
                                <item.icon size={14} strokeWidth={2.5} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#202124] leading-snug group-hover:text-blue-600 transition-colors">{item.text}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] text-[#5f6368] font-medium bg-gray-100 px-1.5 rounded">{item.time}</span>
                                    <span className="text-[10px] text-gray-400">• System Automated</span>
                                </div>
                            </div>

                            {/* Chevron */}
                            <ArrowRight size={14} className="self-center text-gray-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 transform" />
                        </div>
                    ))}
                </div>
            </CardBody>
        </Card>
    );
};
