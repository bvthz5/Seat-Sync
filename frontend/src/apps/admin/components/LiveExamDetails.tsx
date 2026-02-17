import React, { useState } from 'react';
import {
    Tabs,
    Tab,
    Input,
    Chip,
    Avatar,
    ScrollShadow,
} from '@heroui/react';
import { Search, User, MapPin, Activity, ShieldCheck, History, Clock } from 'lucide-react';

export const LiveExamDetails: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');

    const students = [
        { id: '2022CS01', name: 'Arjun Das', department: 'CSE', seat: 'A-12', status: 'present' },
        { id: '2022CS05', name: 'Meera Nair', department: 'CSE', seat: 'A-15', status: 'absent' },
        { id: '2022CS09', name: 'Kevin Paul', department: 'CSE', seat: 'B-02', status: 'present' },
        { id: '2022EC04', name: 'Sara Khan', department: 'ECE', seat: 'C-08', status: 'present' },
    ];

    return (
        <div className="flex flex-col bg-white">
            <div className="px-6 pt-6 border-b border-slate-50">
                <Tabs
                    selectedKey={selectedTab}
                    onSelectionChange={(key) => setSelectedTab(key as string)}
                    variant="underlined"
                    classNames={{
                        tabList: "gap-6",
                        cursor: "w-full bg-indigo-600",
                        tab: "max-w-fit px-0 h-10",
                        tabContent: "group-data-[selected=true]:text-indigo-600 font-bold text-xs"
                    }}
                >
                    <Tab
                        key="overview"
                        title={
                            <div className="flex items-center gap-2">
                                <Activity size={14} />
                                <span>Overview</span>
                            </div>
                        }
                    />
                    <Tab
                        key="students"
                        title={
                            <div className="flex items-center gap-2">
                                <User size={14} />
                                <span>Audit Students</span>
                            </div>
                        }
                    />
                    <Tab
                        key="logs"
                        title={
                            <div className="flex items-center gap-2">
                                <History size={14} />
                                <span>Session Logs</span>
                            </div>
                        }
                    />
                </Tabs>
            </div>

            <div className="p-6">
                {selectedTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SessionMetric icon={<Clock />} label="Remaining" value="01:42:15" />
                            <SessionMetric icon={<MapPin />} label="Facilities" value="06 Halls" />
                            <SessionMetric icon={<User />} label="Candidates" value="240 Active" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Presence</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-slate-800 tracking-tight">94.2%</span>
                                    <span className="text-[10px] font-bold text-emerald-600">+1.2%</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-indigo-50/30 border border-indigo-100/50">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Security Hash</p>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-indigo-600" />
                                    <span className="text-xs font-bold text-slate-700">SHA-256 Verified</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {selectedTab === 'students' && (
                    <div className="space-y-4">
                        <Input
                            placeholder="Filter by ID or Name..."
                            startContent={<Search size={14} className="text-slate-400" />}
                            size="sm"
                            variant="bordered"
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />

                        <ScrollShadow className="max-h-[300px]">
                            <div className="divide-y divide-slate-50">
                                {students.map((student) => (
                                    <div key={student.id} className="py-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar
                                                name={student.name}
                                                size="sm"
                                                className="rounded-lg font-bold"
                                            />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 leading-tight">{student.name}</p>
                                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">{student.id} • {student.department}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-slate-700 leading-none">{student.seat}</p>
                                                <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mt-1">Seat</p>
                                            </div>
                                            <div className={`h-1.5 w-1.5 rounded-full ${student.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollShadow>
                    </div>
                )}

                {selectedTab === 'logs' && (
                    <div className="space-y-3">
                        <LogEntry text="Hall A attendance syncing" time="10:04" level="info" />
                        <LogEntry text="Seat overlap warning - Hall B" time="10:15" level="warning" />
                        <LogEntry text="Secure keys rotated" time="09:50" level="secure" />
                        <LogEntry text="Session B initialization" time="09:30" level="info" />
                    </div>
                )}
            </div>
        </div>
    );
};

const SessionMetric = ({ icon, label, value }: any) => (
    <div className="p-4 rounded-xl bg-white border border-slate-100 flex items-center gap-3 shadow-xs">
        <div className="text-slate-400 p-2 bg-slate-50 rounded-lg">
            {React.cloneElement(icon, { size: 14 })}
        </div>
        <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">{label}</p>
            <p className="text-xs font-bold text-slate-800 leading-none">{value}</p>
        </div>
    </div>
);

const LogEntry = ({ text, time, level }: any) => {
    const levels: any = {
        info: 'bg-slate-300',
        warning: 'bg-amber-400',
        secure: 'bg-indigo-500'
    };
    return (
        <div className="flex items-center justify-between p-2.5 px-3 rounded-lg bg-slate-50/50 border border-slate-100/50 transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
                <div className={`w-1 h-1 rounded-full ${levels[level]}`} />
                <span className="text-[11px] font-medium text-slate-600">{text}</span>
            </div>
            <span className="text-[9px] font-bold text-slate-300">{time}</span>
        </div>
    );
};
