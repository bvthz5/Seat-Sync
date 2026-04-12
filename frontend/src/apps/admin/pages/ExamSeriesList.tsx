import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Button } from "@heroui/react";
import { BookOpen, Plus, Clock, FileText, AlertCircle, ArrowLeft, CheckCircle, CalendarDays } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';
import { SeriesService } from '../services/seriesService';
import CreateExamModal from '../components/exams/CreateExamModal';

const ExamSeriesList: React.FC = () => {
    const navigate = useNavigate();
    const { seriesId } = useParams<{ seriesId: string }>();
    const [exams, setExams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [seriesName, setSeriesName] = useState<string>('');

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
                    <Button
                        onPress={handleCreateExam}
                        className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 transition-all px-8 rounded-xl h-14 w-full lg:w-auto"
                        startContent={<Plus size={20} strokeWidth={3} />}
                    >
                        Create Pattern
                    </Button>
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
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {exams.map((exam) => (
                            <Card
                                key={exam.ExamID}
                                className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 group rounded-2xl overflow-hidden"
                            >
                                <div className="h-1.5 w-full bg-indigo-500"></div>
                                <CardBody className="p-6 space-y-5">
                                    <div className="min-h-[4rem]">
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {exam.ExamName}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-slate-500 font-medium text-sm flex-1 truncate" title={exam.Subject?.SubjectName || exam.Subject?.SubjectCode}>
                                                {exam.Subject?.SubjectCode} 
                                                {exam.Subject?.SubjectName ? ` - ${exam.Subject?.SubjectName}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                                            exam.Status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            exam.Status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            'bg-purple-50 text-purple-700 border-purple-200'
                                        }`}>
                                            {exam.Status}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                            {exam.Session === 'FN' ? '☀️ Morning' : '🌙 Afternoon'}
                                        </span>
                                    </div>
                                    
                                    {/* Divider */}
                                    <div className="h-px bg-slate-100"></div>

                                    <div className="flex items-center justify-between text-slate-500 text-sm font-medium pt-1 group-hover:text-indigo-600 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            <CalendarDays size={16} />
                                            <span>{new Date(exam.ExamDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
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
        </div>
    );
};

export default ExamSeriesList;
