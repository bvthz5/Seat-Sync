import React from 'react';
import { Activity } from 'lucide-react';

const AuditLogs: React.FC = () => {
    return (
        <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
                <Activity className="w-8 h-8 text-blue-600" />
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Audit & Logs</h1>
                    <p className="text-slate-600 mt-1">View all system activity and admin actions</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200 text-center">
                <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-700 mb-2">Audit Logs Coming Soon</h2>
                <p className="text-slate-500">
                    This page will display comprehensive activity logs for all admin actions and system events.
                </p>
            </div>
        </div>
    );
};

export default AuditLogs;
