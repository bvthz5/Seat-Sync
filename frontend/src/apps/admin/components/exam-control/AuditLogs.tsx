import React from 'react';
import { Activity, User } from 'lucide-react';
import { ActivityLog } from '../../types/examControl';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { format } from 'date-fns';

interface AuditLogsProps {
    logs: ActivityLog[];
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ logs }) => {
    return (
        <Card className="max-h-[600px]">
            <CardHeader className="pb-3 border-b flex gap-2 items-center">
                <Activity className="w-4 h-4" />
                <span className="font-semibold text-lg">Audit Trail</span>
            </CardHeader>
            <CardBody className="p-0 overflow-y-auto">
                {logs.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No recent activity recorded.</div>
                ) : (
                    <div className="divide-y">
                        {logs.map((log) => (
                            <div key={log.LogID} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                                <div className="mt-1">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <User className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm font-semibold text-slate-800">
                                            {log.User?.Username || 'System'}
                                            <span className="text-xs font-normal text-slate-500 ml-2">({log.User?.Role})</span>
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            {format(new Date(log.Timestamp), 'MMM dd, HH:mm:ss')}
                                        </span>
                                    </div>
                                    <div className="text-xs font-bold text-indigo-600">{log.Action}</div>
                                    <p className="text-sm text-slate-600 leading-relaxed">{log.Details}</p>
                                    <div className="text-[10px] text-slate-400 font-mono mt-1">IP: {log.IPAddress}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};
