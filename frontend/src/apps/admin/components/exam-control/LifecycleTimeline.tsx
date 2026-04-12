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
        <div className="w-full py-8">
            <div className="flex items-center justify-between relative px-4">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10" />

                {ORDERED_STATUSES.map((status, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;
                    const isFuture = index > currentIndex;
                    const canClick = !isFuture || index === currentIndex + 1;

                    return (
                        <div key={status} className="flex flex-col items-center gap-2 group relative">
                            <button
                                onClick={() => canClick && handleStepClick(status)}
                                disabled={(!canClick && !isFuture)}
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all z-10 bg-white
                                    ${isActive ? 'border-indigo-500 ring-4 ring-indigo-50 scale-125' : ''}
                                    ${isCompleted ? 'border-green-500 bg-green-50' : ''}
                                    ${isFuture ? 'border-slate-300' : ''}
                                    ${canClick ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-60'}
                                `}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : isActive ? (
                                    <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
                                ) : (
                                    <div className="w-2 h-2 bg-slate-300 rounded-full" />
                                )}
                            </button>
                            <span className={`
                                text-xs font-semibold uppercase tracking-wider absolute -bottom-8 whitespace-nowrap
                                ${isActive ? 'text-indigo-700' : isCompleted ? 'text-green-600' : 'text-slate-400'}
                            `}>
                                {status.replace('_', ' ')}
                            </span>
                        </div>
                    );
                })}
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
                                    <Input id="field-0a92jvr" name="field-0a92jvr" label={`Reason for Change ${isDestructive() ? '(Req)' : ''}`}
                                        placeholder="E.g. Administrative error, Emergency stop..."
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                    />

                                    {isDestructive() && (
                                        <div className="space-y-2 bg-red-50 p-4 rounded border border-red-100">
                                            <LabelComponent className="text-red-700 font-bold block mb-1 text-sm">Type "EXAM-{examId}" to confirm</LabelComponent>
                                            <Input aria-label="Input" id="confirm-action"
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
const LabelComponent = ({ children, className }: any) => <span className={className}>{children}</span>;
