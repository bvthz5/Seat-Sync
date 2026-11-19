import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody } from '@heroui/react';
import { ArrowLeft, Upload, Sun, Moon, Info, CalendarClock, CalendarCheck, Trash2, X, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';
import EligibleStudentsImportModal from '../components/exams/EligibleStudentsImportModal';
import BulkEligibleImportModal from '../components/exams/BulkEligibleImportModal';
import ExamDetailPanel from '../components/exams/ExamDetailPanel';
import ConfirmationModal from '../components/ConfirmationModal';

type BranchOption = {
    examId: number;
    departmentId: number;
    departmentCode: string;
    departmentName: string;
    registrationCount: number;
};

type GroupedExam = {
    groupKey: string;
    examName: string;
    date: string;
    session: string;
    status: string;
    duration: number;
    subjectCode: string;
    examType: string;
    programName: string;
    semesterName: string;
    branches: BranchOption[];
    hasRegistrations: boolean;
    totalRegistrations: number;
};

const parseLocalDate = (raw?: string): Date | null => {
    if (!raw) return null;
    const datePart = String(raw).split('T')[0];
    const [y, m, d] = datePart.split('-').map(Number);
    if (y && m && d) {
        return new Date(y, m - 1, d);
    }
    const fallback = new Date(raw);
    return isNaN(fallback.getTime()) ? null : fallback;
};

const extractSemesterLabel = (exam: any): string => {
    if (typeof exam?.Semester === 'string' && exam.Semester.trim()) {
        return exam.Semester.trim().toUpperCase();
    }
    const subjSem = exam?.Subject?.Semester;
    if (typeof subjSem === 'string' && subjSem.trim()) {
        return subjSem.trim().toUpperCase();
    }
    if (subjSem && typeof subjSem === 'object') {
        if (subjSem.SemesterName) return String(subjSem.SemesterName).trim().toUpperCase();
        if (subjSem.SemesterNumber) return `S${subjSem.SemesterNumber}`;
    }
    return '';
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
        const semRaw = extractSemesterLabel(exam);
        const rawCode = String(exam?.Subject?.SubjectCode || exam?.SubjectCode || '').trim().toUpperCase();
        const regCount = Number(exam?.registrationCount || 0);

        const titleNorm = normalizeExamTitle(examName);
        const codeNorm = rawCode.replace(/[^A-Z0-9]/g, '');

        const groupKey = `${semRaw}::${date}::${session}::${titleNorm || codeNorm}`;
        const department = exam?.Subject?.Department || {};
        const deptCode = String(department.DepartmentCode || exam?.BranchScope || 'GEN');
        const deptName = String(department.DepartmentName || exam?.BranchScope || 'General');
        // Key by ExamID so duplicate exams in the same department are never silently dropped
        const branchKey = String(exam.ExamID);

        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                groupKey,
                examName,
                date,
                session,
                status: String(exam?.Status || 'Scheduled'),
                duration,
                subjectCode: rawCode,
                examType: String(exam?.ExamSeries?.ExamType || 'EndSemester'),
                programName: String(exam?.Subject?.Semester?.Program?.ProgramName || 'Program'),
                semesterName: semRaw,
                branches: [],
                branchKeys: new Set<string>(),
                subjectCodes: new Set<string>(),
                hasRegistrations: false,
                totalRegistrations: 0
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
                registrationCount: regCount
            });
        }

        if (regCount > 0) {
            group.hasRegistrations = true;
            group.totalRegistrations += regCount;
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
        .sort((a, b) => a.examName.localeCompare(b.examName));
};

