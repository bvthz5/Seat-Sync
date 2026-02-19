import React from 'react';
import { AuditLog } from '../../types/audit';
import { format } from 'date-fns';
import { Chip, User, Tooltip, Pagination, Button } from '@heroui/react';
import { Eye, ShieldAlert, CheckCircle, AlertTriangle, AlertCircle, Info, ChevronRight, ChevronLeft, Search as SearchIcon } from 'lucide-react';

interface AuditTableProps {
    logs: AuditLog[];
    onRowClick: (log: AuditLog) => void;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    total: number;
}

const getSeverityDetails = (severity: string) => {
    switch (severity) {
        case 'Critical': return { color: "danger", icon: AlertCircle, bg: "bg-red-50 text-red-600 border-red-200" };
        case 'Warning': return { color: "warning", icon: AlertTriangle, bg: "bg-amber-50 text-amber-600 border-amber-200" };
        case 'Info': return { color: "primary", icon: Info, bg: "bg-blue-50 text-blue-600 border-blue-200" };
        default: return { color: "default", icon: Info, bg: "bg-slate-50 text-slate-600 border-slate-200" };
    }
};

const getStatusColor = (status: string) => {
    return status === 'Success' ? 'success' : 'danger';
};

export const AuditTable: React.FC<AuditTableProps> = ({ logs, onRowClick, page, totalPages, onPageChange, total }) => {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-slate-400" />
                    System Ledger
                </h3>
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{total} Entries</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 w-48">Timestamp</th>
                            <th className="px-6 py-3">Actor & Role</th>
                            <th className="px-6 py-3">Action</th>
                            <th className="px-6 py-3">Severity</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {logs.length > 0 ? (
                            logs.map((log) => {
                                const severity = getSeverityDetails(log.Severity);
                                return (
                                    <tr
                                        key={log.LogID}
                                        onClick={() => onRowClick(log)}
                                        className="group hover:bg-slate-50 cursor-pointer transition-colors duration-150"
                                    >
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                                            {format(new Date(log.Timestamp), 'MMM dd, yyyy')}<br />
                                            <span className="text-slate-400">{format(new Date(log.Timestamp), 'HH:mm:ss')}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold uppercase border border-slate-200">
                                                    {log.User?.Username?.substring(0, 2) || 'SYS'}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-700">{log.User?.Username || 'System'}</div>
                                                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{log.User?.Role || 'Internal'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{log.Action.replace(/_/g, ' ')}</div>
                                            {log.EntityType && (
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Target: {log.EntityType} #{log.EntityID}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${severity.bg}`}>
                                                <severity.icon className="w-3.5 h-3.5" />
                                                {log.Severity}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Chip
                                                size="sm"
                                                variant="flat"
                                                color={getStatusColor(log.Status) as any}
                                                startContent={log.Status === 'Success' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                className="capitalize font-medium"
                                            >
                                                {log.Status}
                                            </Chip>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                isIconOnly
                                                variant="light"
                                                size="sm"
                                                className="text-slate-300 group-hover:text-indigo-600"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6}>
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100 shadow-sm animate-pulse">
                                            <SearchIcon className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p className="font-bold text-slate-500 text-lg">No logs found</p>
                                        <p className="text-sm text-slate-400 mt-1 max-w-xs text-center">We couldn't find any audit trails matching your current filters.</p>
                                        <div className="mt-4">
                                            <Button size="sm" variant="light" color="primary" onPress={() => window.location.reload()}>
                                                Refresh Data
                                            </Button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <Button
                        size="sm"
                        variant="flat"
                        onPress={() => onPageChange(page - 1)}
                        isDisabled={page <= 1}
                        startContent={<ChevronLeft className="w-4 h-4" />}
                    >
                        Previous
                    </Button>
                    <span className="text-xs font-bold text-slate-500">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        size="sm"
                        variant="flat"
                        onPress={() => onPageChange(page + 1)}
                        isDisabled={page >= totalPages}
                        endContent={<ChevronRight className="w-4 h-4" />}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
};
