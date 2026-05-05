
import React, { useState, useEffect } from 'react';
import { Button, Chip, Spinner } from "@heroui/react";
import { X, Calendar, Clock, FileText, BookOpen, Users, UserX, Trash2 } from "lucide-react";
import { ExamService } from '../../services/examService';
import { toast } from 'react-hot-toast';
import ConfirmationModal from '../ConfirmationModal';

interface ExamDetailPanelProps {
    exam: any;
    isOpen: boolean;
    onClose: () => void;
    onEdit: (exam: any) => void;
}

interface StudentRow {
    StudentID: number;
    RegisterNumber: string;
    FullName: string;
    Status: string;
    IsEligible: boolean;
}

const ExamDetailPanel: React.FC<ExamDetailPanelProps> = ({ exam, isOpen, onClose, onEdit }) => {
    const [eligibleStudents,   setEligibleStudents]   = useState<StudentRow[]>([]);
    const [ineligibleStudents, setIneligibleStudents] = useState<StudentRow[]>([]);
    const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: async () => {}
    });

    useEffect(() => {
        if (isOpen && exam?.ExamID) {
            fetchStudents();
        }
    }, [isOpen, exam?.ExamID]);

    const handleDeleteEligibility = (studentId: number, studentName: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remove Student',
            message: `Are you sure you want to remove ${studentName} from this exam's eligibility list?`,
            onConfirm: async () => {
                try {
                    await ExamService.deleteEligibility(exam.ExamID, studentId);
                    toast.success(`Removed ${studentName} from eligibility`);
                    fetchStudents();
                } catch (error: any) {
                    console.error('Failed to delete eligibility:', error);
                    toast.error(error.response?.data?.message || 'Failed to remove student');
                    throw error; // Re-throw for ConfirmationModal to handle loading state
                }
            }
        });
    };

    const handleClearAll = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear All Eligibility',
            message: `Are you sure you want to clear ALL eligibility records for this exam? This will also remove any seat allocations.`,
            onConfirm: async () => {
                try {
                    await ExamService.clearSingleExamEligibility(exam.ExamID);
                    toast.success('Eligibility cleared successfully');
                    fetchStudents();
                } catch (error: any) {
                    console.error('Failed to clear eligibility:', error);
                    toast.error('Failed to clear eligibility');
                    throw error;
                }
            }
        });
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const data = await ExamService.getEligibleStudents(exam.ExamID);
            // New shape: eligibleStudents + ineligibleStudents arrays
            setEligibleStudents(data.eligibleStudents ?? data.students ?? []);
            setIneligibleStudents(data.ineligibleStudents ?? []);
            setBatchCounts(data.batchCounts || {});
        } catch (error) {
            console.error('Failed to fetch students:', error);
            setEligibleStudents([]);
            setIneligibleStudents([]);
            setBatchCounts({});
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !exam) return null;

    const formattedDate = new Date(exam.ExamDate).toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const sessionLabel = exam.Session === 'FN' ? 'Forenoon' : 'Afternoon';
    const sessionTime  = exam.Session === 'FN' ? '10:00 AM – 1:00 PM' : '2:00 PM – 5:00 PM';

    const StudentList = ({
        students,
        variant,
    }: {
        students: StudentRow[];
        variant: 'eligible' | 'ineligible';
    }) => {
        const isElig = variant === 'eligible';
        const rowBg      = isElig ? 'bg-white hover:bg-green-50/60'  : 'bg-white hover:bg-red-50/60';
        const rowBorder  = isElig ? 'border-gray-200'                 : 'border-red-100';
        const badgeBg    = isElig ? 'bg-green-100 text-green-700'     : 'bg-red-100 text-red-600';
        const badgeLabel = isElig ? 'ACTIVE'                          : 'NOT ELIGIBLE';

        if (students.length === 0) {
            return (
                <p className={`text-xs text-center py-3 ${isElig ? 'text-gray-400' : 'text-red-300'}`}>
                    {isElig ? 'No eligible students imported' : 'No ineligible students'}
                </p>
            );
        }

        return (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {students.map((student, idx) => (
                    <div
                        key={idx}
                        className={`group flex items-center justify-between text-sm p-2.5 rounded-lg border transition-colors ${rowBg} ${rowBorder}`}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate text-[13px]">{student.FullName}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{student.RegisterNumber}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badgeBg}`}>
                                {badgeLabel}
                            </span>
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                color="danger"
                                className="h-7 w-7 min-w-0 bg-red-50 text-red-500 hover:bg-red-100"
                                onPress={() => handleDeleteEligibility(student.StudentID, student.FullName)}
                                title={`Remove ${student.FullName}`}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div className={`fixed top-0 bottom-0 right-0 w-full sm:w-[520px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">

                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl font-bold text-gray-800">Exam Details</h2>
                                <Chip size="sm" color={exam.Status === 'Scheduled' ? 'primary' : 'default'} variant="flat">
                                    {exam.Status}
                                </Chip>
                            </div>
                            <p className="text-sm text-gray-500">ID: #{exam.ExamID}</p>
                        </div>
                        <Button isIconOnly variant="light" onPress={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </Button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">

                        {/* Date & Session */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2 text-blue-600">
                                    <Calendar size={18} />
                                    <span className="text-xs font-semibold uppercase tracking-wide">Date</span>
                                </div>
                                <p className="text-base font-bold text-gray-800">{formattedDate}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                                    <Clock size={18} />
                                    <span className="text-xs font-semibold uppercase tracking-wide">Session</span>
                                </div>
                                <p className="text-base font-bold text-gray-800">{sessionLabel}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{sessionTime}</p>
                            </div>
                        </div>

                        {/* Subject Information */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <FileText size={16} className="text-blue-600" /> Subject Information
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                    <span className="text-sm text-gray-500">Subject Name</span>
                                    <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">
                                        {exam.Subject?.SubjectName || exam.ExamName}
                                    </span>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Subject Code</span>
                                    <span className="text-sm font-semibold text-blue-600">
                                        {exam.Subject?.SubjectCode || 'N/A'}
                                    </span>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Department</span>
                                    <span className="text-sm font-medium text-gray-800">
                                        {exam.Subject?.Department?.DepartmentName || 'General'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Exam Configuration */}
                        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <BookOpen size={16} className="text-blue-600" /> Exam Configuration
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Exam Name</span>
                                    <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">{exam.ExamName}</span>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Duration</span>
                                    <span className="text-sm font-medium text-gray-800">{exam.Duration} Minutes</span>
                                </div>
                                <div className="h-px bg-gray-200/60" />
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Session</span>
                                    <span className="text-sm font-medium text-gray-800">
                                        {exam.Session === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ── Eligible Students ── */}
                        <div className="bg-green-50/60 p-5 rounded-xl border border-green-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Users size={16} className="text-green-600" />
                                    Eligible Students
                                </h3>
                                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">
                                    {loading ? '…' : eligibleStudents.length}
                                </span>
                            </div>

                            {/* Batch Summary */}
                            {!loading && Object.keys(batchCounts).length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-4 bg-white/50 p-3 rounded-lg border border-green-100/50">
                                    {Object.entries(batchCounts).map(([batch, count]) => (
                                        <div key={batch} className="flex items-center gap-2 px-2.5 py-1 bg-green-100/50 rounded-md border border-green-200/50 shadow-sm">
                                            <span className="text-[10px] font-black text-green-700 uppercase tracking-wider">{batch}</span>
                                            <span className="w-5 h-5 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {loading ? (
                                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                            ) : (
                                <StudentList students={eligibleStudents} variant="eligible" />
                            )}
                        </div>

                        {/* ── Not Eligible Students ── */}
                        <div className="bg-red-50/50 p-5 rounded-xl border border-red-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <UserX size={16} className="text-red-500" />
                                    Not Eligible Students
                                </h3>
                                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                    ineligibleStudents.length > 0
                                        ? 'bg-red-100 text-red-600 border-red-200'
                                        : 'bg-gray-100 text-gray-400 border-gray-200'
                                }`}>
                                    {loading ? '…' : ineligibleStudents.length}
                                </span>
                            </div>
                            {loading ? (
                                <div className="flex justify-center py-4"><Spinner size="sm" /></div>
                            ) : (
                                <StudentList students={ineligibleStudents} variant="ineligible" />
                            )}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center gap-3">
                        <div>
                            {(eligibleStudents.length > 0 || ineligibleStudents.length > 0) && (
                                <Button
                                    variant="flat"
                                    color="danger"
                                    size="sm"
                                    className="font-bold bg-red-50 hover:bg-red-100 text-red-500 rounded-xl px-4"
                                    startContent={<Trash2 size={14} />}
                                    onPress={handleClearAll}
                                >
                                    Clear All
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="bordered"
                                className="border-gray-300 text-gray-700 font-medium px-6 hover:bg-gray-50 rounded-xl"
                                onPress={onClose}
                            >
                                Close
                            </Button>
                            <Button
                                className="bg-blue-600 text-white font-semibold shadow-md px-6 hover:bg-blue-700 rounded-xl"
                                onPress={() => onEdit(exam)}
                            >
                                Edit Details
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </>
    );
};

export default ExamDetailPanel;
