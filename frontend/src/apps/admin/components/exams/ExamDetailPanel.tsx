
import React, { useState, useEffect } from 'react';
import { Button, Chip, Spinner } from "@heroui/react";
import { X, Calendar, Clock, FileText, BookOpen, Users, UserX } from "lucide-react";
import { ExamService } from '../../services/examService';

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

    useEffect(() => {
        if (isOpen && exam?.ExamID) {
            fetchStudents();
        }
    }, [isOpen, exam?.ExamID]);

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
                        className={`flex items-center justify-between text-sm p-2.5 rounded-lg border transition-colors ${rowBg} ${rowBorder}`}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate text-[13px]">{student.FullName}</p>
                            <p className="text-[11px] text-gray-400 font-mono">{student.RegisterNumber}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${badgeBg}`}>
                            {badgeLabel}
                        </span>
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
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                        <Button
                            variant="bordered"
                            className="border-gray-300 text-gray-700 font-medium px-6 hover:bg-gray-50"
                            onPress={onClose}
                        >
                            Close
                        </Button>
                        <Button
                            className="bg-blue-600 text-white font-semibold shadow-md px-6 hover:bg-blue-700"
                            onPress={() => onEdit(exam)}
                        >
                            Edit Details
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ExamDetailPanel;
