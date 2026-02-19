import React from 'react';
import { ShieldAlert, Lock, MoreVertical, Calendar, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button, Chip, Tooltip } from '@heroui/react';
import { Exam, ExamStatus } from '../../types/examControl';
import { format } from 'date-fns';

interface ExamListTableProps {
    exams: Exam[];
    onSelectExam: (exam: Exam) => void;
    currentSelectionId?: number;
    total: number;
    page: number;
    totalPages: number;
    onPageChange: (newPage: number) => void;
}

export const ExamListTable: React.FC<ExamListTableProps> = ({
    exams,
    onSelectExam,
    currentSelectionId,
    total,
    page,
    totalPages,
    onPageChange
}) => {

    const getBadgeColor = (status: ExamStatus): "default" | "primary" | "secondary" | "success" | "warning" | "danger" => {
        switch (status) {
            case ExamStatus.DRAFT: return 'warning';
            case ExamStatus.READY: return 'primary';
            case ExamStatus.PUBLISHED: return 'secondary';
            case ExamStatus.IN_PROGRESS: return 'success';
            case ExamStatus.COMPLETED: return 'default';
            case ExamStatus.ARCHIVED: return 'default';
            case ExamStatus.CANCELLED: return 'danger';
            default: return 'default';
        }
    };

    return (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Exam Registry</h3>
                <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-full">{total} Records</span>
            </div>

            <div className="overflow-x-auto flex-1">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        <tr>
                            <th className="px-6 py-4 text-left">Exam Details</th>
                            <th className="px-6 py-4 text-left">Schedule</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-center">Flags</th>
                            <th className="px-6 py-4 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {exams.length > 0 ? (
                            exams.map((exam) => (
                                <tr
                                    key={exam.ExamID}
                                    className={`
                                        group transition-all duration-200 cursor-pointer border-l-4
                                        ${currentSelectionId === exam.ExamID
                                            ? 'bg-indigo-50/60 border-indigo-500'
                                            : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-300'}
                                    `}
                                    onClick={() => onSelectExam(exam)}
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-sm">
                                                #{exam.ExamID}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800 text-base">{exam.ExamName}</div>
                                                <div className="text-xs text-slate-400 font-medium mt-0.5">Subject Code: {exam.SubjectID}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-slate-600 font-medium">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {format(new Date(exam.ExamDate), 'MMM dd, yyyy')}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                {exam.Session} • {exam.Duration} mins
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <Chip
                                                color={getBadgeColor(exam.Status)}
                                                variant="flat"
                                                size="sm"
                                                className="uppercase font-bold tracking-wider"
                                            >
                                                {exam.Status.replace('_', ' ')}
                                            </Chip>
                                            {exam.Status === ExamStatus.IN_PROGRESS && (
                                                <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold animate-pulse">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                    LIVE TRACKING
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <div className="flex justify-center gap-2">
                                            {exam.IsEmergencyMode && (
                                                <Tooltip content="Emergency Mode Active">
                                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center animate-pulse shadow-sm border border-red-200">
                                                        <ShieldAlert className="w-4 h-4" />
                                                    </div>
                                                </Tooltip>
                                            )}
                                            {exam.AttendanceLocked && (
                                                <Tooltip content="Attendance Locked">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shadow-sm border border-slate-200">
                                                        <Lock className="w-4 h-4" />
                                                    </div>
                                                </Tooltip>
                                            )}
                                            {!exam.IsEmergencyMode && !exam.AttendanceLocked && (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <Button
                                            isIconOnly
                                            variant="light"
                                            aria-label="View Details"
                                            className={`text-slate-300 group-hover:text-indigo-600 ${currentSelectionId === exam.ExamID ? 'text-indigo-600' : ''}`}
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5}>
                                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <MoreVertical className="w-6 h-6 text-slate-300" />
                                        </div>
                                        <p className="font-medium">No records found</p>
                                        <p className="text-xs">Create an exam to get started</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
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
