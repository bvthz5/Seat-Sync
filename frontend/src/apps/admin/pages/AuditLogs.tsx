import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../utils/toast';
import { AuditService } from '../services/auditService';
import { AuditLog, AuditStats, LogFilters } from '../types/audit';
import { AuditStatsCards } from '../components/audit-logs/AuditStatsCards';
import { AuditFilters } from '../components/audit-logs/AuditFilters';
import { AuditTable } from '../components/audit-logs/AuditTable';
import { LogDetailsDrawer } from '../components/audit-logs/LogDetailsDrawer';
import { Button, Chip } from '@heroui/react';
import { RefreshCcw, Download, ShieldCheck, FileText, CheckCircle } from 'lucide-react';

const AuditLogs: React.FC = () => {
    const { user } = useAuth(); // Assuming only admin can access

    // State
    const [stats, setStats] = useState<AuditStats>({
        totalToday: 0,
        emergencyActions: 0,
        adminActions: 0,
        systemEvents: 0
    });

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [filters, setFilters] = useState<LogFilters>({});

    // Drawer
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Fetch Data
    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await AuditService.getLogs(page, 20, filters);
            setLogs(response.data.logs);
            setTotal(response.data.total);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            toast.error("Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    const fetchStats = async () => {
        try {
            const response = await AuditService.getStats();
            setStats(response.data);
        } catch (error) {
            console.error("Failed to load stats", error);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchStats();
    }, []);

    const handleFilterChange = (newFilters: LogFilters) => {
        setFilters(newFilters);
        setPage(1); // Reset to page 1
    };

    const handleRowClick = (log: AuditLog) => {
        setSelectedLog(log);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedLog(null), 300); // Wait for transition
    };

    const handleExport = () => {
        if (logs.length === 0) return;

        const headers = ["LogID", "Timestamp", "Actor", "Role", "Action", "EntityType", "EntityID", "Severity", "Status", "Details", "IPAddress"];
        const csvContent = [
            headers.join(","),
            ...logs.map(log => [
                log.LogID,
                `"${new Date(log.Timestamp).toISOString()}"`,
                `"${log.User?.Username || 'System'}"`,
                `"${log.User?.Role || ''}"`,
                `"${log.Action}"`,
                `"${log.EntityType || ''}"`,
                log.EntityID || '',
                log.Severity,
                log.Status,
                `"${(log.Details || '').replace(/"/g, '""')}"`,
                log.IPAddress || ''
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                            Audit & Logs
                        </h1>
                        <Chip
                            color="success"
                            variant="flat"
                            size="sm"
                            startContent={<CheckCircle size={12} />}
                            className="font-bold uppercase tracking-wider text-xs border border-green-200 bg-green-50 text-green-700"
                        >
                            System Integrity: Stable
                        </Chip>
                    </div>
                    <p className="text-slate-500 font-medium mt-1">Monitor system activity, admin actions, and lifecycle events.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="flat"
                        color="primary"
                        onPress={() => { fetchLogs(); fetchStats(); }}
                        isLoading={loading}
                        startContent={<RefreshCcw className="w-4 h-4" />}
                        className="font-semibold"
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="flat"
                        color="secondary"
                        onPress={handleExport}
                        startContent={<Download className="w-4 h-4" />}
                        className="font-semibold"
                    >
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <AuditStatsCards stats={stats} />

            {/* Main Content Area */}
            <div className="space-y-4">
                {/* Advanced Filter Bar */}
                <AuditFilters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onClear={() => handleFilterChange({})}
                />

                {/* Logs Table */}
                <AuditTable
                    logs={logs}
                    onRowClick={handleRowClick}
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    total={total}
                />
            </div>

            {/* Activity Drawer */}
            <LogDetailsDrawer
                log={selectedLog}
                isOpen={isDrawerOpen}
                onClose={closeDrawer}
            />
        </div>
    );
};

export default AuditLogs;
