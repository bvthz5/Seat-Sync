import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Card, CardBody, Button } from "@heroui/react";
import { BookOpen, Plus, Clock, FileText, AlertCircle, ArrowLeft, CheckCircle, CalendarDays, Upload, Pencil, Trash2, Users, UserCheck } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';
import { SeriesService } from '../services/seriesService';
import { InternalStudentService } from '../services/internalStudentService';
import { AccessTokenStore } from '../../../services/api';
import CreateExamModal from '../components/exams/CreateExamModal';
import ExamImportModal from '../components/exams/ExamImportModal';
import { InternalExamImportModal } from '../components/internal-structure/InternalExamImportModal';
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
};

type GroupedExam = {
    groupKey: string;
    examName: string;
    date: string;
    session: string;
    status: string;
    duration: number;
    subjectCode: string;
    branches: BranchOption[];
    hasRegistrations: boolean;
};

const groupExamsByPaper = (exams: any[]): GroupedExam[] => {
    const groups = new Map<string, GroupedExam & { branchKeys: Set<string> }>();

    exams.forEach((exam: any) => {
        const date = String(exam?.ExamDate || '').split('T')[0];
        const examName = String(exam?.ExamName || '').trim();
        const session = String(exam?.Session || '').trim().toUpperCase();
        const duration = Number(exam?.Duration || 0);
        // Stable grouping by date, session, and subject code (fallback to name)
        const paperId = String(exam?.Subject?.SubjectCode || examName).trim();
        const groupKey = `${date}::${session}::${paperId}::${duration}`;
        const department = exam?.Subject?.Department || {};
        const branchKey = String(department.DepartmentID || department.DepartmentCode || exam.ExamID);

        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                groupKey,
                examName,
                date,
                session,
                status: String(exam?.Status || 'Scheduled'),
                duration,
                subjectCode: String(exam?.Subject?.SubjectCode || ''),
                branches: [],
                branchKeys: new Set<string>(),
                hasRegistrations: false
            });
        }

        const group = groups.get(groupKey)!;
        if (!group.branchKeys.has(branchKey)) {
            group.branchKeys.add(branchKey);
            group.branches.push({
                examId: Number(exam.ExamID),
                departmentId: Number(department.DepartmentID || 0),
                departmentCode: String(department.DepartmentCode || 'GEN'),
                departmentName: String(department.DepartmentName || 'General')
            });
        }

        if (Number(exam.registrationCount || 0) > 0) {
            group.hasRegistrations = true;
        }
    });

    return Array.from(groups.values())
        .map(({ branchKeys, ...group }) => group)
        .sort((a, b) => {
            const dateCmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateCmp !== 0) return dateCmp;
            
            // If same date, sort by session (FN before AN)
            if (a.session !== b.session) {
                return a.session === 'FN' ? -1 : 1;
            }
            
            // If same date and session, sort alphabetically
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

    const fetchExams = async () => {
        if (!AccessTokenStore.hasAnySession()) return;
        setLoading(true);
        try {
            const response = await ExamService.getAll({ seriesId });
            setExams(response || []);
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

    const handleBulkAutoMap = () => {
        if (!seriesId) return;
        setIsBulkAutoRegisterOpen(true);
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
                        <Button
                            onPress={handleBulkAutoMap}
                            isLoading={isBulkMapping}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-98 transition-all px-5 rounded-2xl h-12 w-full sm:w-auto"
                            startContent={<UserCheck size={17} />}
                        >
                            Bulk Auto Register
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

                {/* Exams Grid or Empty State */}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {groupExamsByPaper(exams).map((examGroup) => {
                            const hasMissingDept = examGroup.branches.some(b => isMissingDepartment(b.departmentCode, b.departmentName));
                            const cardBorderClass = hasMissingDept 
                                ? 'border-amber-300/80 shadow-amber-100/50 ring-1 ring-amber-200/50' 
                                : 'border-slate-200/80 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5';
                            
                            // Standardize title format for aesthetic neatness
                            const formattedTitle = examGroup.examName
                                .toLowerCase()
                                .split(' ')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');

                            return (
                                <Card
                                    key={examGroup.groupKey}
                                    className={`bg-white border text-left hover:-translate-y-1 transition-all duration-200 group rounded-2xl overflow-hidden shadow-sm ${cardBorderClass}`}
                                >
                                    <CardBody className="p-5 flex flex-col justify-between h-full space-y-4">
                                        {/* Top Meta Bar: Subject Code + Status Chip */}
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span className="font-extrabold text-[11px] tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase truncate max-w-[140px]" title={examGroup.subjectCode || examGroup.examName}>
                                                    {examGroup.subjectCode || "NO CODE"}
                                                </span>
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                    examGroup.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200/60' :
                                                    examGroup.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                                                    'bg-purple-50 text-purple-700 border-purple-200/60'
                                                }`}>
                                                    {examGroup.status}
                                                </span>
                                            </div>

                                            {/* Subject Title */}
                                            <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[2.75rem]">
                                                {formattedTitle}
                                            </h3>

                                            {/* Department Badges */}
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {examGroup.branches.map((branch) => (
                                                    <span 
                                                        key={branch.examId} 
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase border ${
                                                            isMissingDepartment(branch.departmentCode, branch.departmentName)
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-slate-100 text-slate-600 border-slate-200/60'
                                                        }`}
                                                    >
                                                        Dept: {branch.departmentCode}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-3 pt-2 border-t border-slate-100">
                                            {/* Date & Session Box */}
                                            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <CalendarDays size={14} className="text-slate-400 shrink-0" />
                                                    <span>{new Date(examGroup.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                </div>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 shrink-0">
                                                    {examGroup.session === 'FN' ? 'Morning (FN)' : 'Afternoon (AN)'}
                                                </span>
                                            </div>

                                            {/* Action Buttons Row */}
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
        </div>
    );
};

export default ExamSeriesList;
