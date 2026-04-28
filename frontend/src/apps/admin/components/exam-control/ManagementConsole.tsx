
import React, { useEffect, useState } from 'react';
import { Exam, ExamStatus, ExamDetail, ActivityLog } from '../../types/examControl';
import { ExamControlService } from '../../services/examControlService';
import { LifecycleTimeline } from './LifecycleTimeline';
import { Button, Badge, Card, CardBody, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import {
    Users, LayoutGrid, CheckCircle2, Lock, Clock, AlertTriangle,
    FileEdit, Trash2, Armchair, Eye, EyeOff, Mic2, PauseCircle, Archive, History, ChevronDown
} from 'lucide-react';
import { toast } from '../../../../utils/toast';
import { format } from 'date-fns';

interface ManagementConsoleProps {
    exam: Exam;
    allExams: Exam[]; // For the dropdown switcher
    onRefresh: () => void;
    onSelectExam: (exam: Exam) => void;
}

export const ManagementConsole: React.FC<ManagementConsoleProps> = ({ exam, allExams, onRefresh, onSelectExam }) => {
    const [detail, setDetail] = useState<ExamDetail | null>(null);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchDetails();
    }, [exam.ExamID]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const [detailRes, logsRes] = await Promise.all([
                ExamControlService.getDetails(exam.ExamID),
                ExamControlService.getLogs(exam.ExamID)
            ]);
            setDetail(detailRes.data);
            setLogs(logsRes.data.slice(0, 5)); // Mini logs
        } catch (error) {
            toast.error("Failed to load exam details");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (status: ExamStatus, reason: string) => {
        try {
            await ExamControlService.updateStatus(exam.ExamID, status, reason);
            toast.success(`Exam status updated to ${status}`);
            onRefresh();
            fetchDetails();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Status update failed");
        }
    };

    const handleAction = async (action: string) => {
        // Implement specific actions logic here (e.g., modals for editing, etc.)
        // For now, placeholders toast.
        toast.success(`Action triggered: ${action}`);
        // In real impl, open modal or call service
    };

    if (!detail) return <div className="p-10 text-center">Loading Console...</div>;

    const metrics = detail.metrics;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Context Panel */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                    <div>
                        {/* Dropdown for Exam Selection */}
                        <Dropdown>
                            <DropdownTrigger>
                                <Button
                                    variant="light"
                                    className="text-2xl font-black text-slate-800 p-0 h-auto min-w-0 justify-start mb-1 hover:bg-transparent"
                                    endContent={<ChevronDown className="w-5 h-5 text-slate-400" />}
                                >
                                    {detail.ExamName}
                                </Button>
                            </DropdownTrigger>
                            <DropdownMenu
                                aria-label="Select Exam"
                                className="max-h-60 overflow-y-auto"
                                onAction={(key) => {
                                    const selected = allExams.find(e => e.ExamID === Number(key));
                                    if (selected) onSelectExam(selected);
                                }}
                            >
                                {allExams.map(e => (
                                    <DropdownItem key={e.ExamID} description={e.Session} textValue={e.ExamName}>
                                        {e.ExamName}
                                    </DropdownItem>
                                ))}
                            </DropdownMenu>
                        </Dropdown>

                        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(new Date(detail.ExamDate), 'EEE, dd MMM yyyy')} • {detail.Session}
                            </span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {metrics.studentsAllocated} Candidates
                            </span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="flex items-center gap-1">
                                <LayoutGrid className="w-4 h-4" />
                                {metrics.roomsAllocated} Rooms
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Status</div>
                            <Badge
                                content=""
                                color={
                                    detail.Status === ExamStatus.PUBLISHED ? "success" :
                                        detail.Status === ExamStatus.IN_PROGRESS ? "primary" : "warning"
                                }
                                shape="circle"
                                placement="top-right"
                            >
                                <div className={`
                                    px-4 py-1.5 rounded-lg font-bold text-sm border
                                    ${detail.Status === ExamStatus.PUBLISHED ? 'bg-green-50 text-green-700 border-green-200' : ''}
                                    ${detail.Status === ExamStatus.IN_PROGRESS ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                    ${detail.Status === ExamStatus.DRAFT ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                    ${detail.Status === ExamStatus.READY ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : ''}
                                    ${detail.Status === ExamStatus.COMPLETED ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                                `}>
                                    {detail.Status}
                                </div>
                            </Badge>
                        </div>

                        {/* Status Indicators */}
                        <div className="flex gap-2">
                            <div className={`p-2 rounded-lg border ${metrics.seatingGenerated ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`} title="Seating Generated">
                                <Armchair className={`w-5 h-5 ${metrics.seatingGenerated ? 'text-green-600' : 'text-slate-400'}`} />
                            </div>
                            <div className={`p-2 rounded-lg border ${metrics.attendanceLocked ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`} title="Attendance Locked">
                                <Lock className={`w-5 h-5 ${metrics.attendanceLocked ? 'text-red-600' : 'text-slate-400'}`} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 1: Lifecycle Control */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-500" />
                        Lifecycle Pipeline
                    </h3>
                    <span className="text-xs font-mono text-slate-400">STATE_MACHINE: ENFORCED</span>
                </div>
                <LifecycleTimeline
                    currentStatus={detail.Status}
                    examId={detail.ExamID}
                    examName={detail.ExamName}
                    onUpdateStatus={handleStatusUpdate}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Section 2: Operational Controls */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-full">
                        <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            Operational Controls
                        </h3>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {/* Dynamic Actions based on Status */}
                            {detail.Status === ExamStatus.DRAFT && (
                                <>
                                    <Button color="primary" variant="flat" startContent={<FileEdit className="w-4 h-4" />} onPress={() => handleAction('Edit Exam')}>Edit Exam</Button>
                                    <Button color="secondary" variant="flat" startContent={<Armchair className="w-4 h-4" />} onPress={() => handleAction('Generate Seating')}>Generate Seating</Button>
                                    <Button color="danger" variant="flat" startContent={<Trash2 className="w-4 h-4" />} onPress={() => handleAction('Delete Exam')}>Delete Exam</Button>
                                </>
                            )}

                            {detail.Status === ExamStatus.READY && (
                                <>
                                    <Button className="bg-green-600 text-white shadow-lg shadow-green-200" startContent={<Eye className="w-4 h-4" />} onPress={() => handleStatusUpdate(ExamStatus.PUBLISHED, 'Manual Publish')}>Publish Exam</Button>
                                    <Button color="primary" variant="flat" startContent={<Users className="w-4 h-4" />} onPress={() => handleAction('Invigilators')}>Modify Invigilators</Button>
                                    <Button color="secondary" variant="flat" startContent={<LayoutGrid className="w-4 h-4" />} onPress={() => handleAction('Preview')}>Preview Seating</Button>
                                </>
                            )}

                            {detail.Status === ExamStatus.PUBLISHED && (
                                <>
                                    <Button color="warning" variant="flat" startContent={<EyeOff className="w-4 h-4" />} onPress={() => handleStatusUpdate(ExamStatus.READY, 'Unpublish')}>Hide from Students</Button>
                                    <Button color="danger" variant="flat" startContent={<Lock className="w-4 h-4" />} onPress={() => handleAction('Lock Editing')}>Lock Editing</Button>
                                    <Button color="primary" variant="flat" startContent={<Armchair className="w-4 h-4" />} onPress={() => handleAction('Freeze')}>Freeze Seating</Button>
                                </>
                            )}

                            {detail.Status === ExamStatus.IN_PROGRESS && (
                                <>
                                    <Button color="primary" variant="shadow" startContent={<Clock className="w-4 h-4" />} onPress={() => handleAction('Extend Time')}>Extend Time</Button>
                                    <Button color="warning" variant="flat" startContent={<Mic2 className="w-4 h-4" />} onPress={() => handleAction('Broadcast')}>Emergency Broadcast</Button>
                                    <Button color="danger" variant="flat" startContent={<Lock className="w-4 h-4" />} onPress={() => ExamControlService.lockAttendance(exam.ExamID)}>Lock Attendance</Button>
                                </>
                            )}

                            {detail.Status === ExamStatus.COMPLETED && (
                                <>
                                    <Button color="success" variant="flat" startContent={<CheckCircle2 className="w-4 h-4" />} onPress={() => handleAction('Finalize')}>Finalize Report</Button>
                                    <Button color="default" variant="flat" startContent={<Archive className="w-4 h-4" />} onPress={() => handleStatusUpdate(ExamStatus.ARCHIVED, 'Archive')}>Archive Exam</Button>
                                    <Button color="danger" variant="light" startContent={<History className="w-4 h-4" />} onPress={() => handleStatusUpdate(ExamStatus.IN_PROGRESS, 'Reopen')}>Reopen (Root)</Button>
                                </>
                            )}

                            {/* Always show if no actions match just to be safe? No, specific actions only. */}
                            {/* Fallback for safety */}
                            {Object.keys(ExamStatus).length === 0 && <div className="text-slate-400 text-sm col-span-3">No actions available for this state.</div>}
                        </div>
                    </div>
                </div>

                {/* Section 4: Mini Audit Timeline */}
                <div className="space-y-6">
                    <Card className="shadow-sm border border-slate-200">
                        <CardBody className="p-6">
                            <h4 className="font-bold text-slate-800 mb-4 flex justify-between items-center">
                                <span>Recent Activity</span>
                                <Button size="sm" variant="light" color="primary" onPress={() => handleAction('View Full Audit')} className="text-xs h-6">View Full →</Button>
                            </h4>

                            <div className="space-y-4 relative">
                                <div className="absolute top-2 bottom-2 left-1.5 w-0.5 bg-slate-100" />

                                {logs.length === 0 ? (
                                    <div className="text-xs text-slate-400 pl-4">No recent activity</div>
                                ) : logs.map((log) => (
                                    <div key={log.LogID} className="relative pl-6">
                                        <div className="absolute left-0 top-1.5 w-3 h-3 bg-white border-2 border-indigo-400 rounded-full z-10" />
                                        <p className="text-sm font-medium text-slate-700">{log.Action.replace(/_/g, ' ')}</p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-slate-500">{log.User?.Username || 'System'}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {format(new Date(log.Timestamp), 'HH:mm')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>

                    {/* Metrics Cards (Small) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-400 font-bold uppercase">Utilization</div>
                            <div className="text-xl font-black text-slate-700 mt-1">
                                {metrics.roomsAllocated > 0 ? Math.round(metrics.studentsAllocated / (metrics.roomsAllocated * 30) * 100) : 0}%
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="text-xs text-slate-400 font-bold uppercase">Conflicts</div>
                            <div className="text-xl font-black text-emerald-600 mt-1">0</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
