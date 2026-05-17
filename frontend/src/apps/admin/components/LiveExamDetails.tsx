import React, { useState, useEffect } from 'react';
import {
    Tabs,
    Tab,
    Input,
    Avatar,
    ScrollShadow,
    Spinner
} from '@heroui/react';
import { Search, User, MapPin, Activity, ShieldCheck, History, Clock } from 'lucide-react';
import { DashboardService } from '../services/dashboardService';

export const LiveExamDetails: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchSessionData = async () => {
            try {
                const response = await DashboardService.getActiveSessionIntelligence();
                if (response.success) {
                    setData(response.data);
                }
            } catch (error) {
                console.error("Failed to fetch session intelligence:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSessionData();
        const interval = setInterval(fetchSessionData, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center py-20 bg-white">
                <Spinner color="indigo" size="md" />
            </div>
        );
    }

    const metrics = data?.metrics || {
        remainingTime: "01:42:15",
        facilities: "0 Halls",
        candidates: "0 Active",
        presenceRate: "0%",
        integrityHash: "SHA-256: FFFFFFFFFFFFFFFF"
    };

    const students = data?.students || [];
    const logs = data?.logs || [];

    const filteredStudents = students.filter((student: any) =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                            <SessionMetric icon={<Clock />} label="Remaining" value={metrics.remainingTime} />
                            <SessionMetric icon={<MapPin />} label="Facilities" value={metrics.facilities} />
                            <SessionMetric icon={<User />} label="Candidates" value={metrics.candidates} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Live Presence</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-slate-800 tracking-tight">{metrics.presenceRate}</span>
                                    <span className="text-[10px] font-bold text-emerald-600">+1.2%</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-indigo-50/30 border border-indigo-100/50">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Security Hash</p>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
                                    <span className="text-[11px] font-bold text-slate-700 truncate">{metrics.integrityHash}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {selectedTab === 'students' && (
                    <div className="space-y-4">
                        <Input id="field-6qs8519" name="field-6qs8519" aria-label="Filter by ID or Name..." placeholder="Filter by ID, Name or Department..."
                            startContent={<Search size={14} className="text-slate-400" />}
                            size="sm"
                            variant="bordered"
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                        />

                        <ScrollShadow className="max-h-[300px]">
                            {filteredStudents.length === 0 ? (
                                <div className="py-10 text-center text-slate-400 text-xs font-medium">
                                    No matching student records found.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {filteredStudents.map((student: any, idx: number) => (
                                        <div key={`${student.id}-${idx}`} className="py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    name={student.name}
                                                    size="sm"
                                                    className="rounded-lg font-bold text-[10px]"
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
                            )}
                        </ScrollShadow>
                    </div>
                )}

                {selectedTab === 'logs' && (
                    <div className="space-y-3">
                        {logs.length === 0 ? (
                            <div className="py-10 text-center text-slate-400 text-xs font-medium">
                                No recent session events logged.
                            </div>
                        ) : (
                            logs.map((log: any, idx: number) => (
                                <LogEntry key={`${log.time}-${idx}`} text={log.text} time={log.time} level={log.level} />
                            ))
                        )}
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
