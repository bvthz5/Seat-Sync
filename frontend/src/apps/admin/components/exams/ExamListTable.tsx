import React, { useState, useEffect, useMemo } from 'react';
import { Chip, Tooltip, Button } from "@heroui/react";
import { Edit2, Trash2, Calendar, Clock, ChevronDown, ChevronUp, FileText, CheckCircle, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { normalizeExamDepartmentCode } from './departmentCode';

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

interface GroupedExam {
    id: string;
    subjectName: string;
    subjectCode: string;
    date: string;
    session: string;
    exams: Exam[];
}

const getStatusDetails = (status: string) => {
    switch (status.toLowerCase()) {
        case 'scheduled': return { color: 'primary' as const, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
        case 'completed': return { color: 'success' as const, bg: 'bg-green-50 text-green-700 border-green-200' };
        case 'ongoing':
        case 'in progress': return { color: 'warning' as const, bg: 'bg-orange-50 text-orange-700 border-orange-200' };
        default: return { color: 'default' as const, bg: 'bg-gray-100 text-gray-600 border-gray-200' };
    }
};

const ExamListTable: React.FC<ExamListTableProps> = ({ exams, loading, onEdit, onDelete, onAllocate, onRowClick }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // 2. FRONTEND GROUPING ONLY - Strict requirement
    const groupedExams = useMemo(() => {
        const groups: Record<string, GroupedExam> = {};
        
        exams.forEach(exam => {
            const subName = exam.Subject?.SubjectName || exam.ExamName;
            const subCode = exam.Subject?.SubjectCode || `EXP-${exam.ExamID}`;
            const dateStr = exam.ExamDate;
            const session = exam.Session;
            
            // Unique key for grouping
            const key = `${subCode}-${dateStr}-${session}`;
            
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    subjectName: subName,
                    subjectCode: subCode,
                    date: dateStr,
                    session: session,
                    exams: []
                };
            }
            groups[key].exams.push(exam);
        });
        
        return Object.values(groups);
    }, [exams]);

    // Reset pagination
    useEffect(() => {
        setCurrentPage(1);
    }, [groupedExams.length]);

    const totalPages = Math.max(1, Math.ceil(groupedExams.length / rowsPerPage));

    const paginatedGroups = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return groupedExams.slice(start, start + rowsPerPage);
    }, [groupedExams, currentPage, rowsPerPage]);

    const toggleExpand = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-48 bg-slate-200/50 rounded-2xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (exams.length === 0) {
        return (
            <div className="text-center py-20 bg-white border border-slate-200/60 rounded-[24px] shadow-sm max-w-3xl mx-auto">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 text-indigo-400">
                    <LayoutGrid size={32} />
                </div>
                <h2 className="text-slate-900 font-bold text-xl mb-2">No exams found</h2>
                <p className="text-slate-500 text-sm mb-8">Try adjusting your filters or create a new exam.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* CARD GRID LAYOUT */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {paginatedGroups.map((group) => {
                    const isExpanded = !!expandedGroups[group.id];
                    const dateObj = new Date(group.date);
                    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const displaySession = group.session === 'FN' ? 'Morning' : (group.session === 'AN' ? 'Afternoon' : group.session);

                    return (
                        <div key={group.id} className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden transition-all hover:shadow-md">
                            {/* Card Header (Subject Summary) */}
                            <div className="p-6 cursor-pointer" onClick={() => toggleExpand(group.id)}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-lg text-gray-900 line-clamp-1 leading-tight">{group.subjectName}</h3>
                                            <p className="text-sm font-bold text-indigo-600 mt-1 uppercase tracking-widest">{group.subjectCode}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm whitespace-nowrap">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{group.exams.length} Depts</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Chip 
                                        startContent={<Calendar size={14} className="text-indigo-500" />} 
                                        variant="flat" 
                                        color="primary"
                                        size="sm"
                                        className="font-bold tracking-wide"
                                    >
                                        {formattedDate}
                                    </Chip>
                                    <Chip 
                                        startContent={<Clock size={14} className="text-purple-500" />} 
                                        variant="flat" 
                                        color="secondary"
                                        size="sm"
                                        className="font-bold tracking-wide"
                                    >
                                        {displaySession}
                                    </Chip>
                                </div>
                            </div>

                            {/* Expand Indicator */}
                            <div 
                                onClick={() => toggleExpand(group.id)} 
                                className="bg-gray-50/50 border-t border-gray-100 flex items-center justify-between px-6 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {isExpanded ? 'Hide Departments' : 'View Departments'}
                                </span>
                                <div className="text-gray-400">
                                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </div>
                            </div>

                            {/* Expanded Body: Departments List */}
                            {isExpanded && (
                                <div className="p-4 border-t border-gray-100 bg-gray-50/50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {group.exams.map((exam) => {
                                        const deptName = exam.Subject?.Department?.DepartmentName || 'General';
                                        const statusStyle = getStatusDetails(exam.Status);
                                        const audit = exam.AuditStatus || 'Pending';

                                        return (
                                            <div 
                                                key={exam.ExamID} 
                                                className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-indigo-200 transition-colors cursor-pointer group"
                                                onClick={() => onRowClick(exam)}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="font-bold text-gray-800 line-clamp-1">{deptName}</span>
                                                        <div className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-widest border ${statusStyle.bg}`}>
                                                            {exam.Status}
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Audit Status */}
                                                    <div className="flex items-center gap-2">
                                                        {audit === 'Clean' && (
                                                            <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                                                                <CheckCircle size={14} />
                                                                <span className="text-xs font-bold">No Clashes</span>
                                                            </div>
                                                        )}
                                                        {audit === 'Conflict' && (
                                                            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100" title={exam.ConflictDetails}>
                                                                <AlertTriangle size={14} />
                                                                <span className="text-xs font-bold line-clamp-1 max-w-[200px]">{exam.ConflictDetails || 'Batch Clash'}</span>
                                                            </div>
                                                        )}
                                                        {audit === 'Pending' && (
                                                            <div className="flex items-center gap-1.5 text-blue-500 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                                <RefreshCw size={14} className="animate-spin" />
                                                                <span className="text-xs font-bold">Analyzing</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div 
                                                    className="flex items-center gap-2"
                                                    onClick={(e) => e.stopPropagation()} // Prevent firing row click
                                                >
                                                    <Tooltip content="Edit Exam">
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="flat"
                                                            color="primary"
                                                            onPress={() => onEdit(exam)}
                                                            className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg shadow-sm"
                                                        >
                                                            <Edit2 size={16} />
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip content="Delete Exam" color="danger">
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="flat"
                                                            color="danger"
                                                            onPress={() => onDelete(exam.ExamID)}
                                                            className="bg-red-50 text-red-600 hover:bg-red-100 rounded-lg shadow-sm"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                    <label className="flex items-center gap-2 text-sm text-gray-500 font-medium cursor-pointer" htmlFor="rowsPerPageSelect">
                        <span>Items per page:</span>
                        <select
                            id="rowsPerPageSelect"
                            aria-label="Items per page selection"
                            className="bg-gray-50 border border-gray-200 text-gray-700 font-bold rounded-lg focus:ring-indigo-500 p-1.5 px-3 outline-none cursor-pointer"
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
                    </label>

                    <div className="flex gap-1.5">
                        <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            className="bg-gray-50 text-gray-600 font-bold"
                            isDisabled={currentPage === 1}
                            onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        >
                            <ChevronLeft size={18} />
                        </Button>
                        <div className="flex items-center px-4 bg-gray-50 border border-gray-100 rounded-lg font-bold text-sm text-gray-700">
                            Page {currentPage} of {totalPages}
                        </div>
                        <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            className="bg-gray-50 text-gray-600 font-bold"
                            isDisabled={currentPage === totalPages}
                            onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        >
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamListTable;
