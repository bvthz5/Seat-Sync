import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Tooltip, Switch } from '@heroui/react';
import { ArrowLeft, Upload, Users, Trash2, Search, BookOpen, Clock, CalendarDays, Building2, GraduationCap, FileSpreadsheet, CheckCircle, AlertTriangle, X, Download, RefreshCcw, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InternalStudentService, MappedStudent, InternalExamDetail } from '../services/internalStudentService';

const InternalExamDetailPage: React.FC = () => {
    const { seriesId, examId } = useParams<{ seriesId: string; examId: string }>();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [examDetail, setExamDetail] = useState<InternalExamDetail | null>(null);
    const [students, setStudents] = useState<MappedStudent[]>([]);
    const [loading, setLoading] = useState(true);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [importing, setImporting] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importResult, setImportResult] = useState<any>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [reconciliation, setReconciliation] = useState<any>(null);
    const [showReconciliationModal, setShowReconciliationModal] = useState(false);
    const [importFromExams, setImportFromExams] = useState(true);
    const [deptToRemove, setDeptToRemove] = useState<{ DepartmentCode: string; DepartmentName: string; count: number } | null>(null);
    const [removingDept, setRemovingDept] = useState(false);
    const [showBulkDeptRemoveModal, setShowBulkDeptRemoveModal] = useState(false);
    const [selectedDeptsToRemove, setSelectedDeptsToRemove] = useState<string[]>([]);
    const [bulkRemoving, setBulkRemoving] = useState(false);

    // Load exam detail & reconciliation
    const loadExamDetail = useCallback(async () => {
        if (!examId) return;
        try {
            const [data, reconData] = await Promise.all([
                InternalStudentService.getExamDetail(parseInt(examId)),
                InternalStudentService.getExamReconciliation(parseInt(examId)).catch(() => null)
            ]);
            setExamDetail(data);
            setReconciliation(reconData);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load exam detail');
        }
    }, [examId]);

    // Load students mapped to this exam
    const loadStudents = useCallback(async () => {
        if (!examId) return;
        setStudentsLoading(true);
        try {
            const data = await InternalStudentService.getStudentsForExam(parseInt(examId));
            setStudents(data.students || []);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load students');
        } finally {
            setStudentsLoading(false);
        }
    }, [examId]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await Promise.all([loadExamDetail(), loadStudents()]);
            setLoading(false);
        };
        init();
    }, [loadExamDetail, loadStudents]);

    // Import students
    const handleImport = async () => {
        if (!selectedFile || !examId) return;
        setImporting(true);
        setImportResult(null);
        try {
            const result = await InternalStudentService.importStudents(selectedFile, parseInt(examId));
            setImportResult(result);
            toast.success(`Imported ${result.studentsImported} students, mapped ${result.studentsMapped} to exam`);
            await Promise.all([loadExamDetail(), loadStudents()]);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Import failed');
        } finally {
            setImporting(false);
        }
    };

    const [isAutoMapping, setIsAutoMapping] = useState(false);

    const handleAutoMap = async () => {
        if (!examId) return;
        setIsAutoMapping(true);
        try {
            const result = await InternalStudentService.autoMapStudents(parseInt(examId));
            if (result.success) {
                toast.success(result.message);
                await Promise.all([loadExamDetail(), loadStudents()]);
            } else {
                toast.error(result.message || 'Auto mapping failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to auto map students');
        } finally {
            setIsAutoMapping(false);
        }
    };

    // Remove single student
    const handleRemoveStudent = async (studentId: number, regNo: string) => {
        if (!examId) return;
        try {
            await InternalStudentService.removeStudentFromExam(parseInt(examId), studentId);
            toast.success(`Removed ${regNo}`);
            setStudents(prev => prev.filter(s => s.internalStudentId !== studentId));
            await loadExamDetail();
        } catch (error: any) {
            toast.error('Failed to remove student');
        }
    };

    // Clear all students
    const handleClearAll = async () => {
        if (!examId) return;
        setClearing(true);
        try {
            await InternalStudentService.clearStudentsFromExam(parseInt(examId));
            toast.success('All student mappings cleared');
            setStudents([]);
            setShowClearConfirm(false);
            await loadExamDetail();
        } catch (error: any) {
            toast.error('Failed to clear students');
        } finally {
            setClearing(false);
        }
    };

    // Remove specific department and all its mapped students
    const handleRemoveDepartment = async () => {
        if (!examId || !deptToRemove) return;
        setRemovingDept(true);
        try {
            const result = await InternalStudentService.removeDepartmentFromExam(parseInt(examId), deptToRemove.DepartmentCode);
            toast.success(result.message || `Removed ${deptToRemove.DepartmentCode} department and its students`);
            setDeptToRemove(null);
            await Promise.all([loadExamDetail(), loadStudents()]);
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to remove ${deptToRemove.DepartmentCode} department`);
        } finally {
            setRemovingDept(false);
        }
    };

    // Bulk remove multiple departments and all their mapped students
    const handleBulkRemoveDepartments = async () => {
        if (!examId || selectedDeptsToRemove.length === 0) return;
        setBulkRemoving(true);
        try {
            const result = await InternalStudentService.removeDepartmentFromExam(parseInt(examId), selectedDeptsToRemove);
            toast.success(result.message || `Removed ${selectedDeptsToRemove.length} department(s) and their students`);
            setShowBulkDeptRemoveModal(false);
            setSelectedDeptsToRemove([]);
            await Promise.all([loadExamDetail(), loadStudents()]);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove selected departments');
        } finally {
            setBulkRemoving(false);
        }
    };

    // Filter & Sort students Batch-wise (Department -> Division -> Roll Number 1..N -> Register Number)
    const filteredStudents = useMemo(() => {
        const result = students.filter(s => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
                s.registerNumber?.toLowerCase().includes(q) ||
                s.fullName?.toLowerCase().includes(q) ||
                s.department?.toLowerCase().includes(q) ||
                s.departmentCode?.toLowerCase().includes(q)
            );
        });

        return result.sort((a, b) => {
            const deptA = String(a.departmentCode || a.department || '').toUpperCase().trim();
            const deptB = String(b.departmentCode || b.department || '').toUpperCase().trim();
            if (deptA !== deptB) return deptA.localeCompare(deptB);

            const divA = String(a.division || 'A').toUpperCase().trim();
            const divB = String(b.division || 'A').toUpperCase().trim();
            if (divA !== divB) return divA.localeCompare(divB);

            const rollA = (a.rollNumber !== null && a.rollNumber !== undefined) ? Number(a.rollNumber) : 999999;
            const rollB = (b.rollNumber !== null && b.rollNumber !== undefined) ? Number(b.rollNumber) : 999999;
            if (rollA !== rollB) return rollA - rollB;

            return String(a.registerNumber || '').localeCompare(String(b.registerNumber || ''));
        });
    }, [students, searchQuery]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-medium">Loading exam details...</p>
                </div>
            </div>
        );
    }

    const exam = examDetail?.exam;

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-16">
            {/* Top Navigation Header */}
            <div className="bg-white border-b border-slate-200/80 px-6 sm:px-8 py-4 sticky top-0 z-30 shadow-xs">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <Button
                            isIconOnly 
                            variant="flat"
                            className="bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl w-10 h-10 transition-all shrink-0"
                            onPress={() => navigate(`/admin/exams/series/${seriesId}`)}
                        >
                            <ArrowLeft size={18} />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-xs tracking-wide uppercase">
                                    {exam?.SubjectCode || 'EXAM'}
                                </span>
                                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                                    {exam?.SubjectName || 'Internal Exam Detail'}
                                </h1>
                            </div>
                            <p className="text-slate-400 text-xs font-medium mt-0.5">
                                Internal Exam Detail • Manage mapped students and class allocations
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        {((examDetail?.studentCount || 0) > 0 || students.length > 0) && (
                            <Button
                                variant="flat"
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl h-10 px-4 text-xs border border-indigo-200/60 shadow-xs transition-all"
                                startContent={<CheckCircle size={15} />}
                                onPress={() => setShowReconciliationModal(true)}
                            >
                                Reconciliation & Audit
                            </Button>
                        )}
                        {((examDetail?.studentCount || 0) === 0 && students.length === 0) && (
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 px-4 text-xs shadow-sm transition-all"
                                startContent={<RefreshCcw size={15} className={isAutoMapping ? "animate-spin" : ""} />}
                                isLoading={isAutoMapping}
                                onPress={handleAutoMap}
                            >
                                Auto Register Students
                            </Button>
                        )}
                        {((examDetail?.studentCount || 0) > 0 || students.length > 0) && (
                            <Button
                                variant="flat"
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl h-10 px-4 text-xs border border-rose-200/60 shadow-xs transition-all"
                                startContent={<Trash2 size={15} />}
                                onPress={() => setShowClearConfirm(true)}
                            >
                                Clear Mapping
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-6 sm:px-8 max-w-[1600px] mx-auto mt-6 space-y-6">
                {/* ── Exam Info Stat Cards ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-white border border-slate-200/70 shadow-xs rounded-2xl hover:border-blue-200 transition-all">
                        <CardBody className="p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                <CalendarDays size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Exam Date</p>
                                <p className="text-base font-extrabold text-slate-900 truncate mt-0.5">{formatDate(exam?.ExamDate || '')}</p>
                            </div>
                        </CardBody>
                    </Card>

                    <Card className="bg-white border border-slate-200/70 shadow-xs rounded-2xl hover:border-emerald-200 transition-all">
                        <CardBody className="p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <Clock size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Session</p>
                                <p className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                                    {exam?.Session === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}
                                </p>
                            </div>
                        </CardBody>
                    </Card>

                    <Card className="bg-white border border-slate-200/70 shadow-xs rounded-2xl hover:border-violet-200 transition-all">
                        <CardBody className="p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
                                <Users size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Students Mapped</p>
                                <p className="text-base font-extrabold text-slate-900 truncate mt-0.5">{examDetail?.studentCount || 0}</p>
                            </div>
                        </CardBody>
                    </Card>

                    <Card className="bg-white border border-slate-200/70 shadow-xs rounded-2xl hover:border-amber-200 transition-all">
                        <CardBody className="p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                <GraduationCap size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-slate-400 text-[11px] font-extrabold uppercase tracking-wider">Semester</p>
                                <p className="text-base font-extrabold text-slate-900 truncate mt-0.5">
                                    {exam?.Semester ? (exam.Semester.toUpperCase().startsWith('S') ? exam.Semester.toUpperCase() : `S${exam.Semester}`) : '-'}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* ── Department Breakdown ── */}
                {examDetail?.departmentBreakdown && examDetail.departmentBreakdown.length > 0 && (
                    <Card className="bg-white border border-slate-200/70 shadow-xs rounded-2xl">
                        <CardBody className="p-5 sm:p-6 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <Building2 size={15} className="text-indigo-600" /> Department Breakdown
                                    </h3>
                                    <Tooltip 
                                        content="Use Case: Click the ✕ on any department tag to remove that department and unmap all its corresponding students from this exam (e.g. BHM, M.Tech, or PhD students who do not take this exam)."
                                        placement="top"
                                        classNames={{
                                            content: "bg-slate-900 text-white font-medium text-xs px-3.5 py-2.5 rounded-xl max-w-sm shadow-xl leading-relaxed"
                                        }}
                                    >
                                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100/80 text-[11px] font-bold cursor-help hover:bg-indigo-100 transition-colors shadow-2xs">
                                            <Info size={13} className="text-indigo-600 shrink-0" />
                                            <span>Use Case Info</span>
                                        </div>
                                    </Tooltip>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">
                                        {examDetail.departmentBreakdown.length} {examDetail.departmentBreakdown.length === 1 ? 'Department' : 'Departments'} Mapped
                                    </span>
                                </div>
                            </div>

                            {/* Quick Tip Banner for New Users */}
                            <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-indigo-900">
                                <Info size={14} className="text-indigo-600 shrink-0" />
                                <p className="font-medium">
                                    <span className="font-bold">Tip for users:</span> Click the red <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-rose-100 text-rose-600 font-extrabold text-[10px]">✕</span> button on any department tag below to remove that department and unmap its students.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2.5 pt-1">
                                {examDetail.departmentBreakdown.map((d, i) => (
                                    <div 
                                        key={i} 
                                        className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-xl bg-slate-50/90 border border-slate-200/80 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 text-xs"
                                    >
                                        <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wide">
                                            {d.DepartmentCode}
                                        </span>
                                        <span className="font-semibold text-slate-700 max-w-[180px] truncate" title={d.DepartmentName}>
                                            {d.DepartmentName}
                                        </span>
                                        <span className="ml-0.5 px-2 py-0.5 rounded-lg bg-slate-200/80 text-slate-700 font-extrabold text-[11px]">
                                            {d.count}
                                        </span>
                                        
                                        <Tooltip content={`Click to remove ${d.DepartmentCode} department and unmap ${d.count} student(s)`}>
                                            <button
                                                type="button"
                                                onClick={() => setDeptToRemove(d)}
                                                className="ml-1 w-6 h-6 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/70 flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
                                                aria-label={`Remove department ${d.DepartmentCode}`}
                                            >
                                                <X size={13} strokeWidth={2.5} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* ── Student List Section ── */}
                <Card className="bg-white border border-slate-200/70 shadow-xs rounded-2xl overflow-hidden">
                    <CardBody className="p-5 sm:p-6 space-y-5">
                        {/* Header Row: Title & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Users size={18} />
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                                    Mapped Students
                                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-xs">
                                        {students.length}
                                    </span>
                                </h3>
                            </div>

                            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                                {/* Single Clean Search Input */}
                                <div className="w-full sm:w-64">
                                    <Input
                                        placeholder="Search students..."
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                        isClearable
                                        onClear={() => setSearchQuery('')}
                                        startContent={<Search size={16} className="text-slate-400 shrink-0 mr-1" />}
                                        classNames={{
                                            inputWrapper: 'bg-slate-50/80 border border-slate-200 rounded-xl h-10 shadow-none focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all',
                                            input: 'text-xs font-medium text-slate-800 placeholder:text-slate-400',
                                        }}
                                    />
                                </div>

                                 {/* Remove Department Button */}
                                 {examDetail?.departmentBreakdown && examDetail.departmentBreakdown.length > 0 && (
                                     <Tooltip content="Select and remove whole departments (e.g. BHM, PHD) and all their students at once">
                                         <Button
                                             variant="flat"
                                             className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl h-10 px-3.5 text-xs border border-indigo-200/60 shadow-2xs transition-all shrink-0"
                                             startContent={<Building2 size={15} className="text-indigo-600" />}
                                             onPress={() => {
                                                 setSelectedDeptsToRemove([]);
                                                 setShowBulkDeptRemoveModal(true);
                                             }}
                                         >
                                             Remove Dept
                                         </Button>
                                     </Tooltip>
                                 )}

                                <Tooltip content="Refresh student list">
                                    <Button 
                                        isIconOnly 
                                        variant="flat" 
                                        className="bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl h-10 w-10 shrink-0" 
                                        onPress={loadStudents}
                                    >
                                        <RefreshCcw size={15} />
                                    </Button>
                                </Tooltip>

                                {students.length > 0 && (
                                    <Button
                                        variant="flat"
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl h-10 px-3.5 text-xs transition-all shrink-0"
                                        startContent={<Trash2 size={14} />}
                                        onPress={() => setShowClearConfirm(true)}
                                    >
                                        Clear All
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Student Table */}
                        {studentsLoading ? (
                            <div className="py-16 flex flex-col items-center gap-3">
                                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                <p className="text-slate-400 text-sm font-medium">Loading mapped students...</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="py-16 text-center bg-slate-50/50 rounded-2xl border border-slate-100">
                                <div className="w-16 h-16 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xs">
                                    <Users className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-slate-800 font-extrabold text-base mb-1">
                                    {searchQuery ? 'No matching students found' : 'No Students Mapped'}
                                </h3>
                                <p className="text-slate-400 text-xs mb-5 max-w-sm mx-auto">
                                    {searchQuery ? 'Try clearing or updating your search query.' : 'Use Auto Register Students to automatically map eligible students.'}
                                </p>
                                {!searchQuery && (
                                    <Button
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl h-10 px-5 text-xs shadow-xs transition-all"
                                        startContent={<RefreshCcw size={15} className={isAutoMapping ? "animate-spin" : ""} />}
                                        isLoading={isAutoMapping}
                                        onPress={handleAutoMap}
                                    >
                                        Auto Register Students
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200/70 shadow-xs">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200/70 text-slate-500 uppercase tracking-wider text-[11px] font-black">
                                            <th className="px-4 py-3.5 w-12 text-center">#</th>
                                            <th className="px-4 py-3.5">Register No / Roll</th>
                                            <th className="px-4 py-3.5">Name</th>
                                            <th className="px-4 py-3.5">Department</th>
                                            <th className="px-4 py-3.5">Program</th>
                                            <th className="px-4 py-3.5">Sem</th>
                                            <th className="px-4 py-3.5">Batch</th>
                                            <th className="px-4 py-3.5 text-center">Method</th>
                                            <th className="px-4 py-3.5 text-center w-20">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {filteredStudents.map((s, i) => (
                                            <tr key={s.internalStudentId} className="hover:bg-indigo-50/20 transition-colors">
                                                <td className="px-4 py-3 text-center text-slate-400 font-bold">{i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="font-extrabold text-indigo-700 text-xs">{s.registerNumber}</div>
                                                    {(s.rollNumber || s.division) && (
                                                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                                            {s.rollNumber ? <>Roll No: <span className="text-slate-700 font-bold">{s.rollNumber}</span></> : null}
                                                            {s.rollNumber && s.division ? ' • ' : null}
                                                            {s.division ? <>Div <span className="text-slate-700 font-bold">{s.division}</span></> : null}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 font-bold text-slate-900">{s.fullName}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[10px] border border-slate-200/60">
                                                        {s.departmentCode || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">{s.program || '-'}</td>
                                                <td className="px-4 py-3 text-slate-600 font-bold">{s.semester || '-'}</td>
                                                <td className="px-4 py-3 text-slate-600 font-medium">{s.batch || s.batchYear || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                                        s.registrationMethod === 'EXCEL' 
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                    }`}>
                                                        {s.registrationMethod || 'AUTO'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Tooltip content="Remove from this exam">
                                                        <Button
                                                            isIconOnly 
                                                            size="sm" 
                                                            variant="flat"
                                                            className="bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white transition-all w-7 h-7 min-w-7 rounded-lg"
                                                            onPress={() => handleRemoveStudent(s.internalStudentId, s.registerNumber)}
                                                        >
                                                            <X size={14} />
                                                        </Button>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            {/* ── Import Modal ── */}
            <Modal
                isOpen={showImportModal}
                onClose={() => !importing && setShowImportModal(false)}
                size="lg"
                backdrop="blur"
                classNames={{
                    base: 'bg-white shadow-2xl rounded-3xl',
                    header: 'border-b border-slate-100 pb-4 pt-6 px-8',
                    body: 'py-6 px-8',
                    footer: 'border-t border-slate-100 pt-4 pb-6 px-8',
                    closeButton: 'top-5 right-5 text-slate-400 hover:bg-slate-100',
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                            <FileSpreadsheet className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <span className="text-xl font-bold text-slate-900">Import Students</span>
                            <p className="text-sm text-slate-400 font-medium mt-0.5">
                                Upload an Excel file to map students to: <span className="text-indigo-600 font-bold">{exam?.SubjectCode}</span>
                            </p>
                        </div>
                    </ModalHeader>
                    <ModalBody>
                        {!importResult ? (
                            <div className="space-y-6">
                                {/* File Drop Zone */}
                                <div
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                        selectedFile
                                            ? 'border-indigo-400 bg-indigo-50/30'
                                            : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20'
                                    }`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) setSelectedFile(file);
                                        }}
                                    />
                                    {selectedFile ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <FileSpreadsheet className="text-indigo-600" size={24} />
                                            <div className="text-left">
                                                <p className="font-bold text-slate-900">{selectedFile.name}</p>
                                                <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                            <Button
                                                isIconOnly size="sm" variant="light"
                                                className="text-slate-400 hover:text-red-600"
                                                onPress={() => setSelectedFile(null)}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto text-slate-400 mb-3" size={32} />
                                            <p className="text-slate-700 font-bold text-sm">Click to upload Excel file</p>
                                            <p className="text-slate-400 text-xs mt-1">.xlsx, .xls, or .csv</p>
                                        </>
                                    )}
                                </div>

                                {/* Format hint */}
                                <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-sm">
                                    <p className="text-slate-600 font-bold mb-2">Expected columns:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Sl No', 'Register Number', 'Name', 'Batch/Class', 'Department', 'Semester'].map(col => (
                                            <Chip key={col} size="sm" className="bg-white border border-slate-200 text-slate-600 font-medium">{col}</Chip>
                                        ))}
                                    </div>
                                    <p className="text-slate-400 text-xs mt-3">
                                        Headers are auto-detected. Multi-section files (multiple batches) are supported.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* ── Import Result Summary ── */
                            <div className="space-y-5">
                                <div className={`p-5 rounded-2xl border ${importResult.errorCount > 0 ? 'bg-amber-50/30 border-amber-200' : 'bg-emerald-50/30 border-emerald-200'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        {importResult.errorCount > 0 ? (
                                            <AlertTriangle className="text-amber-600" size={24} />
                                        ) : (
                                            <CheckCircle className="text-emerald-600" size={24} />
                                        )}
                                        <h3 className="text-lg font-bold text-slate-900">Import Complete</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                                            <p className="text-2xl font-extrabold text-indigo-700">{importResult.studentsImported}</p>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Students Imported</p>
                                        </div>
                                        <div className="bg-white rounded-xl p-4 border border-slate-100 text-center">
                                            <p className="text-2xl font-extrabold text-emerald-700">{importResult.studentsMapped}</p>
                                            <p className="text-xs text-slate-500 font-bold uppercase">Mapped to Exam</p>
                                        </div>
                                    </div>
                                </div>

                                {importResult.errors?.length > 0 && (
                                    <div className="bg-red-50/30 border border-red-200 rounded-xl p-4 max-h-40 overflow-y-auto">
                                        <p className="text-sm font-bold text-red-700 mb-2">{importResult.errorCount} Error(s):</p>
                                        {importResult.errors.map((err: any, i: number) => (
                                            <p key={i} className="text-xs text-red-600 py-0.5">Row {err.row}: {err.reason}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter className="flex justify-between">
                        {!importResult ? (
                            <>
                                <Button variant="light" className="font-bold text-slate-500" onPress={() => setShowImportModal(false)}>Cancel</Button>
                                <Button
                                    className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 rounded-xl px-6"
                                    isLoading={importing}
                                    isDisabled={!selectedFile}
                                    onPress={handleImport}
                                    startContent={!importing && <Upload size={16} />}
                                >
                                    {importing ? 'Importing...' : 'Import & Map'}
                                </Button>
                            </>
                        ) : (
                            <Button className="bg-indigo-600 text-white font-bold rounded-xl px-6 ml-auto" onPress={() => setShowImportModal(false)}>
                                Done
                            </Button>
                        )}
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* ── Bulk Department Removal Modal ── */}
            <Modal 
                isOpen={showBulkDeptRemoveModal} 
                onClose={() => !bulkRemoving && setShowBulkDeptRemoveModal(false)} 
                size="lg" 
                backdrop="blur"
                classNames={{ 
                    base: 'bg-white shadow-2xl rounded-3xl overflow-hidden',
                    header: 'border-b border-slate-100 px-6 py-4',
                    body: 'p-6',
                    footer: 'border-t border-slate-100 px-6 py-4 flex justify-between items-center'
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                            <Building2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900">Remove Department(s) & Students</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                Select department(s) to unmap all their enrolled students from {exam?.SubjectCode}
                            </p>
                        </div>
                    </ModalHeader>
                    <ModalBody className="space-y-4 max-h-[60vh] overflow-y-auto">
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                            <span className="text-xs font-bold text-slate-700">
                                Mapped Departments ({examDetail?.departmentBreakdown?.length || 0})
                            </span>
                            <div className="flex items-center gap-2">
                                <Button 
                                    size="sm" 
                                    variant="light" 
                                    className="text-xs font-bold text-indigo-600 h-7"
                                    onPress={() => setSelectedDeptsToRemove(examDetail?.departmentBreakdown?.map(d => d.DepartmentCode) || [])}
                                >
                                    Select All
                                </Button>
                                <span className="text-slate-300">•</span>
                                <Button 
                                    size="sm" 
                                    variant="light" 
                                    className="text-xs font-bold text-slate-500 h-7"
                                    onPress={() => setSelectedDeptsToRemove([])}
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {examDetail?.departmentBreakdown?.map((d) => {
                                const isSelected = selectedDeptsToRemove.includes(d.DepartmentCode);
                                return (
                                    <div
                                        key={d.DepartmentCode}
                                        onClick={() => {
                                            setSelectedDeptsToRemove(prev => 
                                                isSelected 
                                                    ? prev.filter(c => c !== d.DepartmentCode) 
                                                    : [...prev, d.DepartmentCode]
                                            );
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                            isSelected
                                                ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-500/10 shadow-xs'
                                                : 'bg-white border-slate-200/80 hover:border-indigo-200 hover:bg-slate-50/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                                            />
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-extrabold text-indigo-700 text-xs">{d.DepartmentCode}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-medium truncate" title={d.DepartmentName}>
                                                    {d.DepartmentName}
                                                </p>
                                            </div>
                                        </div>
                                        <Chip size="sm" className={`font-extrabold text-xs shrink-0 ${isSelected ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {d.count} Students
                                        </Chip>
                                    </div>
                                );
                            })}
                        </div>

                        {selectedDeptsToRemove.length > 0 && (
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-xs text-rose-800">
                                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                                <span>
                                    Selected <span className="font-extrabold">{selectedDeptsToRemove.length} department(s)</span>. Total <span className="font-extrabold">{
                                        examDetail?.departmentBreakdown
                                            ?.filter(d => selectedDeptsToRemove.includes(d.DepartmentCode))
                                            ?.reduce((sum, d) => sum + d.count, 0) || 0
                                    } student(s)</span> will be unmapped from this exam.
                                </span>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button 
                            variant="flat" 
                            onPress={() => setShowBulkDeptRemoveModal(false)} 
                            isDisabled={bulkRemoving} 
                            className="font-bold bg-slate-100 text-slate-700 rounded-xl h-10 px-5 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button 
                            color="danger" 
                            onPress={handleBulkRemoveDepartments} 
                            isLoading={bulkRemoving} 
                            isDisabled={selectedDeptsToRemove.length === 0}
                            className="font-bold rounded-xl h-10 px-5 text-xs shadow-sm"
                            startContent={!bulkRemoving && <Trash2 size={14} />}
                        >
                            {bulkRemoving 
                                ? 'Removing...' 
                                : `Remove ${selectedDeptsToRemove.length} Dept(s) (${
                                    examDetail?.departmentBreakdown
                                        ?.filter(d => selectedDeptsToRemove.includes(d.DepartmentCode))
                                        ?.reduce((sum, d) => sum + d.count, 0) || 0
                                } Students)`
                            }
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* ── Remove Specific Department Confirm Modal ── */}
            <Modal 
                isOpen={!!deptToRemove} 
                onClose={() => !removingDept && setDeptToRemove(null)} 
                size="md" 
                backdrop="blur"
                classNames={{ 
                    base: 'bg-white shadow-2xl rounded-3xl overflow-hidden',
                    header: 'border-b border-slate-100 px-6 py-4',
                    body: 'p-6',
                    footer: 'border-t border-slate-100 px-6 py-4 flex justify-end gap-3'
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                            <Trash2 size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900">Remove Department Mapping?</h3>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                {exam?.SubjectCode} — {exam?.SubjectName}
                            </p>
                        </div>
                    </ModalHeader>
                    <ModalBody className="space-y-4">
                        <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4 flex items-start gap-3">
                            <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-slate-700 space-y-1">
                                <p className="font-bold text-slate-900">
                                    You are about to remove <span className="text-rose-600 font-extrabold">{deptToRemove?.DepartmentCode}</span> ({deptToRemove?.DepartmentName}).
                                </p>
                                <p className="text-slate-600">
                                    This action will unmap <span className="font-extrabold text-rose-600">{deptToRemove?.count} student(s)</span> belonging to {deptToRemove?.DepartmentCode} from this exam.
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs text-slate-500">
                            <span className="font-bold text-slate-700">💡 Note:</span> Student records in the main database will remain unaffected. Only their mapping to this specific internal exam will be removed.
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button 
                            variant="flat" 
                            onPress={() => setDeptToRemove(null)} 
                            isDisabled={removingDept} 
                            className="font-bold bg-slate-100 text-slate-700 rounded-xl h-10 px-5 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button 
                            color="danger" 
                            onPress={handleRemoveDepartment} 
                            isLoading={removingDept} 
                            className="font-bold rounded-xl h-10 px-5 text-xs shadow-sm"
                            startContent={!removingDept && <Trash2 size={14} />}
                        >
                            {removingDept ? 'Removing...' : `Remove ${deptToRemove?.DepartmentCode} (${deptToRemove?.count} Students)`}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* ── Clear All Confirm ── */}
            <Modal isOpen={showClearConfirm} onClose={() => !clearing && setShowClearConfirm(false)} size="sm" backdrop="blur"
                classNames={{ base: 'bg-white shadow-2xl rounded-3xl' }}
            >
                <ModalContent>
                    <ModalBody className="py-8 px-6 text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Clear All Students?</h3>
                        <p className="text-slate-500 text-sm mb-6">
                            This will remove <span className="font-bold text-red-600">{students.length} student mapping(s)</span> from this exam. The student records themselves will not be deleted.
                        </p>
                        <div className="flex gap-3">
                            <Button variant="flat" onPress={() => setShowClearConfirm(false)} disabled={clearing} className="flex-1 font-bold bg-slate-100 text-slate-700">Cancel</Button>
                            <Button color="danger" onPress={handleClearAll} isLoading={clearing} className="flex-1 font-bold">Clear All</Button>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* ── Reconciliation Audit Modal ── */}
            <Modal isOpen={showReconciliationModal} onClose={() => setShowReconciliationModal(false)} size="3xl" backdrop="blur"
                classNames={{ base: 'bg-white shadow-2xl rounded-3xl overflow-hidden' }}
            >
                <ModalContent>
                    <ModalHeader className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-slate-900">Reconciliation & Eligibility Audit</h3>
                                <p className="text-xs text-slate-400 font-medium">{exam?.SubjectCode} — {exam?.SubjectName}</p>
                            </div>
                        </div>
                    </ModalHeader>
                    <ModalBody className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                        {reconciliation ? (
                            <>
                                {/* Status Banner */}
                                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                                    reconciliation.status === 'VALIDATED'
                                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                        : reconciliation.status === 'MISSING_STUDENTS'
                                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                        : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        {reconciliation.status === 'VALIDATED' ? (
                                            <CheckCircle size={22} className="text-emerald-600 shrink-0" />
                                        ) : (
                                            <AlertTriangle size={22} className="text-amber-600 shrink-0" />
                                        )}
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-wider">
                                                Status: {reconciliation.status}
                                            </p>
                                            <p className="text-xs font-medium opacity-90 mt-0.5">{reconciliation.message}</p>
                                        </div>
                                    </div>
                                    <Chip className="font-extrabold text-xs" color={reconciliation.status === 'VALIDATED' ? 'success' : 'warning'}>
                                        {reconciliation.registeredCount} / {reconciliation.expectedCount} Registered
                                    </Chip>
                                </div>

                                {/* Summary Grid */}
                                <div className="grid grid-cols-4 gap-3 text-center">
                                    <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Expected</p>
                                        <p className="text-lg font-black text-slate-800">{reconciliation.expectedCount}</p>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase">Registered</p>
                                        <p className="text-lg font-black text-emerald-800">{reconciliation.registeredCount}</p>
                                    </div>
                                    <div className="bg-red-50 border border-red-200/80 p-3 rounded-xl">
                                        <p className="text-[10px] font-black text-red-500 uppercase">Missing</p>
                                        <p className="text-lg font-black text-red-700">{reconciliation.missingCount}</p>
                                    </div>
                                    <div className="bg-indigo-50 border border-indigo-200/80 p-3 rounded-xl">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase">Scope</p>
                                        <p className="text-xs font-black text-indigo-800 truncate" title={reconciliation.branchScope?.join(', ')}>
                                            {reconciliation.branchScope?.join(', ') || 'None'}
                                        </p>
                                    </div>
                                </div>

                                {/* Branch Breakdown Table */}
                                <div>
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2.5">Branch Reconciliation</h4>
                                    <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-extrabold uppercase">
                                                <tr>
                                                    <th className="p-3">Department</th>
                                                    <th className="p-3">Expected</th>
                                                    <th className="p-3">Registered</th>
                                                    <th className="p-3">Missing</th>
                                                    <th className="p-3 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {reconciliation.branchBreakdown?.map((b: any, i: number) => (
                                                    <tr key={i} className="hover:bg-slate-50/50">
                                                        <td className="p-3 font-bold text-slate-900">{b.departmentCode} — {b.departmentName}</td>
                                                        <td className="p-3 font-semibold text-slate-700">{b.expected}</td>
                                                        <td className="p-3 font-semibold text-emerald-700">{b.registered}</td>
                                                        <td className="p-3 font-semibold text-red-600">{b.missing}</td>
                                                        <td className="p-3 text-right">
                                                            <Chip size="sm" color={b.status === 'OK' ? 'success' : 'danger'} variant="flat" className="font-extrabold text-[10px]">
                                                                {b.status}
                                                            </Chip>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Missing Students Detail */}
                                {reconciliation.missingStudents?.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-black text-red-600 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                            <AlertTriangle size={14} /> Missing Registered Students ({reconciliation.missingStudents.length})
                                        </h4>
                                        <div className="border border-red-200 bg-red-50/30 rounded-2xl max-h-48 overflow-y-auto p-3 space-y-1.5">
                                            {reconciliation.missingStudents.map((s: any, idx: number) => (
                                                <div key={idx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-red-100 shadow-xs">
                                                    <div>
                                                        <span className="font-extrabold text-slate-900">{s.fullName}</span>
                                                        <span className="text-slate-400 text-[11px] ml-2">({s.registerNumber})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-bold text-[10px]">{s.departmentCode} Div {s.division}</span>
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md font-bold text-[10px]">{s.reason}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="py-8 text-center text-slate-400 text-sm">Loading reconciliation metrics...</div>
                        )}
                    </ModalBody>
                    <ModalFooter className="border-t border-slate-100 px-6 py-3">
                        <Button className="bg-slate-900 text-white font-bold rounded-xl px-6" onPress={() => setShowReconciliationModal(false)}>
                            Close Audit
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default InternalExamDetailPage;
