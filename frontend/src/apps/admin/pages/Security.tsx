
import React, { useEffect, useState } from 'react';
import { Breadcrumbs, BreadcrumbItem, Button, Chip } from "@heroui/react";
import { ShieldCheck, RefreshCcw, Download, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Services
import {
    getDashboardStats,
    getActiveSessions,
    terminateSession,
    terminateAllUserSessions,
    SecurityStats,
    ActiveSession
} from '../services/securityService';

// Components
import { SecurityStatsCards } from '../components/security/SecurityStatsCards';
import { ActiveSessionsPanel } from '../components/security/ActiveSessionsPanel';
import { LoginActivityChart } from '../components/security/LoginActivityChart';
import { RiskAlertsPanel } from '../components/security/RiskAlertsPanel';
import { AccessControlSettings } from '../components/security/AccessControlSettings';
import { AccountProtectionTools } from '../components/security/AccountProtectionTools';

const Security: React.FC = () => {
    const [stats, setStats] = useState<SecurityStats | null>(null);
    const [sessions, setSessions] = useState<ActiveSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            // Parallel fetch for speed
            const [statsRes, sessionsRes] = await Promise.all([
                getDashboardStats(),
                getActiveSessions()
            ]);

            setStats(statsRes);
            setSessions(sessionsRes);
        } catch (error) {
            console.error("Failed to fetch security data", error);
            // toast.error("Failed to load security dashboard data");
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchData();
    };

    const handleTerminateSession = async (sessionId: number) => {
        try {
            await terminateSession(sessionId);
            toast.success("Session terminated successfully");
            setSessions(prev => prev.filter(s => s.SessionID !== sessionId));
            getDashboardStats().then(setStats);
        } catch (error) {
            toast.error("Failed to terminate session");
        }
    };

    const handleTerminateAllUserSessions = async (userId: number) => {
        try {
            await terminateAllUserSessions(userId);
            toast.success("All user sessions terminated");
            handleRefresh();
        } catch (error) {
            toast.error("Failed to terminate user sessions");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="p-6 max-w-[1600px] mx-auto min-h-screen font-sans text-slate-800 bg-slate-50/40"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-slate-200/60 relative">
                <div className="flex flex-col gap-2 relative z-10">
                    <Breadcrumbs size="sm" className="mb-1" itemClasses={{ item: "text-slate-400 data-[current=true]:text-slate-600 font-medium" }}>
                        <BreadcrumbItem href="/admin">Admin</BreadcrumbItem>
                        <BreadcrumbItem>Security</BreadcrumbItem>
                        <BreadcrumbItem>Dashboard</BreadcrumbItem>
                    </Breadcrumbs>
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-extrabold tracking-tight text-black leading-tight">
                            Security Command Center
                        </h1>
                        <Chip
                            startContent={<ShieldCheck className="w-3.5 h-3.5" />}
                            variant="flat"
                            color="success"
                            className="font-bold uppercase tracking-wider text-[10px] h-6 bg-green-100 text-green-700 border border-green-200"
                            size="sm"
                        >
                            System Protected
                        </Chip>
                    </div>
                    <p className="text-slate-500 font-medium text-lg max-w-2xl leading-relaxed">
                        Real-time session monitoring, risk analysis, and access control enforcement.
                    </p>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <Button
                        startContent={<RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
                        variant="solid"
                        color="primary"
                        onPress={handleRefresh}
                        isLoading={isRefreshing}
                        className="font-semibold shadow-md shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700"
                    >
                        Refresh Data
                    </Button>
                    <Button
                        startContent={<Download className="w-4 h-4 text-slate-500" />}
                        variant="bordered"
                        className="font-semibold text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
                    >
                        Export Report
                    </Button>
                    <Button
                        isIconOnly
                        variant="light"
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </Button>
                </div>

                {/* Decorative background element behind header */}
                <div className="absolute top-[-20%] right-[-5%] w-[300px] h-[300px] bg-indigo-50/50 rounded-full blur-3xl pointer-events-none -z-0" />
            </div>

            {/* Security Overview Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                <SecurityStatsCards stats={stats} />
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Column */}
                <div className="xl:col-span-8 flex flex-col gap-8">
                    {/* Active Sessions Panel */}
                    <ActiveSessionsPanel
                        sessions={sessions}
                        onTerminate={handleTerminateSession}
                        onTerminateAll={handleTerminateAllUserSessions}
                        isLoading={isLoading}
                        onRefresh={handleRefresh}
                    />

                    {/* Login Activity Graph */}
                    {stats && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <LoginActivityChart data={stats.loginActivity} />
                        </motion.div>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="xl:col-span-4 flex flex-col gap-6">
                    {/* Risk & Alerts Panel */}
                    <RiskAlertsPanel stats={stats!} />

                    {/* Access Control Settings */}
                    <AccessControlSettings />

                    {/* Account Protection Tools */}
                    <AccountProtectionTools />
                </div>
            </div>
        </motion.div>
    );
};

export default Security;
