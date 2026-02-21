import React from 'react';
import { AuditLog } from '../../types/audit';
import { format } from 'date-fns';
import { X, ShieldCheck, AlertOctagon, User, Server, Clock, MapPin, Monitor, FileText, Activity } from 'lucide-react';
import { Button, Chip } from '@heroui/react';

interface LogDetailsDrawerProps {
    log: AuditLog | null;
    isOpen: boolean;
    onClose: () => void;
}

export const LogDetailsDrawer: React.FC<LogDetailsDrawerProps> = ({ log, isOpen, onClose }) => {
    if (!log) return null;

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div className={`fixed top-0 right-0 h-full w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-xs font-bold text-slate-400">LOG-ID #{log.LogID}</span>
                                {log.Severity === 'Critical' && <Chip size="sm" color="danger" variant="flat" startContent={<AlertOctagon size={12} />}>CRITICAL</Chip>}
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 break-words leading-tight">{log.Action.replace(/_/g, ' ')}</h2>
                        </div>
                        <Button isIconOnly variant="light" onPress={onClose} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">

                        {/* Summary Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-bold uppercase tracking-wider">
                                    <Clock size={12} /> Timestamp
                                </div>
                                <div className="font-medium text-slate-700 text-sm">
                                    {format(new Date(log.Timestamp), 'PP pp')}
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs font-bold uppercase tracking-wider">
                                    <ShieldCheck size={12} /> Integrity
                                </div>
                                <div className="font-medium text-green-600 text-sm flex items-center gap-1">
                                    Verified & Sealed
                                </div>
                            </div>
                        </div>

                        {/* Actor Details */}
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                <User size={16} className="text-indigo-500" /> Actor Identification
                            </h4>
                            <div className="space-y-3 pl-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">User</span>
                                    <span className="font-medium text-slate-800">{log.User?.Username || 'System / Unknown'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Role</span>
                                    <span className="font-medium text-slate-800 bg-slate-100 px-2 rounded">{log.User?.Role || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-1"><MapPin size={12} /> IP Address</span>
                                    <span className="font-mono text-slate-600">{log.IPAddress || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-1"><Monitor size={12} /> User Agent</span>
                                    <span className="font-mono text-xs text-slate-400 truncate w-48 text-right" title={log.UserAgent}>{log.UserAgent || 'Unknown'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Context Details */}
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                <Activity size={16} className="text-indigo-500" /> Event Context
                            </h4>
                            <div className="space-y-3 pl-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Target Entity</span>
                                    <span className="font-medium text-slate-800">{log.EntityType || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Entity ID</span>
                                    <span className="font-mono text-slate-600">#{log.EntityID || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Status</span>
                                    <span className={`font-bold ${log.Status === 'Success' ? 'text-green-600' : 'text-red-600'}`}>{log.Status}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payload / Metadata */}
                        <div>
                            <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">
                                <Server size={16} className="text-indigo-500" /> Technical Payload
                            </h4>
                            <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                                <pre className="text-xs font-mono text-green-400">
                                    {log.Metadata ? JSON.stringify(log.Metadata, null, 2) : (log.Details || 'No additional payload.')}
                                </pre>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-4">
                        <Button
                            className="flex-1 font-semibold"
                            color="danger"
                            variant="flat"
                            isDisabled={log.Severity !== 'Critical'}
                        >
                            Report Incident
                        </Button>
                        <Button
                            className="flex-1 font-semibold"
                            color="primary"
                            startContent={<FileText size={16} />}
                        >
                            Export Log
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};
