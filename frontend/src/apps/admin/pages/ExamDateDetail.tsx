import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody } from '@heroui/react';
import { ArrowLeft, CalendarDays, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';
import EligibleStudentsImportModal from '../components/exams/EligibleStudentsImportModal';
import ExamDetailPanel from '../components/exams/ExamDetailPanel';

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
    branches: BranchOption[];
};

const groupExamsByPaper = (exams: any[]): GroupedExam[] => {
    const groups = new Map<string, GroupedExam & { branchKeys: Set<string> }>();

    exams.forEach((exam: any) => {
        const date = String(exam?.ExamDate || '').split('T')[0];
        const examName = String(exam?.ExamName || '').trim();
        const session = String(exam?.Session || '').trim().toUpperCase();
        const duration = Number(exam?.Duration || 0);
        const groupKey = `${date}::${session}::${examName}::${duration}`;
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
                branches: [],
                branchKeys: new Set<string>()
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
    });

    return Array.from(groups.values())
        .map(({ branchKeys, ...group }) => group)
        .sort((a, b) => a.examName.localeCompare(b.examName));
};

const ExamDateDetail: React.FC = () => {
    const navigate = useNavigate();
    const { seriesId, date } = useParams<{ seriesId: string; date: string }>();
    const [exams, setExams] = useState<GroupedExam[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState<GroupedExam | null>(null);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [selectedExamForDetail, setSelectedExamForDetail] = useState<any>(null);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

    useEffect(() => {
        if (seriesId && date) fetchExams();
    }, [seriesId, date]);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const response = await ExamService.getAll({ seriesId, startDate: date, endDate: date });
            setExams(groupExamsByPaper(response || []));
        } catch (e: any) {
            console.error('Failed to fetch exams for date', e);
            toast.error('Failed to load exams for selected date');
        } finally {
            setLoading(false);
        }
    };

    const selectedDateLabel = useMemo(() => {
        if (!date) return '';
        return new Date(date).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }, [date]);

    const openImport = (exam: GroupedExam) => {
        setSelectedExam(exam);
        setIsImportOpen(true);
    };

    const openDetailPanel = (exam: GroupedExam, branch: BranchOption) => {
        setSelectedExamForDetail({
            ExamID: branch.examId,
            ExamName: exam.examName,
            ExamDate: exam.date,
            Session: exam.session,
            Status: exam.status,
            Duration: exam.duration,
            Subject: {
                Department: {
                    DepartmentCode: branch.departmentCode,
                    DepartmentName: branch.departmentName,
                    DepartmentID: branch.departmentId
                }
            }
        });
        setIsDetailPanelOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#f4f6f9] pb-12">
            <div className="bg-white border-b border-slate-200/80 px-8 py-8 mb-8 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Button
                            isIconOnly
                            variant="light"
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            onPress={() => navigate(`/admin/exams/series/${seriesId}/dates`)}
                        >
                            <ArrowLeft size={24} />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Exams on {date}</h1>
                            <p className="text-slate-500 mt-1">Exams scheduled for {selectedDateLabel}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto">
                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">No exams scheduled for this date</div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {exams.map((exam) => (
                            <Card key={exam.groupKey} className="bg-white border border-slate-200 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden">
                                <div className="h-1.5 w-full bg-indigo-500"></div>
                                <CardBody className="p-6 space-y-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-bold text-slate-900">{exam.examName}</h3>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-100">
                                                    {exam.session === 'FN' ? 'Morning' : 'Afternoon'}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-100">
                                                    {exam.status}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                                                    {exam.duration} mins
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                    {exam.branches.length} branch{exam.branches.length > 1 ? 'es' : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                            <CalendarDays size={28} />
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {exam.branches.map((branch) => (
                                            <span
                                                key={`${exam.groupKey}-${branch.examId}`}
                                                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                                            >
                                                {branch.departmentCode}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="h-px bg-slate-100"></div>

                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-slate-500 text-sm font-medium flex items-center gap-1.5">
                                            <CalendarDays size={16} />
                                            <span>{new Date(exam.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                color="default"
                                                variant="flat"
                                                className="font-semibold"
                                                onPress={() => openDetailPanel(exam, exam.branches[0])}
                                            >
                                                View Details
                                            </Button>
                                            <Button
                                                color="primary"
                                                className="bg-indigo-600 font-semibold"
                                                startContent={<Upload size={16} />}
                                                onPress={() => openImport(exam)}
                                            >
                                                Import Eligible Students
                                            </Button>
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
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

            {selectedExamForDetail && (
                <ExamDetailPanel
                    isOpen={isDetailPanelOpen}
                    exam={selectedExamForDetail}
                    onClose={() => setIsDetailPanelOpen(false)}
                    onEdit={() => {}}
                />
            )}
        </div>
    );
};

export default ExamDateDetail;
