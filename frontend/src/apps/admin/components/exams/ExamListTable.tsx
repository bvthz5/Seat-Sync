
import React from 'react';
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
    };
    // Mock fields for UI match
    Department?: string;
    Enrollment?: number;
    AuditStatus?: 'Clean' | 'Conflict' | 'Pending';
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
    "Finalized": "bg-green-50 text-green-700 border-green-200",
    "Review Needed": "bg-yellow-50 text-yellow-700 border-yellow-200",
    "Pending": "bg-gray-100 text-gray-600 border-gray-200",
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200"
};

const ExamListTable: React.FC<ExamListTableProps> = ({ exams, loading, onEdit, onDelete, onAllocate, onRowClick }) => {

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

    // Helper to generate consistent mock data based on ID
    const getMockData = (exam: Exam) => {
        const id = exam.ExamID;
        const depts = ["Computer Science", "Mathematics", "Humanities", "Biology", "Physics Dept"];
        const dept = depts[id % depts.length];
        const enroll = 40 + (id * 7) % 150;

        // Deterministic audit status
        let audit: 'Clean' | 'Conflict' | 'Pending' = 'Clean';
        if (id % 5 === 0) audit = 'Conflict';
        if (id % 7 === 0) audit = 'Pending';

        return { dept, enroll, audit };
    };

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
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {exams.map((exam) => {
                            const { dept, enroll, audit } = getMockData(exam);
                            const displayStatus = exam.Status === 'Scheduled' ? 'Finalized' : exam.Status; // Map for UI match

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
                                                ${dept === 'Computer Science' ? 'bg-blue-500' :
                                                    dept === 'Mathematics' ? 'bg-purple-500' :
                                                        dept === 'Biology' ? 'bg-green-500' : 'bg-gray-400'}`}
                                            />
                                            <span className="text-sm text-gray-700">{dept}</span>
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
                                        <span className="text-sm font-semibold text-gray-800">{enroll}</span>
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
                                                    <span className="text-sm font-bold">12 Student clashes</span>
                                                </div>
                                                <span className="text-xs text-red-400 pl-6">Conflict with PHY101</span>
                                            </div>
                                        )}
                                        {audit === 'Pending' && (
                                            <div className="flex items-center gap-2 text-blue-600">
                                                <RefreshCw size={14} className="animate-spin" />
                                                <span className="text-sm font-medium">Audit in progress...</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Rows per page:</span>
                    <select className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 px-2.5">
                        <option>10</option>
                        <option>20</option>
                        <option>50</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <Button isIconOnly size="sm" variant="light" isDisabled>
                        <ChevronLeft size={16} />
                    </Button>
                    <div className="flex gap-1">
                        <Button isIconOnly size="sm" className="bg-blue-600 text-white font-bold text-xs" radius="sm">1</Button>
                        <Button isIconOnly size="sm" variant="light" className="text-gray-500 text-xs" radius="sm">2</Button>
                        <Button isIconOnly size="sm" variant="light" className="text-gray-500 text-xs" radius="sm">3</Button>
                        <span className="text-gray-400 px-1 pt-1">...</span>
                        <Button isIconOnly size="sm" variant="light" className="text-gray-500 text-xs" radius="sm">12</Button>
                    </div>
                    <Button isIconOnly size="sm" variant="light" className="text-gray-600">
                        <ChevronRight size={16} />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ExamListTable;
