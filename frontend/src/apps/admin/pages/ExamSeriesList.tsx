import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardBody, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Clock, FileText, AlertCircle, ArrowLeft, CheckCircle, CalendarDays, Upload, Pencil, Trash2, Users, UserCheck, GraduationCap, ChevronDown, ChevronRight, FolderOpen, UserPlus, Building2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';
import { SeriesService } from '../services/seriesService';
import { InternalStudentService } from '../services/internalStudentService';
import { AccessTokenStore } from '../../../services/api';
import CreateExamModal from '../components/exams/CreateExamModal';
import ExamImportModal from '../components/exams/ExamImportModal';
import { InternalExamImportModal } from '../components/internal-structure/InternalExamImportModal';
import { SemesterStudentImportModal } from '../components/internal-structure/SemesterStudentImportModal';
import EditExamModal from '../components/exams/EditExamModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { BulkAutoRegisterModal } from '../components/exams/BulkAutoRegisterModal';

const isMissingDepartment = (code: string, name: string) => {
    return !code || code === 'GEN' || code === 'GENERAL' || name === 'GENERAL';
};

type BranchOption = {
    examId: number;
    departmentId: number;
    departmentCode: string;
    departmentName: string;
    /** Raw timetable Branches value – source of truth for card display */
    branchScope: string;
};

type GroupedExam = {
    groupKey: string;
    examName: string;
    programme: string;
    date: string;
    session: string;
    status: string;
    duration: number;
    subjectCode: string;
    semester: string;
    branches: BranchOption[];
    hasRegistrations: boolean;
};

const formatExamCardTitle = (examName: string, subjectCode: string): string => {
    const codeStr = (subjectCode || '').trim().toUpperCase();
    const nameStr = (examName || '').trim();

    if (!nameStr || nameStr.toUpperCase() === codeStr || /^[0-9]{2}[A-Z]{2,8}[0-9]{3,4}[A-Z0-9]*$/i.test(nameStr)) {
        return "Subject Name Not Specified";
    }

    let cleanName = nameStr;
    if (codeStr && cleanName.toUpperCase().startsWith(codeStr)) {
        cleanName = cleanName.slice(codeStr.length).replace(/^[\s:-–—]+/, '').trim();
    }

    if (!cleanName || cleanName.toUpperCase() === codeStr) return "Subject Name Not Specified";

    const acronyms = new Set(['MCA', 'BTECH', 'MTECH', 'AI', 'ML', 'CS', 'IT', 'ECE', 'EEE', 'CE', 'ME', 'VLSI', 'DSP', 'IOT', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'I', 'II', 'III', 'IV', 'V', 'VI']);
    
    return cleanName
        .split(' ')
        .map(word => {
            const upper = word.toUpperCase();
            if (acronyms.has(upper)) return upper;
            if (word.length <= 3 && /^[A-Z]+$/i.test(word)) return upper;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
};

const normalizeExamTitle = (name: string): string => {
    return String(name || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .trim();
};

const groupExamsByPaper = (exams: any[]): GroupedExam[] => {
    const groups = new Map<string, GroupedExam & { branchKeys: Set<string>; subjectCodes: Set<string> }>();

    exams.forEach((exam: any) => {
        const date = String(exam?.ExamDate || '').split('T')[0];
        const examName = String(exam?.ExamName || '').trim();
        const session = String(exam?.Session || '').trim().toUpperCase();
        const duration = Number(exam?.Duration || 0);
        const semRaw = String(exam?.Semester || exam?.Subject?.Semester || 'S3').toUpperCase().trim();
        const semester = semRaw.startsWith('S') ? semRaw : (semRaw ? `S${semRaw}` : 'S3');
        const rawCode = String(exam?.Subject?.SubjectCode || exam?.SubjectCode || '').trim().toUpperCase();
        const programme = String(exam?.Programme || '').trim();

        const titleNorm = normalizeExamTitle(examName);
        const codeNorm = rawCode.replace(/[^A-Z0-9]/g, '');
        const progNorm = programme.toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Standardized grouping key: Semester + Programme + Date + Session + Normalized Title (or Code)
        // Consolidates identical paper sessions into 1 card while strictly separating programmes
        const groupKey = `${semester}::${progNorm}::${date}::${session}::${titleNorm || codeNorm}`;
        const department = exam?.Subject?.Department || {};
        const deptCode = String(department.DepartmentCode || exam?.BranchScope || 'GEN');
        const deptName = String(department.DepartmentName || exam?.BranchScope || 'General');
        // Use the raw timetable BranchScope value directly from the database record/imported timetable
        // NEVER fall back to DepartmentID or Department table data
        const branchScope = String(exam?.BranchScope || '').trim();
        const branchKey = String(exam.ExamID);

        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                groupKey,
                examName,
                programme,
                date,
                session,
                status: String(exam?.Status || 'Scheduled'),
                duration,
                subjectCode: rawCode,
                semester,
                branches: [],
                branchKeys: new Set<string>(),
                subjectCodes: new Set<string>(),
                hasRegistrations: false
            });
        }

        const group = groups.get(groupKey)!;

        if (rawCode && !group.subjectCodes.has(rawCode)) {
            group.subjectCodes.add(rawCode);
        }

        if (!group.branchKeys.has(branchKey)) {
            group.branchKeys.add(branchKey);
            group.branches.push({
                examId: Number(exam.ExamID),
                departmentId: Number(department.DepartmentID || 0),
                departmentCode: deptCode,
                departmentName: deptName,
                branchScope: branchScope,
            });
        }

        if (Number(exam.registrationCount || 0) > 0) {
            group.hasRegistrations = true;
        }
    });

    return Array.from(groups.values())
        .map(({ branchKeys, subjectCodes, ...group }) => {
            const codes = Array.from(subjectCodes);
            const displayCode = codes.length > 0 ? codes.join(' / ') : group.subjectCode;
            return {
                ...group,
                subjectCode: displayCode
            };
        })
        .sort((a, b) => {
            const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateCmp !== 0) return dateCmp;
            
            if (a.session !== b.session) {
                return a.session === 'FN' ? -1 : 1;
            }
            
            return a.examName.localeCompare(b.examName);
        });
};

