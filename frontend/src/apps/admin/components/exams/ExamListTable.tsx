
import React, { useState, useEffect, useMemo } from 'react';
import { Chip, Tooltip, Pagination, Button } from "@heroui/react";
import { Edit2, Trash2, CheckCircle, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

interface Exam {
    ExamID: number;
    ExamName: string;
    ExamDate: string;
    Session: string;
    Duration: number;
    Status: string;
    Subject?: {
        SubjectName: string;
        SubjectCode: string;
        Department?: {
            DepartmentName: string;
            DepartmentCode: string;
        }
    };
    // Mock fields for UI match (keeping some for now)
    Enrollment?: number;
    AuditStatus?: 'Clean' | 'Conflict' | 'Pending';
    ConflictDetails?: string;
}

interface ExamListTableProps {
    exams: Exam[];
    loading: boolean;
    onEdit: (exam: Exam) => void;
    onDelete: (id: number) => void;
    onAllocate: (id: number) => void;
    onRowClick: (exam: Exam) => void;
}

const statusClasses: Record<string, string> = {
    "Completed": "bg-gray-100 text-gray-600 border-gray-200",
    "Scheduled": "bg-green-50 text-green-700 border-green-200",
    "Review Needed": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Pending": "bg-gray-100 text-gray-600 border-gray-200",
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200"
};

const ExamListTable: React.FC<ExamListTableProps> = ({ exams, loading, onEdit, onDelete, onAllocate, onRowClick }) => {

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Reset to page 1 whenever exams data changes (e.g. filters applied)
    useEffect(() => {
        setCurrentPage(1);
    }, [exams.length]);

    const totalPages = Math.max(1, Math.ceil(exams.length / rowsPerPage));

    const paginatedExams = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return exams.slice(start, start + rowsPerPage);
    }, [exams, currentPage, rowsPerPage]);

    if (loading) {
        return <div className="text-center py-20 text-gray-400">Loading exam schedule...</div>;
    }

    if (exams.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-50/50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 font-medium">No exams found for this semester.</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or create a new exam.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold bg-gray-50/50">
                            <th className="px-6 py-4">Subject Code</th>
                            <th className="px-6 py-4">Department</th>
                            <th className="px-6 py-4">Date & Session</th>
                            <th className="px-6 py-4 text-center">Enrollment</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">SeatSync Audit</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedExams.map((exam) => {
                            const audit = exam.AuditStatus || 'Pending';
                            const displayStatus = exam.Status;
                            const deptName = exam.Subject?.Department?.DepartmentName || 'General';
                            const deptCode = exam.Subject?.Department?.DepartmentCode || 'GEN';

                            return (
                                <tr
                                    key={exam.ExamID}
                                    className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                    onClick={() => onRowClick(exam)}
                                >
                                    {/* Subject */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 text-sm">
                                                {exam.Subject ? exam.Subject.SubjectCode : 'EXP-' + exam.ExamID}
                                            </span>
                                            <span className="text-xs text-gray-500 mt-0.5">
                                                {exam.Subject ? exam.Subject.SubjectName : exam.ExamName}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Department */}
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full 
                                                ${deptCode === 'CS' ? 'bg-blue-500' :
                                                    deptCode === 'MA' ? 'bg-purple-500' :
                                                        deptCode === 'BIO' ? 'bg-green-500' : 'bg-gray-400'}`}
                                            />
                                            <span className="text-sm text-gray-700">{deptName}</span>
                                        </div>
                                    </td>

                                    {/* Date */}
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {new Date(exam.ExamDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {exam.Session === 'FN' ? 'Morning (09:00 - 12:00)' : 'Afternoon (14:00 - 17:00)'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Enrollment */}
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-semibold text-gray-400">-</span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${statusClasses[displayStatus] || statusClasses['Pending']}`}>
                                            {displayStatus}
                                        </span>
                                    </td>

                                    {/* Audit */}
                                    <td className="px-6 py-4">
                                        {audit === 'Clean' && (
                                            <div className="flex items-center gap-2 text-green-600">
                                                <CheckCircle size={16} fill="currentColor" className="text-white" />
                                                <span className="text-sm font-medium">No clashes found</span>
                                            </div>
                                        )}
                                        {audit === 'Conflict' && (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 text-red-600">
                                                    <AlertTriangle size={16} fill="currentColor" className="text-white" />
                                                    <span className="text-sm font-bold">Batch Clash</span>
                                                </div>
                                                <span className="text-xs text-red-400 pl-6 truncate max-w-[200px]" title={exam.ConflictDetails}>
                                                    {exam.ConflictDetails || 'Multiple exams for same batch'}
                                                </span>
                                            </div>
                                        )}
                                        {audit === 'Pending' && (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <RefreshCw size={14} className="animate-spin" />
                                                <span className="text-sm font-medium">Analyzing...</span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Tooltip content="Edit Exam">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="flat"
                                                    color="primary"
                                                    onPress={() => onEdit(exam)}
                                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100"
                                                >
                                                    <Edit2 size={18} />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content="Delete Exam" color="danger">
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="flat"
                                                    color="danger"
                                                    onPress={() => onDelete(exam.ExamID)}
                                                    className="bg-red-50 text-red-600 hover:bg-red-100"
                                                >
                                                    <Trash2 size={18} />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Rows per page:</span>
                        <select
                            id="rows-per-page"
                            name="rows-per-page"
                            aria-label="Rows per page"
                            className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 px-2.5"
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                    <span className="text-xs text-gray-400">
                        {Math.min((currentPage - 1) * rowsPerPage + 1, exams.length)}–{Math.min(currentPage * rowsPerPage, exams.length)} of {exams.length}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        isDisabled={currentPage === 1}
                        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                        <ChevronLeft size={16} />
                    </Button>
                    <div className="flex gap-1">
                        {(() => {
                            const pages: (number | string)[] = [];
                            if (totalPages <= 5) {
                                for (let i = 1; i <= totalPages; i++) pages.push(i);
                            } else {
                                pages.push(1);
                                if (currentPage > 3) pages.push('...');
                                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                                    pages.push(i);
                                }
                                if (currentPage < totalPages - 2) pages.push('...');
                                pages.push(totalPages);
                            }
                            return pages.map((page, idx) =>
                                typeof page === 'string' ? (
                                    <span key={`ellipsis-${idx}`} className="text-gray-400 px-1 pt-1">...</span>
                                ) : (
                                    <Button
                                        key={page}
                                        isIconOnly
                                        size="sm"
                                        radius="sm"
                                        className={page === currentPage
                                            ? "bg-blue-600 text-white font-bold text-xs"
                                            : "text-gray-500 text-xs"
                                        }
                                        variant={page === currentPage ? "solid" : "light"}
                                        onPress={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </Button>
                                )
                            );
                        })()}
                    </div>
                    <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        isDisabled={currentPage === totalPages}
                        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className="text-gray-600"
                    >
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExamListTable;
