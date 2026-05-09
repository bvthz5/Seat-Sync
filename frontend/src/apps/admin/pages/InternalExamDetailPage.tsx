import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Tooltip } from '@heroui/react';
import { ArrowLeft, Upload, Users, Trash2, Search, BookOpen, Clock, CalendarDays, Building2, GraduationCap, FileSpreadsheet, CheckCircle, AlertTriangle, X, Download, RefreshCcw } from 'lucide-react';
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

    // Load exam detail
    const loadExamDetail = useCallback(async () => {
        if (!examId) return;
        try {
            const data = await InternalStudentService.getExamDetail(parseInt(examId));
            setExamDetail(data);
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

    // Filter students
    const filteredStudents = students.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            s.registerNumber?.toLowerCase().includes(q) ||
            s.fullName?.toLowerCase().includes(q) ||
            s.department?.toLowerCase().includes(q) ||
            s.departmentCode?.toLowerCase().includes(q)
        );
    });

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
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            {/* Header */}
            <div className="bg-white border-b border-slate-200/60 px-8 py-5 sticky top-0 z-30 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            isIconOnly variant="light"
                            className="text-slate-500 hover:text-slate-900 rounded-xl"
                            onPress={() => navigate(`/admin/exams/series/${seriesId}`)}
                        >
                            <ArrowLeft size={20} />
                        </Button>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                {exam?.SubjectCode || 'Exam'} — {exam?.SubjectName || 'Detail'}
                            </h1>
                            <p className="text-slate-500 text-sm font-medium mt-0.5">
                                Internal Exam Detail • Manage mapped students
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            className="bg-indigo-600 text-white font-bold shadow-sm hover:bg-indigo-700 rounded-xl h-11 px-5"
                            startContent={<Upload size={16} />}
                            onPress={() => { setShowImportModal(true); setImportResult(null); setSelectedFile(null); }}
                        >
                            Import Students
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto mt-8 space-y-8">
                {/* ── Exam Info Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                        <CardBody className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <CalendarDays size={22} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Date</p>
                                <p className="text-lg font-extrabold text-slate-900">{formatDate(exam?.ExamDate || '')}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                        <CardBody className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Clock size={22} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Session</p>
                                <p className="text-lg font-extrabold text-slate-900">
                                    {exam?.Session === 'FN' ? 'Forenoon' : 'Afternoon'}
                                    {exam?.StartTime && <span className="text-sm text-slate-400 ml-2">({exam.StartTime} – {exam.EndTime})</span>}
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                        <CardBody className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600">
                                <Users size={22} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Students Mapped</p>
                                <p className="text-lg font-extrabold text-slate-900">{examDetail?.studentCount || 0}</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                        <CardBody className="p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <GraduationCap size={22} />
                            </div>
                            <div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Semester</p>
                                <p className="text-lg font-extrabold text-slate-900">{exam?.Semester || '-'}</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* ── Department Breakdown ── */}
                {examDetail?.departmentBreakdown && examDetail.departmentBreakdown.length > 0 && (
                    <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                        <CardBody className="p-6">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Building2 size={16} /> Department Breakdown
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {examDetail.departmentBreakdown.map((d, i) => (
                                    <div key={i} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                                        <span className="text-sm font-bold text-indigo-700">{d.DepartmentCode}</span>
                                        <span className="text-xs text-slate-400">•</span>
                                        <span className="text-sm text-slate-600">{d.DepartmentName}</span>
                                        <Chip size="sm" className="bg-indigo-100 text-indigo-700 font-bold ml-1">{d.count}</Chip>
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                )}

                {/* ── Student List ── */}
                <Card className="bg-white border border-slate-200/60 shadow-sm rounded-2xl">
                    <CardBody className="p-6">
                        {/* Student List Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                                <Users size={20} className="text-indigo-600" />
                                Mapped Students
                                <Chip size="sm" className="bg-indigo-50 text-indigo-700 font-bold ml-2">{students.length}</Chip>
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <Input
                                        placeholder="Search students..."
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                        classNames={{
                                            inputWrapper: 'bg-slate-50 border border-slate-200 rounded-xl h-10 pl-9',
                                            input: 'text-sm font-medium',
                                        }}
                                    />
                                </div>
                                <Tooltip content="Refresh student list">
                                    <Button isIconOnly variant="flat" className="bg-slate-100 text-slate-600 rounded-xl" onPress={loadStudents}>
                                        <RefreshCcw size={16} />
                                    </Button>
                                </Tooltip>
                                {students.length > 0 && (
                                    <Button
                                        variant="flat"
                                        className="bg-red-50 text-red-600 font-bold rounded-xl h-10"
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
                                <p className="text-slate-400 text-sm">Loading students...</p>
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5">
                                    <Users className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-slate-800 font-bold text-lg mb-2">
                                    {searchQuery ? 'No students match your search' : 'No Students Mapped'}
                                </h3>
                                <p className="text-slate-400 text-sm mb-6">
                                    {searchQuery ? 'Try different search criteria' : 'Import an Excel file to map students to this exam.'}
                                </p>
                                {!searchQuery && (
                                    <Button
                                        className="bg-indigo-600 text-white font-bold rounded-xl shadow-md"
                                        startContent={<Upload size={16} />}
                                        onPress={() => { setShowImportModal(true); setImportResult(null); setSelectedFile(null); }}
                                    >
                                        Import Students
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-200/60">
                                            <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Register No</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Program</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Sem</th>
                                            <th className="text-left px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Batch</th>
                                            <th className="text-center px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((s, i) => (
                                            <tr key={s.internalStudentId} className="border-b border-slate-100/80 hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-5 py-3 text-slate-400 font-medium">{i + 1}</td>
                                                <td className="px-5 py-3 font-bold text-indigo-700">{s.registerNumber}</td>
                                                <td className="px-5 py-3 font-semibold text-slate-900">{s.fullName}</td>
                                                <td className="px-5 py-3">
                                                    <Chip size="sm" className="bg-slate-100 text-slate-700 font-bold">{s.departmentCode || '-'}</Chip>
                                                </td>
                                                <td className="px-5 py-3 text-slate-600">{s.program || '-'}</td>
                                                <td className="px-5 py-3 text-slate-600 font-medium">{s.semester || '-'}</td>
                                                <td className="px-5 py-3 text-slate-600">{s.batchYear || '-'}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <Tooltip content="Remove from this exam">
                                                        <Button
                                                            isIconOnly size="sm" variant="flat"
                                                            className="bg-red-50 text-red-500 hover:bg-red-100 min-w-7 w-7 h-7 rounded-lg"
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
        </div>
    );
};

export default InternalExamDetailPage;
