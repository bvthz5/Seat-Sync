import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Button } from "@heroui/react";
import { BookOpen, Plus, Clock, FileText, AlertCircle, ArrowLeft, CheckCircle, CalendarDays, Upload, Pencil, Trash2 } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';
import { SeriesService } from '../services/seriesService';
import CreateExamModal from '../components/exams/CreateExamModal';
import ExamImportModal from '../components/exams/ExamImportModal';
import EditExamModal from '../components/exams/EditExamModal';
import ConfirmationModal from '../components/ConfirmationModal';

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
    const { seriesId } = useParams<{ seriesId: string }>();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteExamIds, setDeleteExamIds] = useState<number[] | null>(null);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [seriesName, setSeriesName] = useState<string>('');
    const [examType, setExamType] = useState<'Internal' | 'EndSemester'>('Internal');

    useEffect(() => {
        if (seriesId) {
            fetchSeriesDetails();
            fetchExams();
        }
    }, [seriesId]);

    const fetchSeriesDetails = async () => {
        try {
            const response = await SeriesService.getAll();
            const series = Array.isArray(response) ? response : response.data || [];
            const found = series.find((s: any) => String(s.ExamSeriesID) === seriesId);
            if (found) {
                setSeriesName(found.SeriesName);
                setExamType(found.ExamType);
            }
        } catch (error) {
            console.error("Failed to fetch series details", error);
        }
    };

    const fetchExams = async () => {
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

    return (
        <div className="min-h-screen bg-[#f4f6f9] pb-12">
            {/* Page Header (consistent with light theme Dashboards) */}
            <div className="bg-white border-b border-slate-200/80 px-8 py-8 mb-8 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Button
                            isIconOnly
                            variant="light"
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            onPress={() => navigate('/admin/exams')}
                        >
                            <ArrowLeft size={24} />
                        </Button>
                        <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 hidden sm:flex">
                            <BookOpen className="text-indigo-600" size={30} />
                        </div>
                        <div>
                            <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-1">
                                Examination Management
                            </p>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                {seriesName || 'Exams'}
                            </h1>
                            <p className="text-slate-500 font-medium mt-1 max-w-xl">
                                Create and manage exams for {seriesName}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="px-8 max-w-[1600px] mx-auto">
                
                {/* Action & Stats Bar */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full lg:w-auto flex-1">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Exams</p>
                                    <h3 className="text-4xl font-extrabold text-slate-900">{exams.length}</h3>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hidden xl:flex">
                                    <FileText size={28} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Scheduled</p>
                                    <h3 className="text-4xl font-extrabold text-blue-600">{exams.filter((e: any) => e.Status === 'Scheduled').length}</h3>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 hidden xl:flex">
                                    <Clock size={28} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow col-span-2 md:col-span-1">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Completed</p>
                                    <h3 className="text-4xl font-extrabold text-emerald-600">{exams.filter((e: any) => e.Status === 'Completed').length}</h3>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 hidden xl:flex">
                                    <CheckCircle size={28} />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <Button
                            onPress={() => setIsImportModalOpen(true)}
                            variant="flat"
                            className="bg-white text-slate-700 border border-slate-300 font-semibold hover:bg-slate-50 transition-all px-6 rounded-xl h-14 w-full lg:w-auto"
                            startContent={<Upload size={18} />}
                        >
                            Import Timetable
                        </Button>
                        {examType !== 'Internal' && (
                            <Button
                                onPress={() => navigate(`/admin/exams/series/${seriesId}/dates`)}
                                variant="flat"
                                className="bg-white text-slate-700 border border-slate-300 font-semibold hover:bg-slate-50 transition-all px-6 rounded-xl h-14 w-full lg:w-auto"
                                startContent={<CalendarDays size={18} />}
                            >
                                Date View
                            </Button>
                        )}
                        <Button
                            onPress={() => setIsDeleteAllOpen(true)}
                            variant="flat"
                            className="bg-red-50 text-red-600 border border-red-200 font-semibold hover:bg-red-100 transition-all px-6 rounded-xl h-14 w-full lg:w-auto"
                            startContent={<Trash2 size={18} />}
                        >
                            Delete All Exams
                        </Button>
                        <Button
                            onPress={handleCreateExam}
                            className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 transition-all px-8 rounded-xl h-14 w-full lg:w-auto"
                            startContent={<Plus size={20} strokeWidth={3} />}
                        >
                            Create Pattern
                        </Button>
                    </div>
                </div>

                {/* Exams Grid or Empty State */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 bg-slate-100/50 border border-slate-200 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-slate-800 font-bold text-xl mb-2">No exams yet</p>
                        <p className="text-slate-500 text-sm mb-8">Create your first exam configuration to get started</p>
                        <Button
                            onPress={handleCreateExam}
                            className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700"
                            startContent={<Plus size={18} />}
                        >
                            Create First Exam
                        </Button>
                        <Button
                            onPress={() => setIsImportModalOpen(true)}
                            variant="light"
                            className="mt-3 text-slate-700"
                            startContent={<Upload size={16} />}
                        >
                            Import Timetable
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {groupExamsByPaper(exams).map((examGroup) => (
                            <Card
                                key={examGroup.groupKey}
                                className={`bg-white border hover:shadow-lg transition-all duration-300 group rounded-2xl overflow-hidden ${
                                    examGroup.branches.some(b => isMissingDepartment(b.departmentCode, b.departmentName))
                                        ? 'border-amber-300 hover:border-amber-400 ring-1 ring-amber-200'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className={`h-1.5 w-full ${examGroup.branches.some(b => isMissingDepartment(b.departmentCode, b.departmentName)) ? 'bg-amber-500' : 'bg-indigo-500'}`}></div>
                                <CardBody className="p-6 space-y-5">
                                    <div className="min-h-[4rem]">
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {examGroup.examName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-slate-500 font-medium text-sm flex-1 truncate" title={examGroup.subjectCode || examGroup.examName}>
                                                {examGroup.subjectCode} 
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {examGroup.branches.map((branch) => (
                                                <span key={branch.examId} className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold border ${
                                                    isMissingDepartment(branch.departmentCode, branch.departmentName)
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                                }`}>
                                                    Dept: {branch.departmentCode}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                                            examGroup.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            examGroup.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            'bg-purple-50 text-purple-700 border-purple-200'
                                        }`}>
                                            {examGroup.status}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                            {examGroup.session === 'FN' ? 'Morning' : 'Afternoon'}
                                        </span>
                                    </div>
                                    
                                    {/* Divider */}
                                    <div className="h-px bg-slate-100"></div>

                                    <div className="flex items-center justify-between text-slate-500 text-sm font-medium pt-1 group-hover:text-indigo-600 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays size={16} />
                                            <span>{new Date(examGroup.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            className="bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium"
                                            startContent={<Pencil size={14} />}
                                            onPress={() => handleEdit(exams.find(e => e.ExamID === examGroup.branches[0].examId))}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="flat"
                                            className="bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                                            startContent={<Trash2 size={14} />}
                                            onPress={() => handleDeleteClick(examGroup.branches.map(b => b.examId))}
                                        >
                                            Delete Group
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
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

            <ExamImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchExams}
                preSelectedSeriesId={seriesId}
            />

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
        </div>
    );
};

export default ExamSeriesList;
