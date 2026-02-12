import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Chip } from "@heroui/react";
import { BookOpen, Calendar, ChevronRight, Plus, Clock, FileText, Sparkles } from "lucide-react";
import { SeriesService } from '../services/seriesService';
import ExamSeriesManagementModal from '../components/exams/ExamSeriesManagementModal';

const ExamSeriesList: React.FC = () => {
    const navigate = useNavigate();
    const [series, setSeries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);

    useEffect(() => {
        fetchSeries();
    }, []);

    const fetchSeries = async () => {
        setLoading(true);
        try {
            const response = await SeriesService.getAll();
            if (response.success) {
                setSeries(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch series", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSeriesClick = (seriesId: number) => {
        navigate(`/admin/exams/${seriesId}`);
    };

    // Accent colors for cards
    const cardAccents = [
        { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' },
        { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-600' },
        { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', gradient: 'from-violet-500 to-violet-600' },
        { bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', gradient: 'from-cyan-500 to-cyan-600' },
        { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', gradient: 'from-emerald-500 to-emerald-600' },
        { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', gradient: 'from-rose-500 to-rose-600' },
    ];

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen">

            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 md:p-10">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
                <div className="absolute top-4 right-8 opacity-[0.03]">
                    <BookOpen size={200} strokeWidth={0.5} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                            <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest">Examination Management</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Exam Series
                        </h1>
                        <p className="text-blue-200/70 mt-2 text-sm max-w-md">
                            Select an exam series to manage timetables, view schedules, and track examination progress.
                        </p>
                    </div>
                    <Button
                        className="bg-white text-slate-900 font-bold shadow-lg shadow-black/20 hover:shadow-xl hover:scale-[1.02] transition-all px-6"
                        startContent={<Plus size={16} />}
                        onPress={() => setIsSeriesModalOpen(true)}
                        size="lg"
                        radius="lg"
                    >
                        Manage Series
                    </Button>
                </div>

                {/* Quick Stats */}
                <div className="relative z-10 mt-8 flex flex-wrap gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <FileText size={18} className="text-blue-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{series.length}</p>
                            <p className="text-xs text-blue-300/70">Total Series</p>
                        </div>
                    </div>
                    <div className="w-px bg-white/10 self-stretch"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Sparkles size={18} className="text-emerald-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{series.filter(s => s.IsActive).length}</p>
                            <p className="text-xs text-emerald-300/70">Active</p>
                        </div>
                    </div>
                    <div className="w-px bg-white/10 self-stretch"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Clock size={18} className="text-amber-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{series.filter(s => !s.IsActive).length}</p>
                            <p className="text-xs text-amber-300/70">Archived</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Series Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-52 bg-white rounded-2xl border border-gray-100 animate-pulse">
                            <div className="h-1.5 rounded-t-2xl bg-gray-200"></div>
                            <div className="p-6 space-y-4">
                                <div className="w-12 h-12 rounded-xl bg-gray-100"></div>
                                <div className="h-5 w-3/4 bg-gray-100 rounded-lg"></div>
                                <div className="h-3 w-1/2 bg-gray-50 rounded-lg"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : series.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
                        <BookOpen size={28} className="text-gray-300" />
                    </div>
                    <p className="text-gray-600 font-semibold text-lg">No Exam Series Found</p>
                    <p className="text-sm text-gray-400 mt-1 mb-6">Create your first exam series to get started.</p>
                    <Button
                        className="bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 px-6"
                        startContent={<Plus size={16} />}
                        onPress={() => setIsSeriesModalOpen(true)}
                    >
                        Create First Series
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {series.map((item, index) => {
                        const accent = cardAccents[index % cardAccents.length]!;
                        return (
                            <Card
                                key={item.ExamSeriesID}
                                isPressable
                                onPress={() => handleSeriesClick(item.ExamSeriesID)}
                                className="border border-gray-100 bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group rounded-2xl overflow-hidden"
                            >
                                {/* Top accent bar */}
                                <div className={`h-1.5 bg-gradient-to-r ${accent.gradient}`}></div>

                                <CardBody className="p-6 space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div className={`p-3 rounded-xl ${accent.light} ${accent.text} group-hover:scale-110 transition-transform duration-300`}>
                                            <BookOpen size={24} />
                                        </div>
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            className={item.IsActive
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                                                : "bg-gray-50 text-gray-500 border border-gray-200 font-semibold"
                                            }
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${item.IsActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                                {item.IsActive ? "Active" : "Archived"}
                                            </span>
                                        </Chip>
                                    </div>

                                    <div>
                                        <h3 className={`text-lg font-bold text-gray-900 group-hover:${accent.text} transition-colors`}>
                                            {item.SeriesName}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                                            {item.Description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-4 pt-1">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                            <Calendar size={13} />
                                            <span className="font-medium">{item.AcademicYear?.YearName || "–"}</span>
                                        </div>
                                        {item.Semester && (
                                            <>
                                                <span className="text-gray-200">•</span>
                                                <span className="text-xs text-gray-400 font-medium">{item.Semester.SemesterName}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Bottom action bar */}
                                    <div className={`flex justify-between items-center pt-4 border-t border-gray-100`}>
                                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-gray-600 transition-colors">
                                            View Timetable
                                        </span>
                                        <div className={`w-8 h-8 rounded-lg ${accent.light} ${accent.text} flex items-center justify-center group-hover:translate-x-1 transition-transform duration-300`}>
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Management Modal */}
            <ExamSeriesManagementModal
                isOpen={isSeriesModalOpen}
                onClose={() => setIsSeriesModalOpen(false)}
                onSuccess={fetchSeries}
            />
        </div>
    );
};

export default ExamSeriesList;
