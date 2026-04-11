import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Button } from "@heroui/react";
import { BookOpen, Plus, Clock, FileText, AlertCircle, ArrowLeft } from "lucide-react";
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
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 p-8 lg:p-12 max-w-[1600px] mx-auto">
                
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            isIconOnly
                            variant="light"
                            className="text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            onPress={() => navigate('/admin/exams')}
                        >
                            <ArrowLeft size={24} />
                        </Button>
                        <div>
                            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">Examination Management</p>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                                {seriesName || 'Exams'}
                            </h1>
                        </div>
                    </div>
                    <p className="text-slate-300 text-lg ml-14 font-light">
                        Create and manage exams for {seriesName}
                    </p>
                </div>

                {/* Action & Stats Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 hover:bg-white/10 transition-all">
                            <p className="text-slate-400 text-sm">Total Exams</p>
                            <h3 className="text-2xl font-bold text-white mt-1">{exams.length}</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 hover:bg-white/10 transition-all">
                            <p className="text-slate-400 text-sm">Scheduled</p>
                            <h3 className="text-2xl font-bold text-blue-400 mt-1">{exams.filter((e: any) => e.Status === 'Scheduled').length}</h3>
                        </div>
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 hover:bg-white/10 transition-all">
                            <p className="text-slate-400 text-sm">Completed</p>
                            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{exams.filter((e: any) => e.Status === 'Completed').length}</h3>
                        </div>
                    </div>
                    <Button
                        onPress={handleCreateExam}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all px-8 rounded-xl"
                        startContent={<Plus size={20} />}
                        size="lg"
                    >
                        Create Exam
                    </Button>
                </div>

                {/* Exams Grid or Empty State */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md animate-pulse"></div>
                        ))}
                    </div>
                ) : exams.length === 0 ? (
                    <div className="text-center py-24 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-300 font-semibold text-lg mb-2">No exams yet</p>
                        <p className="text-slate-400 text-sm mb-8">Create your first exam to get started</p>
                        <Button
                            onPress={handleCreateExam}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/30"
                            startContent={<Plus size={18} />}
                        >
                            Create First Exam
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {exams.map((exam) => (
                            <Card
                                key={exam.ExamID}
                                className="bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group rounded-2xl overflow-hidden"
                            >
                                <div className="h-2 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                                <CardBody className="p-6 space-y-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                                            {exam.ExamName}
                                        </h3>
                                        <p className="text-slate-400 text-sm mt-1">{exam.Subject?.SubjectCode}</p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            exam.Status === 'Scheduled' ? 'bg-blue-500/20 text-blue-300' :
                                            exam.Status === 'Completed' ? 'bg-emerald-500/20 text-emerald-300' :
                                            'bg-purple-500/20 text-purple-300'
                                        }`}>
                                            {exam.Status}
                                        </span>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-200">
                                            {exam.Session === 'FN' ? 'Morning' : 'Afternoon'}
                                        </span>
                                    </div>
                                    <div className="text-slate-400 text-sm pt-2 border-t border-white/10">
                                        <p>{new Date(exam.ExamDate).toLocaleDateString()}</p>
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
