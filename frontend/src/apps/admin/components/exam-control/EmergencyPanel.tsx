import React, { useState } from 'react';
import { Card, CardBody, Input, Button } from '@heroui/react';
import { AlertCircle, Lock, RadioReceiver, RefreshCw, Slash, ShieldAlert } from 'lucide-react';
import { toast } from '../../../../utils/toast';
import { ExamControlService } from '../../services/examControlService';

interface EmergencyPanelProps {
    examId?: number;
    examName?: string;
    onActionComplete: () => void;
}

export const EmergencyPanel: React.FC<EmergencyPanelProps> = ({ examId, examName, onActionComplete }) => {
    const [disableRoomId, setDisableRoomId] = useState('');
    const [regenerateRoomIds, setRegenerateRoomIds] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [tab, setTab] = useState<'reallocate' | 'disable' | 'broadcast' | 'lock'>('reallocate');

    const handleReallocate = async () => {
        if (!examId) return toast.error("Select an exam first");
        if (!regenerateRoomIds) return toast.error("Enter Room IDs to exclude");

        try {
            setLoading(true);
            const rooms = regenerateRoomIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            await ExamControlService.emergencyAllocate(examId, rooms);
            toast.success("Emergency reallocation complete");
            onActionComplete();
        } catch (error: any) {
            toast.error(error.message || "Reallocation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDisableRoom = async () => {
        if (!disableRoomId) return toast.error("Enter Room ID");
        if (!reason) return toast.error("Reason is required for this destructive action");

        try {
            setLoading(true);
            await ExamControlService.disableRoom(parseInt(disableRoomId), reason);
            toast.success("Room disabled globally");
            onActionComplete();
        } catch (error: any) {
            toast.error(error.message || "Disable failed");
        } finally {
            setLoading(false);
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastMsg) return toast.error("Enter message");
        try {
            setLoading(true);
            await ExamControlService.broadcast(examId, "Emergency Alert", broadcastMsg, "critical");
            toast.success("Broadcast sent");
            onActionComplete();
            setBroadcastMsg('');
        } catch (error: any) {
            toast.error("Broadcast failed");
        } finally {
            setLoading(false);
        }
    };

    const handleLockAttendance = async () => {
        if (!examId) return toast.error("Select Exam");
        try {
            setLoading(true);
            await ExamControlService.lockAttendance(examId);
            toast.success("Attendance locked");
            onActionComplete();
        } catch (error: any) {
            toast.error("Lock failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-red-900 font-bold text-lg">Crisis Control Center</h3>
                    <p className="text-red-700/80 text-sm mt-1">
                        Use these tools only in emergency situations. Actions performed here bypass standard lifecycle checks and are strictly audited.
                    </p>
                </div>
            </div>

            <Card className="border-none shadow-lg overflow-hidden bg-white">
                <div className="flex border-b border-slate-100 bg-slate-50/50" role="tablist">
                    {[
                        { id: 'reallocate', label: 'Seat Panic', icon: RefreshCw },
                        { id: 'disable', label: 'Kill Switch (Room)', icon: Slash },
                        { id: 'broadcast', label: 'SOS Broadcast', icon: RadioReceiver },
                        { id: 'lock', label: 'Force Lock', icon: Lock },
                    ].map((t) => (
                        <button
                            key={t.id}
                            role="tab"
                              
                              aria-selected={tab === t.id}
                            aria-controls={`panel-${t.id}`}
                            id={`tab-${t.id}`}
                            onClick={() => setTab(t.id as any)}
                            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all
                                ${tab === t.id
                                    ? 'bg-white text-red-600 border-t-2 border-red-500 shadow-sm'
                                    : 'text-slate-500 hover:bg-white hover:text-slate-700'}
                            `}
                        >
                            <t.icon className={`w-4 h-4 ${tab === t.id ? 'animate-pulse' : ''}`} />
                            {t.label}
                        </button>
                    ))}
                </div>

                <CardBody className="p-8 min-h-[300px]">
                    {tab === 'reallocate' && (
                        <div role="tabpanel" id="panel-reallocate" aria-labelledby="tab-reallocate" className="space-y-6 max-w-xl mx-auto">
                            <div className="bg-orange-50 p-4 rounded-lg flex gap-3 border border-orange-100">
                                <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-orange-800">
                                    <strong>Partial Regeneration:</strong> Evacuate students from specific rooms and auto-assign them to standby seats.
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <div className="text-sm font-bold text-slate-700 block">Target Exam</div>
                                    <Input
                                        id="target-exam"
                                        name="target-exam"
                                        aria-label="Target Exam"
                                        value={examName || "No Exam Selected"}
                                        isDisabled
                                        variant="faded"
                                        size="lg"
                                        classNames={{
                                            input: "font-semibold text-slate-700",
                                            inputWrapper: "bg-slate-100 border-slate-200"
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="text-sm font-bold text-slate-700 block">Exclude Room IDs</div>
                                    <Input
                                        id="exclude-rooms"
                                        name="exclude-rooms"
                                        aria-label="Exclude Room IDs"
                                        placeholder="E.g. 101, 102"
                                        value={regenerateRoomIds}
                                        onChange={e => setRegenerateRoomIds(e.target.value)}
                                        variant="bordered"
                                        size="lg"
                                        description="Comma separated list of rooms to evacuate."
                                    />
                                </div>

                                <Button
                                    size="lg"
                                    className="w-full font-bold shadow-lg shadow-red-200 bg-red-600 text-white hover:bg-red-700 mt-4"
                                    onPress={handleReallocate}
                                    isLoading={loading}
                                    isDisabled={!examId}
                                >
                                    Execute Emergency Reallocation
                                </Button>
                            </div>
                        </div>
                    )}

                    {tab === 'disable' && (
                        <div role="tabpanel" id="panel-disable" aria-labelledby="tab-disable" className="space-y-6 max-w-xl mx-auto">
                            <div className="text-center mb-4">
                                <h4 className="font-bold text-slate-800">Global Room Disable</h4>
                                <p className="text-slate-500 text-sm">Marks a room as unusable across ALL exams indefinitely.</p>
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-bold text-slate-700 block">Room ID</div>
                                <Input
                                    id="room-id"
                                    name="room-id"
                                    aria-label="Room ID"
                                    placeholder="Enter Room ID (e.g. 105)"
                                    value={disableRoomId}
                                    onChange={e => setDisableRoomId(e.target.value)}
                                    variant="bordered"
                                    size="lg"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-bold text-slate-700 block">Reason (Mandatory)</div>
                                <Input
                                    id="disable-reason"
                                    name="disable-reason"
                                    aria-label="Disable Reason"
                                    placeholder="Why is this room being disabled?"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    variant="bordered"
                                    size="lg"
                                />
                            </div>

                            <Button
                                size="lg"
                                onPress={handleDisableRoom}
                                isLoading={loading}
                                className="w-full font-bold shadow-lg shadow-red-200 bg-red-600 text-white hover:bg-red-700 mt-4"
                            >
                                Confirm Disable Room
                            </Button>
                        </div>
                    )}

                    {tab === 'broadcast' && (
                        <div role="tabpanel" id="panel-broadcast" aria-labelledby="tab-broadcast" className="space-y-6 max-w-xl mx-auto">
                            <div className="space-y-2">
                                <div className="text-sm font-bold text-slate-700 block">Target Audience</div>
                                <Input
                                    id="target-audience"
                                    name="target-audience"
                                    aria-label="Target Audience"
                                    value={examName ? `Students in: ${examName}` : "ALL ACTIVE STUDENTS (Global)"}
                                    isDisabled
                                    variant="faded"
                                    size="lg"
                                    classNames={{
                                        inputWrapper: "bg-slate-100"
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-bold text-slate-700 block">Audit Message</div>
                                <textarea
                                    id="audit-message"
                                    name="audit-message"
                                    aria-label="Audit Message"
                                    className="flex min-h-[120px] w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="Enter the critical message to be broadcasted to all terminals..."
                                    value={broadcastMsg}
                                    onChange={e => setBroadcastMsg(e.target.value)}
                                />
                            </div>

                            <Button
                                size="lg"
                                onPress={handleBroadcast}
                                isLoading={loading}
                                className="w-full shadow-lg shadow-indigo-200 font-bold bg-indigo-600 text-white hover:bg-indigo-700 mt-4"
                            >
                                Send Priority Broadcast
                            </Button>
                        </div>
                    )}

                    {tab === 'lock' && (
                        <div role="tabpanel" id="panel-lock" aria-labelledby="tab-lock" className="flex flex-col items-center justify-center h-full py-8 space-y-6">
                            <div className="p-6 bg-slate-50 rounded-full">
                                <Lock className="w-12 h-12 text-slate-400" />
                            </div>
                            <div className="text-center max-w-sm">
                                <h3 className="text-xl font-bold text-slate-800">Force Attendance Lock</h3>
                                <p className="text-slate-500 mt-2">
                                    Manually freeze attendance for {examName || 'this exam'}. This prevents any further modifications by invigilators.
                                </p>
                            </div>
                            <Button
                                color="danger"
                                variant="ghost"
                                size="lg"
                                onPress={handleLockAttendance}
                                isLoading={loading}
                                isDisabled={!examId}
                                className="border-2 font-bold"
                            >
                                Lock Attendance Now
                            </Button>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
};