const ExamSeriesList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as { seriesName?: string; examType?: 'Internal' | 'EndSemester' } | undefined;
    const { seriesId } = useParams<{ seriesId: string }>();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isBulkMapping, setIsBulkMapping] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteExamIds, setDeleteExamIds] = useState<number[] | null>(null);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [activeImportSemester, setActiveImportSemester] = useState<string | null>(null);
    const [seriesName, setSeriesName] = useState<string>(locationState?.seriesName || '');
    const [examType, setExamType] = useState<'Internal' | 'EndSemester'>(locationState?.examType || 'Internal');

    useEffect(() => {
        if (locationState?.seriesName) {
            setSeriesName(locationState.seriesName);
            if (locationState.examType) setExamType(locationState.examType);
        } else if (seriesId && AccessTokenStore.hasAnySession()) {
            fetchSeriesDetails();
        }

        if (seriesId && AccessTokenStore.hasAnySession()) {
            fetchExams();
        }
    }, [seriesId, locationState]);

    const fetchSeriesDetails = async () => {
        if (!AccessTokenStore.hasAnySession()) return;
        try {
            const response = await SeriesService.getAll();
            const series = Array.isArray(response) ? response : response.data || [];
            const found = series.find((s: any) => String(s.ExamSeriesID) === seriesId);
            if (found) {
                setSeriesName(found.SeriesName);
                setExamType(found.ExamType);
            }
        } catch (error) {
            // Silently handled by API interceptor
        }
    };

    const [batches, setBatches] = useState<any[]>([]);
    const [selectedProgrammes, setSelectedProgrammes] = useState<Record<string, string>>({});

    const fetchExams = async () => {
        if (!AccessTokenStore.hasAnySession()) return;
        setLoading(true);
        try {
            const [examsRes, batchesRes] = await Promise.all([
                ExamService.getAll({ seriesId }),
                InternalStudentService.getBatches().catch(() => ({ batches: [] }))
            ]);
            setExams(examsRes || []);
            setBatches(batchesRes?.batches || []);
        } catch (error) {
            console.error("Failed to fetch exams", error);
            toast.error("Failed to load exams");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateExam = () => {
        setIsCreateModalOpen(true);
    };

    const handleEdit = (exam: any) => {
        setSelectedExam(exam);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (examIds: number[]) => {
        setDeleteExamIds(examIds);
    };

    const confirmDelete = async () => {
        if (!deleteExamIds || deleteExamIds.length === 0) return;
        try {
            await Promise.all(deleteExamIds.map(id => ExamService.delete(id)));
            toast.success("Exam(s) deleted successfully");
            fetchExams();
        } catch (error) {
            toast.error("Failed to delete exam(s)");
        } finally {
            setDeleteExamIds(null);
        }
    };

    const confirmDeleteAll = async () => {
        try {
            await ExamService.deleteAll(seriesId);
            toast.success("All exams deleted successfully");
            fetchExams();
        } catch (error) {
            toast.error("Failed to delete all exams");
            throw error;
        }
    };

    const [isBulkAutoRegisterOpen, setIsBulkAutoRegisterOpen] = useState(false);
    const [clearSemesterTarget, setClearSemesterTarget] = useState<string | null>(null);
    const [isClearingSemester, setIsClearingSemester] = useState(false);
    // Bulk dept removal: tracks the open modal with semester key + fetched dept list
    const [bulkDeptRemove, setBulkDeptRemove] = useState<{
        semKey: string;
        depts: { departmentId: number; departmentCode: string; departmentName: string; studentCount: number }[];
        totalExams: number;
        loading: boolean;
    } | null>(null);
    const [selectedBulkDepts, setSelectedBulkDepts] = useState<string[]>([]);
    const [isBulkDeptRemoving, setIsBulkDeptRemoving] = useState(false);

    const handleBulkAutoMap = () => {
        if (!seriesId) return;
        setIsBulkAutoRegisterOpen(true);
    };

    const handleConfirmClearSemester = async (targetSem: string) => {
        if (!seriesId) return;
        setIsClearingSemester(true);
        try {
            const result = await InternalStudentService.clearSeriesStudentMappings(parseInt(seriesId), targetSem);
            toast.success(result.message || `Cleared student mappings for Semester ${targetSem}`);
            setClearSemesterTarget(null);
            await fetchExams();
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Failed to clear student mappings for Semester ${targetSem}`);
        } finally {
            setIsClearingSemester(false);
        }
    };

    // Open modal and fetch real dept+studentCount data from API
    const openBulkDeptRemove = async (semKey: string) => {
        if (!seriesId) return;
        setBulkDeptRemove({ semKey, depts: [], totalExams: 0, loading: true });
        setSelectedBulkDepts([]);
        try {
            const data = await InternalStudentService.getSeriesSemesterDepartments(parseInt(seriesId), semKey);
            setBulkDeptRemove({ semKey, depts: data.departments, totalExams: data.totalExams, loading: false });
        } catch (error: any) {
            toast.error('Failed to load department list');
            setBulkDeptRemove(null);
        }
    };

    const handleConfirmBulkDeptRemove = async () => {
        if (!bulkDeptRemove || selectedBulkDepts.length === 0 || !seriesId) return;
        setIsBulkDeptRemoving(true);
        try {
            const result = await InternalStudentService.removeDepartmentsFromSeries(
                parseInt(seriesId),
                selectedBulkDepts,
                bulkDeptRemove.semKey
            );
            toast.success(result.message || `Removed departments from Semester ${bulkDeptRemove.semKey}`);
            setBulkDeptRemove(null);
            setSelectedBulkDepts([]);
            await fetchExams();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to remove departments');
        } finally {
            setIsBulkDeptRemoving(false);
        }
    };

    const examsBySemester = useMemo(() => {
        const groupedList = groupExamsByPaper(exams);
        const map = new Map<string, GroupedExam[]>();

        groupedList.forEach(item => {
            let semKey = String(item.semester || 'S3').toUpperCase().trim();
            if (!semKey.startsWith('S') && /^\d+$/.test(semKey)) semKey = `S${semKey}`;
            if (!semKey.startsWith('S')) semKey = `S${semKey}`;

            if (!map.has(semKey)) map.set(semKey, []);
            map.get(semKey)!.push(item);
        });

        return Array.from(map.entries()).sort(([a], [b]) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 99;
            const numB = parseInt(b.replace(/\D/g, '')) || 99;
            return numA - numB;
        });
    }, [exams]);

    const [openSemesters, setOpenSemesters] = useState<Record<string, boolean>>({});

    // Auto-expand all detected semesters when exams load
    useEffect(() => {
        if (examsBySemester.length > 0) {
            const initial: Record<string, boolean> = {};
            examsBySemester.forEach(([sem]) => {
                initial[sem] = true;
            });
            setOpenSemesters(initial);
        }
    }, [examsBySemester]);

    const toggleSemesterOpen = (semKey: string) => {
        setOpenSemesters(prev => ({
            ...prev,
            [semKey]: !prev[semKey]
        }));
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden font-sans pb-20">
            {/* Dynamic Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-200/30 rounded-full blur-[120px] mix-blend-multiply" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-200/30 rounded-full blur-[120px] mix-blend-multiply" />
            </div>

            {/* Page Header */}
            <div className="bg-white/85 backdrop-blur-xl border-b border-slate-200/50 px-8 py-6 sticky top-0 z-30 shadow-sm relative">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Button
                            isIconOnly
                            variant="flat"
                            className="bg-slate-100 text-slate-500 hover:bg-slate-200/80 hover:text-slate-800 rounded-2xl transition-all shadow-sm w-11 h-11"
                            onPress={() => navigate('/admin/exams')}
                        >
                            <ArrowLeft size={18} strokeWidth={2.5} />
                        </Button>
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20 hidden sm:flex">
                            <BookOpen size={22} />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Examination Management</span>
                            </div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mt-0.5">
                                {seriesName || 'Exams'}
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="px-8 max-w-[1600px] mx-auto mt-10 relative z-10">
                
                {/* Action & Stats Bar */}
                <div className="flex flex-col lg:flex-row gap-8 justify-between items-start lg:items-center mb-10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full lg:w-auto flex-1">
                        <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow group flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Exams</p>
                                <h3 className="text-3xl font-black text-slate-950">{exams.length}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                                <FileText size={20} />
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow group flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Scheduled</p>
                                <h3 className="text-3xl font-black text-indigo-600">{exams.filter((e: any) => e.Status === 'Scheduled').length}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50/80 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                <Clock size={20} />
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/60 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow group flex items-center justify-between">
                            <div className="text-left">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Completed</p>
                                <h3 className="text-3xl font-black text-emerald-600">{exams.filter((e: any) => e.Status === 'Completed').length}</h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <CheckCircle size={20} />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full lg:w-auto">
                        <Button
                            onPress={() => setIsImportModalOpen(true)}
                            variant="flat"
                            className="bg-white text-slate-700 border border-slate-200 font-bold hover:bg-slate-50 transition-all px-5 rounded-2xl h-12 w-full sm:w-auto shadow-sm"
                            startContent={<Upload size={16} />}
                        >
                            Import Timetable
                        </Button>
                        {examType !== 'Internal' && (
                            <Button
                                onPress={() => navigate(`/admin/exams/series/${seriesId}/dates`)}
                                variant="flat"
                                className="bg-white text-slate-700 border border-slate-200 font-bold hover:bg-slate-50 transition-all px-5 rounded-2xl h-12 w-full sm:w-auto shadow-sm"
                                startContent={<CalendarDays size={16} />}
                            >
                                Date View
                            </Button>
                        )}
                        <Button
                            onPress={() => setIsDeleteAllOpen(true)}
                            variant="flat"
                            className="bg-rose-50 text-rose-600 border border-rose-100 font-bold hover:bg-rose-100/60 transition-all px-5 rounded-2xl h-12 w-full sm:w-auto shadow-sm"
                            startContent={<Trash2 size={16} />}
                        >
                            Delete All
                        </Button>
                        <Button
                            onPress={handleCreateExam}
                            className="bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 hover:scale-[1.03] active:scale-97 transition-all px-6 rounded-2xl h-12 w-full sm:w-auto"
                            startContent={<Plus size={18} strokeWidth={3} />}
                        >
                            Create Pattern
                        </Button>
                    </div>
                </div>

                {/* Exams Grid grouped by Semester Cards */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="h-64 bg-slate-200/40 rounded-[2.2rem] animate-pulse"></div>
                        ))}
                    </div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200/60 rounded-[3rem] shadow-sm max-w-3xl mx-auto">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="w-10 h-10 text-indigo-400" />
                        </div>
                        <p className="text-slate-900 font-black text-2xl mb-2">No Exams Configured</p>
                        <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">Create your first examination pattern or import from a timetable file to initiate seating planning.</p>
                        <div className="flex justify-center gap-4">
                            <Button
                                onPress={handleCreateExam}
                                className="bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/25 hover:bg-indigo-700 rounded-2xl h-12 px-6"
                                startContent={<Plus size={16} />}
                            >
                                Create First Exam
                            </Button>
                            <Button
                                onPress={() => setIsImportModalOpen(true)}
                                variant="flat"
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl h-12 px-6"
                                startContent={<Upload size={16} />}
                            >
                                Import Timetable
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {/* ── TOP SEMESTER HUB CARDS ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(390px,1fr))] gap-6">
                            {examsBySemester.map(([semKey, semExams]) => {
                                const isOpen = openSemesters[semKey] ?? true;
                                const branchSet = new Set<string>();
                                semExams.forEach(e => e.branches.forEach(b => {
                                    if (b.branchScope) branchSet.add(b.branchScope);
                                }));
                                const branchesStr = Array.from(branchSet).slice(0, 5).join(', ');

                                return (
                                    <div
                                        key={semKey}
                                        onClick={() => toggleSemesterOpen(semKey)}
                                        className={`relative cursor-pointer rounded-3xl p-5 transition-all duration-300 border text-left overflow-hidden ${
                                            isOpen 
                                                ? 'bg-gradient-to-br from-indigo-500/10 via-white to-white border-indigo-500 shadow-xl ring-2 ring-indigo-500/20' 
                                                : 'bg-white/90 hover:bg-white border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3.5">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-xs transition-all ${
                                                    isOpen ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                                }`}>
                                                    <GraduationCap size={22} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                                                        Semester {semKey}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                                        {semExams.length} Subjects Configured
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${
                                                isOpen ? 'bg-indigo-100 text-indigo-700 rotate-180' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>

                                        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-1.5 text-xs font-bold text-slate-600">
                                            <span className="truncate max-w-[140px] shrink min-w-0 bg-slate-100 text-slate-700 px-2 py-1 rounded-lg border border-slate-200/60 text-[10px] font-bold" title={branchesStr || 'All'}>
                                                Branches: {branchesStr || 'All'}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                                <Button
                                                    size="sm"
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        setActiveImportSemester(semKey);
                                                    }}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] h-7.5 px-2.5 rounded-xl shadow-xs transition-all flex items-center gap-1"
                                                >
                                                    <UserPlus size={12} />
                                                    Import
                                                </Button>
                                                {semExams.some(e => e.hasRegistrations) && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                openBulkDeptRemove(semKey);
                                                            }}
                                                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/70 font-extrabold text-[11px] h-7.5 px-2 rounded-xl transition-all flex items-center gap-1"
                                                            title={`Remove specific departments from Semester ${semKey}`}
                                                        >
                                                            <Building2 size={12} />
                                                            Dept
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                setClearSemesterTarget(semKey);
                                                            }}
                                                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 font-extrabold text-[11px] h-7.5 px-2 rounded-xl transition-all flex items-center gap-1"
                                                            title={`Clear all student mappings for Semester ${semKey}`}
                                                        >
                                                            <Trash2 size={12} />
                                                            Clear
                                                        </Button>
                                                    </>
                                                )}
                                                <span className={`px-2.5 py-1 rounded-xl font-extrabold text-[11px] transition-colors ${
                                                    isOpen ? 'bg-indigo-600 text-white shadow-xs' : 'bg-indigo-50 text-indigo-700'
                                                }`}>
                                                    {isOpen ? 'Close' : 'Open →'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── EXPANDED SEMESTER SUBJECTS CONTAINERS ── */}
                        <AnimatePresence>
                            {examsBySemester.map(([semesterKey, semesterExams]) => {
                                const isOpen = openSemesters[semesterKey] ?? true;
                                if (!isOpen) return null;
                                const hasSemesterMappings = semesterExams.some(e => e.hasRegistrations);

                                return (
                                    <motion.div 
                                        key={semesterKey}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -15 }}
                                        transition={{ duration: 0.25 }}
                                        className="bg-white/80 border border-slate-200/80 rounded-[2.5rem] p-6 sm:p-8 shadow-sm space-y-6"
                                    >
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black shadow-xs">
                                                    <BookOpen size={22} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                                                        Semester {semesterKey} Subjects
                                                        <span className="px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-xs">
                                                            {semesterExams.length} Subjects
                                                        </span>
                                                    </h2>
                                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                                        Active subject schedule and course patterns for Semester {semesterKey}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    onPress={() => setActiveImportSemester(semesterKey)}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs h-9 px-4 rounded-xl shadow-sm transition-all flex items-center gap-2"
                                                >
                                                    <UserPlus size={15} />
                                                    Import {semesterKey} Student List
                                                </Button>
                                                {hasSemesterMappings && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={() => openBulkDeptRemove(semesterKey)}
                                                            className="bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/70 font-extrabold text-xs h-9 px-3.5 rounded-xl transition-all flex items-center gap-1.5"
                                                        >
                                                            <Building2 size={15} />
                                                            Remove Dept
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={() => setClearSemesterTarget(semesterKey)}
                                                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/70 font-extrabold text-xs h-9 px-3.5 rounded-xl transition-all flex items-center gap-1.5"
                                                        >
                                                            <Trash2 size={15} />
                                                            Clear {semesterKey} Mappings
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* ── PURE TIMETABLE PROGRAMME & SUBJECT HIERARCHY ── */}
                                        {(() => {
                                            const getProgrammeForExamGroup = (examGroup: GroupedExam): string => {
                                                if (examGroup.programme) {
                                                    const progUpper = examGroup.programme.toUpperCase();
                                                    if (progUpper.includes('INT') || progUpper.includes('INMCA')) return 'Int. MCA';
                                                    if (progUpper === 'MCA' || progUpper === 'M.C.A') return 'MCA';
                                                    if (progUpper.includes('MTECH') || progUpper.includes('M.TECH')) return 'M.Tech';
                                                    if (progUpper === 'MBA') return 'MBA';
                                                    if (progUpper === 'BHM') return 'BHM';
                                                    if (progUpper.includes('BTECH') || progUpper.includes('B.TECH')) return 'B.Tech';
                                                    return examGroup.programme;
                                                }
                                                const code = String(examGroup.subjectCode || '').toUpperCase();
                                                const name = String(examGroup.examName || '').toUpperCase();
                                                const deptCodes = examGroup.branches.map(b => String(b.departmentCode || '').toUpperCase());

                                                // 1. Check for Integrated MCA
                                                if (
                                                    code.includes('INMCA') || code.includes('IMCA') || code.includes('INT_MCA') ||
                                                    name.includes('INTEGRATED MCA') || name.includes('INT MCA') || name.includes('INT. MCA') ||
                                                    deptCodes.some(d => d === 'INMCA' || d === 'IMCA' || d === 'INT_MCA' || d === 'INT')
                                                ) {
                                                    return 'Int. MCA';
                                                }

                                                // 2. Check for MCA
                                                if (
                                                    code.includes('MCA') ||
                                                    name.includes('MASTER OF COMPUTER APPLICATIONS') || name.includes('MCA') ||
                                                    deptCodes.some(d => d === 'MCA')
                                                ) {
                                                    return 'MCA';
                                                }

                                                // 3. Check for M.Tech
                                                if (
                                                    code.includes('MTECH') || code.includes('M.TECH') ||
                                                    name.includes('M.TECH') || name.includes('MTECH') ||
                                                    deptCodes.some(d => d === 'MTECH')
                                                ) {
                                                    return 'M.Tech';
                                                }

                                                // 4. Default to B.Tech
                                                return 'B.Tech';
                                            };

                                            // Available programmes derived strictly from the active timetable exams in this semester
                                            const availableProgrammes = Array.from(
                                                new Set(semesterExams.map(e => getProgrammeForExamGroup(e)))
                                            ).sort();

                                            const currentProgFilter = selectedProgrammes[semesterKey] || 'ALL';

                                            // Group exams by Programme for sectioned rendering
                                            const examsByProg = new Map<string, GroupedExam[]>();
                                            semesterExams.forEach(e => {
                                                const prog = getProgrammeForExamGroup(e);
                                                if (currentProgFilter !== 'ALL' && prog !== currentProgFilter) return;
                                                if (!examsByProg.has(prog)) examsByProg.set(prog, []);
                                                examsByProg.get(prog)!.push(e);
                                            });

                                            return (
                                                <div className="space-y-8">
                                                    {/* Programme Scope Filter Tabs */}
                                                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar border-b border-slate-100 pb-3">
                                                        <span className="text-xs font-black uppercase text-slate-400 tracking-wider mr-2 shrink-0">Programme Scope:</span>
                                                        <button
                                                            onClick={() => setSelectedProgrammes(p => ({ ...p, [semesterKey]: 'ALL' }))}
                                                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                                                                currentProgFilter === 'ALL'
                                                                    ? 'bg-indigo-600 text-white shadow-xs'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            All Programmes ({semesterExams.length} Subjects)
                                                        </button>
                                                        {availableProgrammes.map(prog => {
                                                            const progCount = semesterExams.filter(e => getProgrammeForExamGroup(e) === prog).length;
                                                            return (
                                                                <button
                                                                    key={prog}
                                                                    onClick={() => setSelectedProgrammes(p => ({ ...p, [semesterKey]: prog }))}
                                                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 ${
                                                                        currentProgFilter === prog
                                                                            ? 'bg-indigo-600 text-white shadow-xs'
                                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    {prog} ({progCount})
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Programme Groups & Clean White Subject Cards */}
                                                    {Array.from(examsByProg.entries()).map(([progName, progExams]) => (
                                                        <div key={progName} className="space-y-4">
                                                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/70 rounded-2xl px-5 py-3">
                                                                <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                                                                    {progName}
                                                                    <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-extrabold">
                                                                        {progExams.length} Subjects
                                                                    </span>
                                                                </h3>
                                                                <span className="text-xs font-bold text-slate-400">
                                                                    Semester {semesterKey} • {progName} Schedule
                                                                </span>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                                {progExams.map((examGroup) => {
                                                                    const hasMissingDept = examGroup.branches.some(b => isMissingDepartment(b.departmentCode, b.departmentName));
                                                                    const cardBorderClass = hasMissingDept 
                                                                        ? 'border-amber-300/80 shadow-amber-100/50 ring-1 ring-amber-200/50' 
                                                                        : 'border-slate-200/80 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5';
                                                                    
                                                                    const formattedTitle = formatExamCardTitle(examGroup.examName, examGroup.subjectCode);

                                                                    return (
                                                                        <Card
                                                                            key={examGroup.groupKey}
                                                                            className={`bg-white border text-left hover:-translate-y-1 transition-all duration-200 group rounded-2xl overflow-hidden shadow-sm ${cardBorderClass}`}
                                                                        >
                                                                            <CardBody className="p-5 flex flex-col justify-between h-full space-y-4">
                                                                                <div>
                                                                                    <div className="flex items-center justify-between gap-2 mb-3">
                                                                                        <span className="font-extrabold text-[11px] tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase truncate max-w-[140px]" title={examGroup.subjectCode || examGroup.examName}>
                                                                                            {examGroup.subjectCode || "NO CODE"}
                                                                                        </span>
                                                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                                                            !examGroup.hasRegistrations ? 'bg-rose-50 text-rose-700 border-rose-200/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                                                                        }`}>
                                                                                            {!examGroup.hasRegistrations ? 'NOT MAPPED' : 'FULLY MAPPED'}
                                                                                        </span>
                                                                                    </div>

                                                                                    <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[2.75rem]">
                                                                                        {formattedTitle}
                                                                                    </h3>

                                                                                    {/* Branch scope tag – sourced from timetable BranchScope, never from DepartmentID */}
                                                                                    {(() => {
                                                                                        const rawScopes = examGroup.branches
                                                                                            .map(b => b.branchScope)
                                                                                            .filter(Boolean);
                                                                                        // Deduplicate while preserving order
                                                                                        const uniqueScopes = Array.from(new Set(rawScopes));
                                                                                        const isMissing = uniqueScopes.length === 0;
                                                                                        const scopeDisplay = isMissing ? 'Scope not specified' : uniqueScopes.join(', ');
                                                                                        // Single-value with a comma means multi-branch within one scope string (e.g. "AD, CA, CC, CS")
                                                                                        const isMultiBranch = !isMissing && (uniqueScopes.length > 1 || scopeDisplay.includes(','));
                                                                                        const label = isMultiBranch ? 'BRANCHES' : 'BRANCH';
                                                                                        return (
                                                                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${
                                                                                                    isMissing
                                                                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                                                                }`}>
                                                                                                    {label}: {scopeDisplay}
                                                                                                </span>
                                                                                            </div>
                                                                                        );
                                                                                    })()}
                                                                                </div>

                                                                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                                                                    <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                                                                                        <div className="flex items-center gap-1.5 text-slate-700">
                                                                                            <CalendarDays size={14} className="text-slate-400 shrink-0" />
                                                                                            <span>{new Date(examGroup.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                                                        </div>
                                                                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shrink-0">
                                                                                            {examGroup.session === 'FN' ? 'Morning (FN)' : 'Afternoon (AN)'}
                                                                                        </span>
                                                                                    </div>

                                                                                    <div className="flex items-center gap-2 pt-1">
                                                                                        {examType === 'Internal' && (
                                                                                            <Button
                                                                                                size="sm"
                                                                                                variant="flat"
                                                                                                className="flex-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold rounded-xl text-xs h-9 transition-all border border-indigo-100 flex items-center justify-center gap-1"
                                                                                                startContent={<Users size={13} />}
                                                                                                onPress={() => navigate(`/admin/exams/series/${seriesId}/internal/${examGroup.branches[0]?.examId}`)}
                                                                                            >
                                                                                                Students
                                                                                            </Button>
                                                                                        )}
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="flat"
                                                                                            className="flex-1 bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white font-bold rounded-xl text-xs h-9 transition-all border border-slate-200 flex items-center justify-center gap-1"
                                                                                            startContent={<Pencil size={13} />}
                                                                                            onPress={() => handleEdit(exams.find(e => e.ExamID === examGroup.branches[0].examId))}
                                                                                        >
                                                                                            Edit
                                                                                        </Button>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="flat"
                                                                                            className="flex-1 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white font-bold rounded-xl text-xs h-9 transition-all border border-rose-200/70 flex items-center justify-center gap-1"
                                                                                            startContent={<Trash2 size={13} />}
                                                                                            onPress={() => handleDeleteClick(examGroup.branches.map(b => b.examId))}
                                                                                        >
                                                                                            Delete
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            </CardBody>
                                                                        </Card>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Create Exam Modal */}
            <CreateExamModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setIsCreateModalOpen(false);
                    fetchExams();
                }}
                seriesId={seriesId}
            />

            {examType === 'Internal' ? (
                <InternalExamImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => {
                        setIsImportModalOpen(false);
                        fetchExams();
                    }}
                    seriesId={seriesId!}
                />
            ) : (
                <ExamImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={fetchExams}
                    preSelectedSeriesId={seriesId}
                />
            )}

            {selectedExam && (
                <EditExamModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={() => {
                        setIsEditModalOpen(false);
                        fetchExams();
                    }}
                    exam={selectedExam}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteExamIds}
                onClose={() => setDeleteExamIds(null)}
                onConfirm={confirmDelete}
                title="Delete Exam Group"
                message="Are you sure you want to delete this exam and all its associated department branches? This action cannot be undone."
                confirmText="Delete All Branches"
                cancelText="Cancel"
                type="danger"
            />

            <ConfirmationModal
                isOpen={isDeleteAllOpen}
                onClose={() => setIsDeleteAllOpen(false)}
                onConfirm={confirmDeleteAll}
                title="Delete All Exams"
                message="Are you sure you want to delete all exams in this series? This action cannot be undone."
                confirmText="Delete All"
                cancelText="Cancel"
                type="danger"
            />

            {/* Semester Student Import Modal */}
            {activeImportSemester && (
                <SemesterStudentImportModal
                    isOpen={!!activeImportSemester}
                    onClose={() => setActiveImportSemester(null)}
                    onSuccess={() => {
                        setActiveImportSemester(null);
                        fetchExams();
                    }}
                    seriesId={seriesId}
                    semesterKey={activeImportSemester}
                />
            )}

            <BulkAutoRegisterModal
                isOpen={isBulkAutoRegisterOpen}
                onClose={() => setIsBulkAutoRegisterOpen(false)}
                seriesId={seriesId || ''}
                seriesName={seriesName}
                totalExamsCount={exams.length}
                onSuccess={() => {
                    setIsBulkAutoRegisterOpen(false);
                    fetchExams();
                }}
            />

            {/* Clear Semester Mapping Confirmation Modal */}
            {clearSemesterTarget && (
                <Modal 
                    isOpen={Boolean(clearSemesterTarget)} 
                    onClose={() => setClearSemesterTarget(null)} 
                    size="md"
                    classNames={{
                        base: 'rounded-3xl bg-white p-2 border border-slate-200/80 shadow-2xl',
                        header: 'border-b border-slate-100 pb-3',
                        footer: 'border-t border-slate-100 pt-3'
                    }}
                >
                    <ModalContent>
                        <ModalHeader className="flex items-center gap-2 font-black text-slate-900 text-lg">
                            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                                <Trash2 size={18} />
                            </div>
                            Clear Semester {clearSemesterTarget} Student Mappings
                        </ModalHeader>
                        <ModalBody className="py-4 space-y-2">
                            <p className="text-slate-700 text-sm font-medium">
                                Are you sure you want to clear all student registrations for all subjects in <strong className="text-slate-900 font-extrabold">Semester {clearSemesterTarget}</strong>?
                            </p>
                            <div className="p-3 bg-rose-50/70 rounded-2xl border border-rose-100 text-xs text-rose-700 font-semibold flex items-start gap-2">
                                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                <span>This will unregister all mapped students from these exams. You can re-register them anytime via "Import Students" or "Auto Register".</span>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button 
                                variant="flat" 
                                onPress={() => setClearSemesterTarget(null)} 
                                className="font-bold rounded-xl h-10 px-4 text-xs"
                            >
                                Cancel
                            </Button>
                            <Button 
                                isLoading={isClearingSemester}
                                onPress={() => handleConfirmClearSemester(clearSemesterTarget)} 
                                className="font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-10 px-4 text-xs shadow-sm transition-all"
                            >
                                Confirm & Clear Mappings
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            )}

            {/* ═══ Bulk Department Removal Modal ═══ */}
            {bulkDeptRemove && (
                <Modal
                    isOpen={Boolean(bulkDeptRemove)}
                    onClose={() => { setBulkDeptRemove(null); setSelectedBulkDepts([]); }}
                    size="lg"
                    classNames={{
                        base: 'rounded-3xl bg-white border border-slate-200/80 shadow-2xl',
                        header: 'border-b border-slate-100 pb-3 px-6 pt-5',
                        body: 'px-6 py-5',
                        footer: 'border-t border-slate-100 pt-3 px-6 pb-5'
                    }}
                >
                    <ModalContent>
                        <ModalHeader>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <p className="text-lg font-black text-slate-900 leading-tight">
                                        Remove Departments
                                    </p>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                                        Semester {bulkDeptRemove.semKey} · {bulkDeptRemove.totalExams} subject{bulkDeptRemove.totalExams !== 1 ? 's' : ''} affected
                                    </p>
                                </div>
                            </div>
                        </ModalHeader>
                        <ModalBody>
                            <p className="text-slate-500 text-sm mb-4">
                                Select one or more departments to remove from <strong className="text-slate-800">all {bulkDeptRemove.totalExams} subjects in Semester {bulkDeptRemove.semKey}</strong>. All their mapped students will be unregistered.
                            </p>

                            {bulkDeptRemove.loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                        <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                        <span className="text-sm font-semibold">Loading departments...</span>
                                    </div>
                                </div>
                            ) : bulkDeptRemove.depts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                    <Building2 size={32} className="mb-3 opacity-30" />
                                    <p className="text-sm font-semibold">No departments found with mapped students</p>
                                </div>
                            ) : (
                                <>
                                    {/* Select All / Clear controls */}
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">
                                            {bulkDeptRemove.depts.length} Departments
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedBulkDepts(bulkDeptRemove.depts.map(d => d.departmentCode))}
                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                            >
                                                Select All
                                            </button>
                                            <span className="text-slate-200 text-sm">|</span>
                                            <button
                                                onClick={() => setSelectedBulkDepts([])}
                                                className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    {/* Department card grid — 2 columns */}
                                    <div className="grid grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                                        {bulkDeptRemove.depts.map(dept => {
                                            const isSelected = selectedBulkDepts.includes(dept.departmentCode);
                                            return (
                                                <label
                                                    key={dept.departmentCode}
                                                    className={`relative flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all select-none ${
                                                        isSelected
                                                            ? 'bg-rose-50 border-rose-400 shadow-sm'
                                                            : 'bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only"
                                                        checked={isSelected}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setSelectedBulkDepts(prev => [...prev, dept.departmentCode]);
                                                            } else {
                                                                setSelectedBulkDepts(prev => prev.filter(c => c !== dept.departmentCode));
                                                            }
                                                        }}
                                                    />
                                                    {/* Custom checkbox */}
                                                    <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                                        isSelected ? 'bg-rose-500 border-rose-500' : 'bg-white border-slate-300'
                                                    }`}>
                                                        {isSelected && (
                                                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                                                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <span className={`font-extrabold text-sm tracking-wide uppercase ${isSelected ? 'text-rose-700' : 'text-indigo-700'}`}>
                                                                {dept.departmentCode}
                                                            </span>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                                                isSelected ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {dept.studentCount} Students
                                                            </span>
                                                        </div>
                                                        <p className={`text-xs font-medium truncate mt-0.5 ${
                                                            isSelected ? 'text-rose-600/80' : 'text-slate-500'
                                                        }`}>
                                                            {dept.departmentName}
                                                        </p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {/* Warning banner */}
                                    {selectedBulkDepts.length > 0 && (
                                        <div className="mt-4 p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-700 font-semibold flex items-start gap-2">
                                            <AlertCircle size={15} className="shrink-0 mt-0.5" />
                                            <span>
                                                <strong>{selectedBulkDepts.join(', ')}</strong> will be removed from all {bulkDeptRemove.totalExams} subjects in Semester {bulkDeptRemove.semKey}. This cannot be undone.
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                variant="flat"
                                onPress={() => { setBulkDeptRemove(null); setSelectedBulkDepts([]); }}
                                className="font-bold rounded-xl h-10 px-5 text-xs text-slate-600"
                            >
                                Cancel
                            </Button>
                            <Button
                                isLoading={isBulkDeptRemoving}
                                isDisabled={selectedBulkDepts.length === 0 || bulkDeptRemove.loading}
                                onPress={handleConfirmBulkDeptRemove}
                                className={`font-extrabold rounded-xl h-10 px-5 text-xs shadow-sm transition-all ${
                                    selectedBulkDepts.length === 0 || bulkDeptRemove.loading
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                                }`}
                            >
                                Remove {selectedBulkDepts.length > 0 ? `${selectedBulkDepts.length} Dept${selectedBulkDepts.length > 1 ? 's' : ''}` : 'Departments'}
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            )}
        </div>
    );
};

export default ExamSeriesList;
