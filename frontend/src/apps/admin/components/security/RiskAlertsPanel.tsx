
import React from 'react';
import { Card, CardHeader, CardBody, Chip, Button } from "@heroui/react";
import { AlertOctagon, ShieldAlert, AlertTriangle, Info, ChevronRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SecurityStats } from '../../services/securityService';

interface RiskAlertsPanelProps {
    stats: SecurityStats | null;
}

export const RiskAlertsPanel: React.FC<RiskAlertsPanelProps> = ({ stats }) => {
    // Generate alerts based on real stats
    const alerts = [];

    if (!stats) return null;

    if (stats.failedLogins24h > 5) {
        alerts.push({
            id: 1,
            title: "Potential Brute Force Attack",
            desc: `Detected ${stats.failedLogins24h} failed login attempts in the last 24 hours.`,
            severity: "High",
            time: "Last 24h",
            icon: ShieldAlert,
            color: "danger"
        });
    }

    if (stats.rootLogins24h > 0) {
        alerts.push({
            id: 2,
            title: "Root Admin Access",
            desc: `Root account accessed ${stats.rootLogins24h} times recently. Verify this activity.`,
            severity: "Medium",
            time: "Recent",
            icon: AlertTriangle,
            color: "warning"
        });
    }

    if (stats.activeSessions > 50) {
        alerts.push({
            id: 3,
            title: "High Session Volume",
            desc: `Unusually high number of active sessions (${stats.activeSessions}).`,
            severity: "Low",
            time: "Now",
            icon: Info,
            color: "primary"
        });
    }

    // Default "Clean" state if no alerts
    if (alerts.length === 0) {
        return (
            <Card className="border border-green-100 bg-green-50/30 shadow-sm rounded-2xl overflow-hidden h-full min-h-[400px]">
                <CardHeader className="flex justify-between items-center p-4 border-b border-green-100/50">
                    <h3 className="text-sm font-bold text-green-800 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        Risk & Alerts
                    </h3>
                </CardHeader>
                <CardBody className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <CheckCircle2 className="w-12 h-12 text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-green-900">All Systems Secure</h4>
                    <p className="text-sm text-green-700 mt-2 max-w-xs">
                        No security threats or anomalies detected in the last 24 hours.
                    </p>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden h-full min-h-[400px]">
            <CardHeader className="flex justify-between items-center p-4 bg-slate-50/50 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-red-500" />
                    Risk & Alerts
                    <Chip size="sm" color="danger" variant="flat" className="ml-2 px-1 h-5 text-[10px] font-bold">
                        {alerts.length} NEW
                    </Chip>
                </h3>
            </CardHeader>
            <CardBody className="p-0">
                <div className="divide-y divide-slate-100">
                    {alerts.map((alert) => (
                        <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4 group cursor-pointer">
                            <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alert.severity === 'High' ? 'bg-red-50 text-red-600' :
                                alert.severity === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                    'bg-blue-50 text-blue-600'
                                }`}>
                                <alert.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h5 className="text-sm font-bold text-slate-800">{alert.title}</h5>
                                    <span className="text-[10px] font-medium text-slate-400">{alert.time}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                    {alert.desc}
                                </p>
                                <div className="flex items-center gap-2 mt-3">
                                    <Chip
                                        size="sm"
                                        variant="dot"
                                        color={alert.color as any}
                                        className="border-0 px-0 gap-1 text-[10px] font-bold uppercase tracking-wider"
                                    >
                                        {alert.severity} Priority
                                    </Chip>
                                    <span className="text-[10px] font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex items-center cursor-pointer">
                                        View Details <ChevronRight className="w-3 h-3 ml-0.5" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                    <Button fullWidth variant="flat" size="sm" color="default" className="font-medium text-slate-600">
                        View All Security Events
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
};


