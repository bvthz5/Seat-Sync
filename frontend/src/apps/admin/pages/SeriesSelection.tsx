import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { BookOpen, Plus, Zap, CheckCircle, ChevronRight, AlertCircle, Search, Sparkles, Grid3x3, Tag } from "lucide-react";
import { toast } from 'react-hot-toast';
import { SeriesService } from '../services/seriesService';

const SeriesSelection: React.FC = () => {
    const navigate = useNavigate();
    const [series, setSeries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newSeriesName, setNewSeriesName] = useState('');
    const [newSeriesType, setNewSeriesType] = useState<'Internal' | 'EndSemester'>('Internal');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchSeries();
    }, []);

    const fetchSeries = async () => {
        setLoading(true);
        try {
            const response = await SeriesService.getAll();
            setSeries(Array.isArray(response) ? response : response.data || []);
        } catch (error) {
            console.error("Failed to fetch series", error);
            toast.error("Failed to load exam series");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSeries = async () => {
        if (!newSeriesName.trim()) {
            toast.error("Please enter a series name");
            return;
        }

        setIsSubmitting(true);
        try {
            await SeriesService.create({
                SeriesName: newSeriesName.trim(),
                ExamType: newSeriesType
            });
            toast.success("✨ Series created successfully!");
            setNewSeriesName('');
            setNewSeriesType('Internal');
            setIsModalOpen(false);
            fetchSeries();
        } catch (error: any) {
            console.error("Failed to create series", error);
            toast.error(error.response?.data?.message || "Failed to create series");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectSeries = (seriesId: number) => {
        navigate(`/admin/exams/series/${seriesId}`);
    };

    const filteredSeries = series.filter(s =>
        s.SeriesName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const seriesColors = [
        { bg: 'from-blue-600 to-blue-700', light: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
        { bg: 'from-indigo-600 to-indigo-700', light: 'bg-indigo-50', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
        { bg: 'from-purple-600 to-purple-700', light: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
        { bg: 'from-cyan-600 to-cyan-700', light: 'bg-cyan-50', icon: 'text-cyan-600', badge: 'bg-cyan-100 text-cyan-700' },
        { bg: 'from-emerald-600 to-emerald-700', light: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
        { bg: 'from-orange-600 to-orange-700', light: 'bg-orange-50', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
    ];

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
                <div className="mb-12 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Sparkles className="text-white" size={24} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400">
                            Exam Series
                        </h1>
                    </div>
                    <p className="text-slate-300 text-lg max-w-2xl mx-auto font-light">
                        Organize and manage your examination cycles efficiently. Create series for internals, end semesters, and supplementary exams.
                    </p>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
                    <div className="flex-1 w-full sm:w-auto">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <Input
                                placeholder="Search series..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                                size="lg"
                                className="pl-12"
                                classNames={{
                                    inputWrapper: "bg-white/5 border border-white/10 backdrop-blur-md hover:border-white/20 transition-all rounded-xl shadow-lg",
                                    input: "text-white placeholder:text-slate-400"
                                }}
                            />
                        </div>
                    </div>
                    <Button
                        onPress={() => setIsModalOpen(true)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all px-8 rounded-xl"
                        startContent={<Plus size={20} />}
                        size="lg"
                    >
                        Create Series
                    </Button>
                </div>

                {/* Stats Overview */}
                {!loading && series.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/10 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium">Total Series</p>
                                    <h3 className="text-3xl font-bold text-white mt-2">{series.length}</h3>
                                </div>
                                <Grid3x3 className="text-blue-400" size={32} />
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/10 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium">Active Series</p>
                                    <h3 className="text-3xl font-bold text-white mt-2">{series.filter(s => s.IsActive).length}</h3>
                                </div>
                                <CheckCircle className="text-emerald-400" size={32} />
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-6 hover:bg-white/10 transition-all">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-400 text-sm font-medium">Internal Assessment</p>
                                    <h3 className="text-3xl font-bold text-white mt-2">{series.filter(s => s.ExamType === 'Internal').length}</h3>
                                </div>
                                <Tag className="text-purple-400" size={32} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Series Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredSeries.length === 0 ? (
                    <div className="text-center py-24 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl">
                        <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                        <p className="text-slate-300 font-semibold text-lg mb-2">
                            {searchQuery ? "No series found" : "No exam series yet"}
                        </p>
                        <p className="text-slate-400 text-sm mb-8">
                            {searchQuery ? "Try adjusting your search" : "Create your first series to get started"}
                        </p>
                        {!searchQuery && (
                            <Button
                                onPress={() => setIsModalOpen(true)}
                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/30"
                                startContent={<Plus size={18} />}
                            >
                                Create First Series
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredSeries.map((s, index) => {
                            const color = seriesColors[index % seriesColors.length];
                            return (
                                <Card
                                    key={s.ExamSeriesID}
                                    isPressable
                                    onPress={() => handleSelectSeries(s.ExamSeriesID)}
                                    className="bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group rounded-2xl overflow-hidden cursor-pointer"
                                >
                                    {/* Gradient top bar */}
                                    <div className={`h-2 bg-gradient-to-r ${color.bg}`}></div>

                                    <CardBody className="p-8 space-y-6">
                                        {/* Icon & Status */}
                                        <div className="flex justify-between items-start">
                                            <div className={`p-4 rounded-xl ${color.light} ${color.icon} group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                                <Zap size={28} />
                                            </div>
                                            {s.IsActive && (
                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${color.badge} backdrop-blur-sm`}>
                                                    <CheckCircle size={14} />
                                                    Active
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div>
                                            <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                                                {s.SeriesName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className={`inline-block px-3 py-1.5 rounded-lg text-xs font-bold ${color.badge}`}>
                                                    {s.ExamType === 'EndSemester' ? '📋 End Semester' : '📝 Internal'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                                        {/* Footer */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                                                View Exams
                                            </span>
                                            <div className={`p-2 rounded-lg ${color.light} ${color.icon} group-hover:translate-x-1 transition-transform duration-300`}>
                                                <ChevronRight size={18} />
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create Series Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => !isSubmitting && setIsModalOpen(false)}
                size="md"
                backdrop="blur"
                classNames={{
                    base: "bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10",
                    header: "border-b border-white/10",
                    body: "gap-6",
                    closeButton: "text-slate-300 hover:text-white"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3 text-white">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Sparkles className="text-white" size={20} />
                        </div>
                        Create New Exam Series
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-6">
                            {/* Series Name */}
                            <div>
                                <label className="block text-sm font-bold text-white mb-3">
                                    Series Name
                                </label>
                                <Input
                                    placeholder="e.g., Internals, End Semester"
                                    value={newSeriesName}
                                    onValueChange={setNewSeriesName}
                                    size="lg"
                                    disabled={isSubmitting}
                                    classNames={{
                                        inputWrapper: "bg-white/5 border border-white/10 hover:border-white/20 transition-all rounded-lg",
                                        input: "text-white placeholder:text-slate-400"
                                    }}
                                />
                            </div>

                            {/* Exam Type */}
                            <div>
                                <label className="block text-sm font-bold text-white mb-3">
                                    Exam Type
                                </label>
                                <div className="flex gap-3">
                                    <Button
                                        variant={newSeriesType === 'Internal' ? 'solid' : 'bordered'}
                                        className={newSeriesType === 'Internal' 
                                            ? 'flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold' 
                                            : 'flex-1 border border-white/20 text-white hover:border-white/40'
                                        }
                                        onPress={() => setNewSeriesType('Internal')}
                                        disabled={isSubmitting}
                                    >
                                        Internal Assessment
                                    </Button>
                                    <Button
                                        variant={newSeriesType === 'EndSemester' ? 'solid' : 'bordered'}
                                        className={newSeriesType === 'EndSemester' 
                                            ? 'flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold' 
                                            : 'flex-1 border border-white/20 text-white hover:border-white/40'
                                        }
                                        onPress={() => setNewSeriesType('EndSemester')}
                                        disabled={isSubmitting}
                                    >
                                        End Semester
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className="border-t border-white/10">
                        <Button
                            color="default"
                            variant="light"
                            onPress={() => setIsModalOpen(false)}
                            disabled={isSubmitting}
                            className="text-slate-300 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onPress={handleCreateSeries}
                            isLoading={isSubmitting}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold shadow-lg shadow-blue-500/30"
                        >
                            Create Series
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default SeriesSelection;