const ExamDateDetail: React.FC = () => {
    const navigate = useNavigate();
    const { seriesId, date } = useParams<{ seriesId: string; date: string }>();
    const [exams, setExams] = useState<GroupedExam[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState<GroupedExam | null>(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [selectedExamForDetail, setSelectedExamForDetail] = useState<any>(null);
    const [selectedExamBranchesForDetail, setSelectedExamBranchesForDetail] = useState<BranchOption[]>([]);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: async () => { }
    });

    useEffect(() => {
        if (seriesId && date) fetchExams();
    }, [seriesId, date]);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const response = await ExamService.getAll({ seriesId, startDate: date, endDate: date });
            setExams(groupExamsByPaper(Array.isArray(response) ? response : []));
        } catch (e: any) {
            console.error('Failed to fetch exams for date', e);
            toast.error('Failed to load exams for selected date');
        } finally {
            setLoading(false);
        }
    };

    const parsedDateObj = useMemo(() => parseLocalDate(date), [date]);

    const selectedDateLabel = useMemo(() => {
        if (!date) return '';
        if (!parsedDateObj) return date;
        return parsedDateObj.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }, [date, parsedDateObj]);

    const handleClearExamEligibility = (branch: BranchOption, examName: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Clear Subject Eligibility',
            message: `Are you sure you want to clear ALL eligibility records for ${examName} (${branch.departmentCode})? This will also remove any seat allocations for this exam.`,
            onConfirm: async () => {
                try {
                    await ExamService.clearSingleExamEligibility(branch.examId);
                    toast.success(`Cleared eligibility for ${examName} (${branch.departmentCode})`);
                    fetchExams();
                } catch (e: any) {
                    console.error('Failed to clear exam eligibility', e);
                    toast.error('Failed to clear eligibility');
                    throw e;
                }
            }
        });
    };

    const handleClearGroupEligibility = (exam: GroupedExam) => {
        const branchNames = exam.branches.map(b => b.departmentCode).join(', ');
        const isMulti = exam.branches.length > 1;

        setConfirmModal({
            isOpen: true,
            title: isMulti ? 'Clear Group Eligibility' : 'Clear Subject Eligibility',
            message: isMulti
                ? `Are you sure you want to clear ALL eligibility records for ${exam.examName} across ALL departments (${branchNames})? This will also remove any seat allocations.`
                : `Are you sure you want to clear ALL eligibility records for ${exam.examName} (${branchNames})? This will also remove any seat allocations.`,
            onConfirm: async () => {
                try {
                    await Promise.all(exam.branches.map(b => ExamService.clearSingleExamEligibility(b.examId)));
                    toast.success(`Cleared eligibility for ${exam.examName}`);
                    fetchExams();
                } catch (e: any) {
                    console.error('Failed to clear group eligibility', e);
                    toast.error('Failed to clear some eligibility records');
                    throw e;
                }
            }
        });
    };

    const openImport = (exam: GroupedExam) => {
        setSelectedExam(exam);
        setIsImportOpen(true);
    };

    const openDetailPanel = (exam: GroupedExam, preferredBranch?: BranchOption) => {
        const targetBranch =
            preferredBranch ||
            exam.branches.find(b => b.registrationCount > 0) ||
            exam.branches[0];
        if (!targetBranch) return;

        setSelectedExamForDetail({
            ExamID: targetBranch.examId,
            ExamName: exam.examName,
            ExamDate: exam.date,
            Session: exam.session,
            Status: exam.status,
            Duration: exam.duration,
            Subject: {
                SubjectName: exam.examName,
                SubjectCode: exam.subjectCode,
                Department: {
                    DepartmentCode: targetBranch.departmentCode,
                    DepartmentName: targetBranch.departmentName,
                    DepartmentID: targetBranch.departmentId
                }
            }
        });
        setSelectedExamBranchesForDetail(exam.branches);
        setIsDetailPanelOpen(true);
    };

    // UI-ONLY Grouping Logic
    const morningExams = exams.filter(e => e.session === 'FN');
    const afternoonExams = exams.filter(e => e.session === 'AN');
    const otherExams = exams.filter(e => e.session !== 'FN' && e.session !== 'AN');

    const ExamCard = ({ exam }: { exam: GroupedExam }) => (
        <Card className="bg-white border-transparent shadow-[0_4px_20px_-8px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 rounded-[24px]">
            <CardBody className="p-7">
                <div className="flex flex-col h-full justify-between">
                    <div>
                        <div className="flex justify-between items-start gap-4 mb-5">
                            <div>
                                {exam.subjectCode && (
                                    <span className="inline-block mb-2 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100">
                                        {exam.subjectCode}
                                    </span>
                                )}
                                <h3 className="text-xl font-black text-slate-800 leading-tight flex items-center gap-2">
                                    {exam.examName}
                                    {exam.hasRegistrations && (
                                        <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 shadow-sm" title={`${exam.totalRegistrations} Students Mapped`}>
                                            <CalendarCheck size={12} className="stroke-[3]" />
                                        </div>
                                    )}
                                </h3>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <span className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest bg-slate-100 text-slate-500 border border-slate-200/60 shadow-sm leading-none flex items-center justify-center">
                                    <CalendarClock size={12} className="mr-1.5 stroke-[2.5]" /> {exam.duration}m
                                </span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <div className="flex flex-wrap gap-2">
                                {exam.branches.map((branch) => (
                                    <div
                                        key={`${exam.groupKey}-${branch.examId}`}
                                        onClick={() => openDetailPanel(exam, branch)}
                                        className="relative flex items-center bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-100 rounded-[10px] shadow-sm cursor-pointer transition-colors"
                                        title={`Click to view students for ${branch.departmentCode} (${branch.registrationCount} mapped)`}
                                    >
                                        <span className={`py-1.5 text-[11px] font-extrabold tracking-wide uppercase text-indigo-700 flex items-center gap-1.5 ${branch.registrationCount > 0 ? 'pl-3 pr-1' : 'px-3'}`}>
                                            {branch.departmentCode}
                                            {branch.registrationCount > 0 && (
                                                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-black">
                                                    {branch.registrationCount}
                                                </span>
                                            )}
                                        </span>
                                        {branch.registrationCount > 0 && (
                                            <button
                                                className="p-1 mr-1 text-indigo-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClearExamEligibility(branch, exam.examName);
                                                }}
                                                title={`Clear eligibility for ${branch.departmentCode}`}
                                            >
                                                <X size={12} strokeWidth={3} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-4 pt-5 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                {exam.branches.length} Dept{exam.branches.length !== 1 ? 's' : ''}
                            </span>
                            {exam.hasRegistrations && (
                                <>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center gap-1">
                                        <Users size={11} /> {exam.totalRegistrations}
                                    </span>
                                    <button
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleClearGroupEligibility(exam);
                                        }}
                                        title="Clear All Eligibility"
                                    >
                                        <Trash2 size={14} strokeWidth={2.5} />
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                className="font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl px-4"
                                startContent={<Info size={14} className="stroke-[2.5] font-black" />}
                                onPress={() => openDetailPanel(exam)}
                            >
                                Details
                            </Button>
                            <Button
                                size="sm"
                                className="font-bold bg-slate-900 text-white rounded-xl shadow-md px-4 hover:-translate-y-0.5 transition-transform"
                                startContent={<Upload size={14} className="stroke-[2.5]" />}
                                onPress={() => openImport(exam)}
                            >
                                Import
                            </Button>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-16">
            <div className="bg-white border-b border-slate-200/80 px-8 py-8 md:py-10 mb-8 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3"></div>
                <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <Button
                            isIconOnly
                            variant="light"
                            className="bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl shadow-sm border border-slate-100 transition-all w-12 h-12"
                            onPress={() => navigate(`/admin/exams/series/${seriesId}/dates`)}
                        >
                            <ArrowLeft size={20} className="stroke-[2.5]" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-3">
                                <span className="text-indigo-600 text-xl font-extrabold uppercase tracking-widest">
                                    {parsedDateObj ? parsedDateObj.getDate().toString().padStart(2, '0') : ''}
                                </span>
                                {selectedDateLabel}
                            </h1>
                            <p className="text-slate-500 mt-1.5 font-medium text-sm">Managing explicit subjects scheduled for this day.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-11 px-5 text-xs shadow-md shadow-indigo-200 transition-all"
                            startContent={<Upload size={15} className="stroke-[2.5]" />}
                            onPress={() => setIsBulkImportOpen(true)}
                        >
                            Bulk Import for This Date
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto">
                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200 rounded-[32px] shadow-sm">No exams scheduled for this date</div>
                ) : (
                    <div className="space-y-12">

                        {/* FORENOON SESSION */}
                        {morningExams.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 shadow-sm shrink-0">
                                        <Sun size={20} className="stroke-[2.5]" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                        Forenoon Session
                                        <span className="text-xs font-bold text-amber-600/80 bg-amber-100/50 px-2.5 py-1 rounded-lg tracking-wide">
                                            {morningExams.length} Exam{morningExams.length !== 1 ? 's' : ''}
                                        </span>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                                    {morningExams.map((exam) => <ExamCard key={exam.groupKey} exam={exam} />)}
                                </div>
                            </section>
                        )}

                        {/* AFTERNOON SESSION */}
                        {afternoonExams.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100 shadow-sm shrink-0">
                                        <Moon size={20} className="stroke-[2.5]" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                        Afternoon Session
                                        <span className="text-xs font-bold text-indigo-600/80 bg-indigo-100/50 px-2.5 py-1 rounded-lg tracking-wide">
                                            {afternoonExams.length} Exam{afternoonExams.length !== 1 ? 's' : ''}
                                        </span>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                                    {afternoonExams.map((exam) => <ExamCard key={exam.groupKey} exam={exam} />)}
                                </div>
                            </section>
                        )}

                        {/* OTHER SESSIONS */}
                        {otherExams.length > 0 && (
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-[14px] bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                        <CalendarClock size={20} className="stroke-[2.5]" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                                        Other Sessions
                                        <span className="text-xs font-bold text-slate-500/80 bg-slate-200/50 px-2.5 py-1 rounded-lg tracking-wide">
                                            {otherExams.length} Exam{otherExams.length !== 1 ? 's' : ''}
                                        </span>
                                    </h2>
                                </div>
                                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                                    {otherExams.map((exam) => <ExamCard key={exam.groupKey} exam={exam} />)}
                                </div>
                            </section>
                        )}

                    </div>
                )}
            </div>

            {selectedExam && (
                <EligibleStudentsImportModal
                    isOpen={isImportOpen}
                    onClose={() => setIsImportOpen(false)}
                    examName={selectedExam.examName}
                    branches={selectedExam.branches}
                    onSuccess={fetchExams}
                />
            )}

            <BulkEligibleImportModal
                isOpen={isBulkImportOpen}
                onClose={() => setIsBulkImportOpen(false)}
                date={date}
                seriesId={seriesId}
                onSuccess={fetchExams}
            />

            {selectedExamForDetail && (
                <ExamDetailPanel
                    isOpen={isDetailPanelOpen}
                    exam={selectedExamForDetail}
                    branches={selectedExamBranchesForDetail}
                    onClose={() => setIsDetailPanelOpen(false)}
                    onEdit={() => { }}
                    onDataChanged={fetchExams}
                />
            )}

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />

        </div>
    );
};

export default ExamDateDetail;
