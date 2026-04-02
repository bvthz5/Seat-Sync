import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { ExamStatus } from '../../types/examControl';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure } from '@heroui/react';
import { toast } from '../../../../utils/toast';

interface TimelineProps {
    currentStatus: ExamStatus;
    examId: number;
    examName: string;
    onUpdateStatus: (status: ExamStatus, reason: string) => Promise<void>;
}

const ORDERED_STATUSES = [
    ExamStatus.DRAFT,
    ExamStatus.READY,
    ExamStatus.PUBLISHED,
    ExamStatus.IN_PROGRESS,
    ExamStatus.COMPLETED,
    ExamStatus.ARCHIVED
];

export const LifecycleTimeline: React.FC<TimelineProps> = ({ currentStatus, examId, examName, onUpdateStatus }) => {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [selectedStatus, setSelectedStatus] = useState<ExamStatus | null>(null);
    const [reason, setReason] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);

    const currentIndex = ORDERED_STATUSES.indexOf(currentStatus);

    const handleStepClick = (status: ExamStatus) => {
        const targetIndex = ORDERED_STATUSES.indexOf(status);
        if (targetIndex === currentIndex) return;

        setSelectedStatus(status);
        setReason('');
        setConfirmText('');
        onOpen();
    };

    const isDestructive = () => {
        if (!selectedStatus) return false;
        const targetIndex = ORDERED_STATUSES.indexOf(selectedStatus);
        return targetIndex < currentIndex;
    };

    const handleConfirm = async (onClose: () => void) => {
        if (!selectedStatus) return;

        if (isDestructive() && confirmText !== `EXAM-${examId}`) {
            toast.error(`Please type EXAM-${examId} to confirm destructive action`);
            return;
        }

        if (isDestructive() && !reason) {
            toast.error("Reason is mandatory for rollback");
            return;
        }

        try {
            setLoading(true);
            await onUpdateStatus(selectedStatus, reason);
            setSelectedStatus(null);
            onClose();
        } catch (error) {
            // Handled by parent
        } finally {
            setLoading(false);
        }
    };

    // Helper for modal close to ensure state reset if needed
    const handleClose = (closeFn: () => void) => {
        setSelectedStatus(null);
        closeFn();
    }

    return (
        <div className="w-full">
            {/* Timeline Visualization */}
            <div className="mb-6">
                <div className="flex items-center justify-between relative px-4 py-12">
                    {/* Connecting Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 -z-10 rounded-full" />

                    {ORDERED_STATUSES.map((status, index) => {
                        const isActive = index === currentIndex;
                        const isCompleted = index < currentIndex;
                        const isFuture = index > currentIndex;
                        const canClick = !isFuture || index === currentIndex + 1;

                        // Status-based colors
                        const statusColors: { [key: string]: { bg: string; border: string; text: string; ring: string } } = {
                            [ExamStatus.DRAFT]: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', ring: 'ring-amber-100' },
                            [ExamStatus.READY]: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', ring: 'ring-yellow-100' },
                            [ExamStatus.PUBLISHED]: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', ring: 'ring-emerald-100' },
                            [ExamStatus.IN_PROGRESS]: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', ring: 'ring-blue-100' },
                            [ExamStatus.COMPLETED]: { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-700', ring: 'ring-slate-100' },
                            [ExamStatus.ARCHIVED]: { bg: 'bg-slate-50', border: 'border-slate-300', text: 'text-slate-600', ring: 'ring-slate-100' },
                        };

                        const colors = statusColors[status];

                        return (
                            <div key={status} className="flex flex-col items-center gap-3 group relative flex-1">
                                <button
                                    onClick={() => canClick && handleStepClick(status)}
                                    disabled={!canClick && !isFuture}
                                    className={`
                                        w-12 h-12 rounded-full flex items-center justify-center border-3 transition-all z-10 font-bold text-xs
                                        ${isActive ? `${colors.bg} ${colors.border} ring-4 ${colors.ring} scale-125 shadow-lg` : ''}
                                        ${isCompleted ? `${colors.bg} ${colors.border} shadow-md` : ''}
                                        ${isFuture ? 'border-slate-300 bg-white' : ''}
                                        ${canClick ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-not-allowed opacity-50'}
                                    `}
                                    title={`${status.replace(/_/g, ' ')}${canClick ? ' - Click to transition' : ''}`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                    ) : isActive ? (
                                        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse" />
                                    ) : (
                                        <div className={`w-2.5 h-2.5 ${isFuture ? 'bg-slate-300' : 'bg-slate-400'} rounded-full`} />
                                    )}
                                </button>
                                <div className={`
                                    text-center text-[10px] font-semibold uppercase tracking-widest whitespace-normal w-full
                                    ${isActive ? `${colors.text} font-bold` : isCompleted ? `${colors.text}` : 'text-slate-400'}
                                `}>
                                    {status.replace(/_/g, '\n')}
                                </div>
                                
                                {/* Tooltip on hover */}
                                {isCompleted && (
                                    <div className="absolute -top-10 bg-green-600 text-white text-xs px-2 py-1 rounded font-bold whitespace-nowrap hidden group-hover:block z-20">
                                        ✓ Completed
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-3 h-3 bg-green-600 rounded-full" />
                        <span>Completed</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-pulse" />
                        <span>Current</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-3 h-3 bg-slate-300 rounded-full" />
                        <span>Future</span>
                    </div>
                </div>
            </div>

            {/* Transition Modal */}
            <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <div className={`flex items-center gap-2 ${isDestructive() ? 'text-red-600' : 'text-slate-800'}`}>
                                    {isDestructive() ? <AlertTriangle className="w-5 h-5" /> : null}
                                    {isDestructive() ? "Destructive State Rollback" : "Confirm Lifecycle Transition"}
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                <p className="text-sm text-slate-600">
                                    Are you sure you want to move <strong>{examName}</strong> from <span className="font-mono bg-slate-100 px-1 rounded">{currentStatus}</span> to <span className="font-mono bg-indigo-50 text-indigo-700 px-1 rounded font-bold">{selectedStatus}</span>?
                                </p>

                                <div className="space-y-4 py-2">
                                    <Input
                                        label={`Reason for Change ${isDestructive() ? '(Req)' : ''}`}
                                        placeholder="E.g. Administrative error, Emergency stop..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />

                                    {isDestructive() && (
                                        <div className="space-y-2 bg-red-50 p-4 rounded border border-red-100">
                                            <Label className="text-red-700 font-bold block mb-1 text-sm">Type "EXAM-{examId}" to confirm</Label>
                                            <Input
                                                placeholder={`EXAM-${examId}`}
                                                value={confirmText}
                                                onChange={(e) => setConfirmText(e.target.value)}
                                                className="border-red-300"
                                            />
                                            <p className="text-xs text-red-600 mt-1">This action may have side effects on generated data.</p>
                                        </div>
                                    )}
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    color={isDestructive() ? "danger" : "primary"}
                                    onPress={() => handleConfirm(onClose)}
                                    isLoading={loading}
                                    isDisabled={isDestructive() && confirmText !== `EXAM-${examId}`}
                                >
                                    {loading ? "Processing..." : "Confirm Transition"}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};

// Helper label component strictly for internal use since HeroUI Input handles labels, but for the custom box logic
const Label = ({ children, className }: any) => <label className={className}>{children}</label>;
