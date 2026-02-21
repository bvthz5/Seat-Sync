
import React from 'react';
import { Card, CardBody } from '@heroui/react';
import { Bell, AlertTriangle, ShieldAlert, Activity, FileText } from 'lucide-react';
import { NotificationStats } from '../../services/notificationService';

interface NotificationStatsProps {
    stats: NotificationStats;
}

export const NotificationStatsDisplay: React.FC<NotificationStatsProps> = ({ stats }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                <CardBody className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">Total Unread</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.unread}</h3>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Bell size={20} className="text-white" />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card className="border-none shadow-sm bg-gradient-to-br from-rose-500 to-rose-600 text-white">
                <CardBody className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-rose-100 text-sm font-medium">Critical Alerts</p>
                            <h3 className="text-3xl font-bold mt-1">{stats.critical}</h3>
                        </div>
                        <div className="p-2 bg-white/20 rounded-lg">
                            <AlertTriangle size={20} className="text-white" />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card className="border-none shadow-sm bg-white">
                <CardBody className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">System Health</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-1">98%</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <Activity size={20} className="text-emerald-600" />
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card className="border-none shadow-sm bg-white">
                <CardBody className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Security Log</p>
                            <h3 className="text-3xl font-bold text-slate-800 mt-1">24</h3>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <ShieldAlert size={20} className="text-amber-600" />
                        </div>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};
