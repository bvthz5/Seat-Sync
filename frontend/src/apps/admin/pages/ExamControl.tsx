import React, { useState, useEffect } from 'react';
import { Card, CardBody, Tabs, Tab, Button, Input, Chip, Textarea, Tooltip } from '@heroui/react';
import {
    ShieldAlert,
    AlertTriangle,
    Eye,
    EyeOff,
    Lock,
    RefreshCw,
    Mic,
    Activity,
    Search,
    Play,
    Pause,
    XCircle,
    CheckCircle2,
    Building2,
    Users
} from 'lucide-react';
import { ExamControlService } from '../services/examControlService';
// import { ConfirmationModal } from '../components/ConfirmationModal'; // Assuming it exists
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ExamControl: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('active');

    // Emergency Actions State
    const [selectedExamId, setSelectedExamId] = useState<string>("");
    const [regenerateRoomIds, setRegenerateRoomIds] = useState("");
    const [disableRoomId, setDisableRoomId] = useState("");
    const [broadcastMsg, setBroadcastMsg] = useState("");

    // Refresh Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await ExamControlService.getOverview(); // returns { success: true, data: { exams, statusCounts } }
            if (data.success) {
                setExams(data.data.exams);
                setStats(data.data.statusCounts);
            }
        } catch (error) {
            console.error("Failed to fetch exam control data", error);
            toast.error("Failed to load exam data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Actions
    const handleStatusChange = async (examId: number, status: string) => {
        if (!confirm(`Are you sure you want to change status to ${status}?`)) return;
        try {
            await ExamControlService.updateStatus(examId, status, "Manual override from Control Panel");
            toast.success(`Exam status updated to ${status}`);
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to update status");
        }
    };

    const handleVisibility = async (examId: number, visible: boolean) => {
        try {
            await ExamControlService.toggleVisibility(examId, visible, "Manual visibility toggle");
            toast.success(`Exam ${visible ? 'Published' : 'Hidden'} successfully`);
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Failed to toggle visibility");
        }
    };

    const handleEmergencyRegenerate = async () => {
        if (!selectedExamId || !roomIdInput) {
            toast.error("Select Exam and Enter Room ID(s)");
            return;
        }
        if (!confirm(`EMERGENCY: Are you sure you want to regenerate seating for Exam ID ${selectedExamId} excluding Room IDs [${roomIdInput}]? This cannot be undone.`)) return;

        const rooms = roomIdInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

        try {
            const res = await ExamControlService.emergencyAllocate(parseInt(selectedExamId), rooms);
            if (res.success) {
                toast.success(res.message);
                fetchData();
            }
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Regeneration Failed");
        }
    };

    const handleDisableRoom = async () => {
        if (!roomIdInput) return toast.error("Enter Room ID");
        if (!confirm(`CRITICAL: Disable Room ID ${roomIdInput} globally? This will affect ALL exams.`)) return;

        try {
            const res = await ExamControlService.disableRoom(parseInt(roomIdInput), "Emergency Manual Disable");
            toast.success(res.message);
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Disable Failed");
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastMsg) return toast.error("Enter message");
        try {
            const targetExam = selectedExamId ? parseInt(selectedExamId) : 0;
            await ExamControlService.broadcast(targetExam, "Admin Broadcast", broadcastMsg, "Emergency");
            toast.success("Broadcast sent");
            setBroadcastMsg("");
        } catch (e: any) {
            toast.error("Broadcast failed");
        }
    };

    const handleLockAttendance = async (examId: number) => {
        if (!confirm("Available only for Completed exams. Lock attendance now?")) return;
        try {
            await ExamControlService.lockAttendance(examId);
            toast.success("Attendance locked");
            fetchData();
        } catch (e: any) {
            toast.error("Lock failed");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'default';
            case 'Ready': return 'primary';
            case 'Published': return 'secondary';
            case 'In Progress': return 'success';
            case 'Completed': return 'success';
            case 'Cancelled': return 'danger';
            case 'Paused': return 'warning';
            default: return 'default';
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto min-h-screen space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <ShieldAlert className="text-rose-600" size={32} />
                        Exam Control Center
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Root-level operations, emergency handling, and lifecycle management.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        startContent={<RefreshCw size={18} />}
                        onClick={fetchData}
                        isLoading={loading}
                        variant="flat"
                        className="bg-white border border-slate-200 shadow-sm font-semibold"
                    >
                        Refresh Data
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active / Running"
                    value={stats?.['In Progress'] || 0}
                    icon={<Activity className="text-emerald-500" />}
                    color="bg-emerald-50 border-emerald-100"
                />
                <StatCard
                    title="Published & Ready"
                    value={(stats?.['Published'] || 0) + (stats?.['Ready'] || 0)}
                    icon={<CheckCircle2 className="text-blue-500" />}
                    color="bg-blue-50 border-blue-100"
                />
                <StatCard
                    title="Draft / Planning"
                    value={stats?.['Draft'] || 0}
                    icon={<Building2 className="text-slate-500" />}
                    color="bg-slate-50 border-slate-100"
                />
                <StatCard
                    title="Emergency Mode"
                    value={stats?.['Emergency'] || 0}
                    icon={<AlertTriangle className="text-rose-500" />}
                    color="bg-rose-50 border-rose-100"
                    danger={true}
                />
            </div>

            {/* Main Interface */}
            <Tabs
                aria-label="Control Modes"
                color="primary"
                variant="underlined"
                classNames={{
                    tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                    cursor: "w-full bg-indigo-600",
                    tab: "max-w-fit px-0 h-12",
                    tabContent: "group-data-[selected=true]:text-indigo-600 font-bold text-base"
                }}
                selectedKey={activeTab}
                onSelectionChange={(k) => setActiveTab(k as string)}
            >
                <Tab key="active" title={
                    <div className="flex items-center gap-2">
                        <Activity size={18} />
                        <span>Lifecycle Management</span>
                    </div>
                }>
                    <div className="mt-6 space-y-6">
                        {/* Exam List */}
                        <Card className="border-slate-200 shadow-sm">
                            <CardBody className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4">Exam Name</th>
                                                <th className="px-6 py-4">Date & Session</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4">Controls</th>
                                                <th className="px-6 py-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {exams.map((exam) => (
                                                <tr key={exam.ExamID} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-slate-900">{exam.ExamName}</div>
                                                        <div className="text-xs text-slate-500">ID: {exam.ExamID}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-700">{format(new Date(exam.ExamDate), 'MMM dd, yyyy')}</div>
                                                        <div className="text-xs text-slate-500">{exam.StartTime} - {exam.EndTime}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Chip
                                                            size="sm"
                                                            color={getStatusColor(exam.Status) as any}
                                                            variant="flat"
                                                            className="font-bold uppercase"
                                                        >
                                                            {exam.Status}
                                                        </Chip>
                                                        {exam.IsEmergencyMode && (
                                                            <Chip size="sm" color="danger" variant="dot" className="ml-2">Emerg.</Chip>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex gap-2">
                                                            {exam.Status === 'Published' && (
                                                                <Tooltip content="Hide from students">
                                                                    <Button isIconOnly size="sm" variant="light" color="warning" onClick={() => handleVisibility(exam.ExamID, false)}>
                                                                        <EyeOff size={18} />
                                                                    </Button>
                                                                </Tooltip>
                                                            )}
                                                            {exam.Status === 'Ready' && (
                                                                <Tooltip content="Publish to students">
                                                                    <Button isIconOnly size="sm" variant="light" color="success" onClick={() => handleVisibility(exam.ExamID, true)}>
                                                                        <Eye size={18} />
                                                                    </Button>
                                                                </Tooltip>
                                                            )}
                                                            {exam.Status === 'In Progress' && (
                                                                <>
                                                                    <Tooltip content="Pause Exam">
                                                                        <Button isIconOnly size="sm" variant="light" color="warning" onClick={() => handleStatusChange(exam.ExamID, 'Paused')}>
                                                                            <Pause size={18} />
                                                                        </Button>
                                                                    </Tooltip>
                                                                    <Tooltip content="End Exam">
                                                                        <Button isIconOnly size="sm" variant="light" color="success" onClick={() => handleStatusChange(exam.ExamID, 'Completed')}>
                                                                            <CheckCircle2 size={18} />
                                                                        </Button>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                            {['Draft', 'Ready'].includes(exam.Status) && (
                                                                <Tooltip content="Start Exam">
                                                                    <Button isIconOnly size="sm" variant="light" color="primary" onClick={() => handleStatusChange(exam.ExamID, 'In Progress')}>
                                                                        <Play size={18} />
                                                                    </Button>
                                                                </Tooltip>
                                                            )}
                                                            {exam.Status === 'Completed' && (
                                                                <Tooltip content="Lock Attendance">
                                                                    <Button isIconOnly size="sm" variant="light" color="danger" isDisabled={exam.AttendanceLocked} onClick={() => handleLockAttendance(exam.ExamID)}>
                                                                        {exam.AttendanceLocked ? <Lock size={18} /> : <div className="animate-pulse"><Lock size={18} /></div>}
                                                                    </Button>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            size="sm"
                                                            color="danger"
                                                            variant="light"
                                                            onClick={() => handleStatusChange(exam.ExamID, 'Cancelled')}
                                                            isDisabled={exam.Status === 'Cancelled'}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>

                <Tab key="emergency" title={
                    <div className="flex items-center gap-2 text-rose-600">
                        <AlertTriangle size={18} />
                        <span>Emergency Center</span>
                    </div>
                }>
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Seating Regeneration */}
                        <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
                            <CardBody className="p-6 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                                        <RefreshCw size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-rose-900">Emergency Seating Update</h3>
                                        <p className="text-sm text-rose-700">Reallocate students from compromised rooms.</p>
                                    </div>
                                </div>
                                <div className="space-y-4 bg-white p-4 rounded-xl border border-rose-100">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Target Exam</label>
                                        <select
                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                                            value={selectedExamId}
                                            onChange={(e) => setSelectedExamId(e.target.value)}
                                        >
                                            <option value="">Select Exam...</option>
                                            {exams.map(e => <option key={e.ExamID} value={e.ExamID}>{e.ExamName}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Exclude Room IDs (comma separated)</label>
                                        <Input
                                            placeholder="e.g. 101, 102"
                                            value={regenerateRoomIds}
                                            onChange={(e) => setRegenerateRoomIds(e.target.value)}
                                            size="sm"
                                        />
                                    </div>
                                    <Button color="danger" className="w-full font-bold shadow-lg shadow-rose-500/20" onClick={handleEmergencyRegenerate}>
                                        Execute Relocation
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>

                        {/* Room Disable */}
                        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                            <CardBody className="p-6 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                        <XCircle size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-amber-900">Disable Specific Room</h3>
                                        <p className="text-sm text-amber-700">Mark room as unusable and auto-reallocate active exams.</p>
                                    </div>
                                </div>
                                <div className="space-y-4 bg-white p-4 rounded-xl border border-amber-100">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Room ID</label>
                                        <Input
                                            placeholder="e.g. 105"
                                            value={disableRoomId}
                                            onChange={(e) => setDisableRoomId(e.target.value)}
                                            size="sm"
                                        />
                                    </div>
                                    <Button className="w-full bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/20" onClick={handleDisableRoom}>
                                        Disable & Reallocate
                                    </Button>
                                </div>
                            </CardBody>
                        </Card>

                        {/* Broadcast */}
                        <Card className="border-blue-200 bg-blue-50/50 shadow-sm col-span-1 lg:col-span-2">
                            <CardBody className="p-6 space-y-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <Mic size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-blue-900">Emergency Broadcast</h3>
                                        <p className="text-sm text-blue-700">Send urgent notification to student dashboards.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-blue-100">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Context (Optional)</label>
                                            <select
                                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                                                value={selectedExamId}
                                                onChange={(e) => setSelectedExamId(e.target.value)}
                                            >
                                                <option value="">Global Broadcast (No specific exam)</option>
                                                {exams.map(e => <option key={e.ExamID} value={e.ExamID}>{e.ExamName}</option>)}
                                            </select>
                                        </div>
                                        <Button color="primary" className="w-full font-bold" onClick={handleBroadcast}>
                                            Transmit Message
                                        </Button>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Message Content</label>
                                        <Textarea
                                            placeholder="Type your emergency message here..."
                                            minRows={4}
                                            value={broadcastMsg}
                                            onChange={(e) => setBroadcastMsg(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>

                    </div>
                </Tab>

                <Tab key="logs" title={
                    <div className="flex items-center gap-2">
                        <Users size={18} />
                        <span>Audit Trail</span>
                    </div>
                }>
                    <div className="mt-6">
                        {/* Placeholder for logs component, can use ActivityFeed logic later */}
                        <Card className="border-slate-200">
                            <CardBody className="p-8 text-center text-slate-500">
                                <Activity size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Audit logs are being recorded. Full browser coming soon.</p>
                            </CardBody>
                        </Card>
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
};

// Helper Component for Stats
function StatCard({ title, value, icon, color, danger }: any) {
    return (
        <div className={`p-6 rounded-2xl border ${color} relative overflow-hidden group`}>
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className={`text-sm font-bold uppercase tracking-wider ${danger ? 'text-rose-600' : 'text-slate-500'}`}>{title}</p>
                    <p className={`text-3xl font-black mt-2 ${danger ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-white/80 shadow-sm ${danger ? 'text-rose-600' : 'text-slate-600'}`}>
                    {icon}
                </div>
            </div>
            {/* Background decoration */}
            <div className={`absolute -right-6 -bottom-6 opacity-10 scale-150 transform rotate-12 group-hover:scale-120 transition-transform duration-500`}>
                {React.cloneElement(icon, { size: 100 })}
            </div>
        </div>
    );
}

export default ExamControl;
