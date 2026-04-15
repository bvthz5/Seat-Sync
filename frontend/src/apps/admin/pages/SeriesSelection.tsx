import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { BookOpen, Plus, Zap, CheckCircle, ChevronRight, AlertCircle, Search, Sparkles, Grid3x3, Tag, Compass, Edit2, Trash2 } from "lucide-react";
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

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editSeriesId, setEditSeriesId] = useState<number | null>(null);
    const [editSeriesName, setEditSeriesName] = useState('');
    const [editSeriesType, setEditSeriesType] = useState<'Internal' | 'EndSemester'>('Internal');
    const [editIsActive, setEditIsActive] = useState(true);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteSeriesId, setDeleteSeriesId] = useState<number | null>(null);

    const handleEditSeriesSubmit = async () => {
        if (!editSeriesName.trim() || !editSeriesId) {
            toast.error("Please enter a valid series name");
            return;
        }
        setIsSubmitting(true);
        try {
            await SeriesService.update(editSeriesId, {
                SeriesName: editSeriesName.trim(),
                ExamType: editSeriesType,
                IsActive: editIsActive
            });
            toast.success("Series updated successfully!");
            setIsEditModalOpen(false);
            fetchSeries();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to update series");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSeriesSubmit = async () => {
        if (!deleteSeriesId) return;
        setIsSubmitting(true);
        try {
            await SeriesService.delete(deleteSeriesId);
            toast.success("Series deleted successfully!");
            setIsDeleteModalOpen(false);
            fetchSeries();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete series");
        } finally {
            setIsSubmitting(false);
        }
    };

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
        { outline: 'border-indigo-200', bg: 'bg-indigo-50', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
        { outline: 'border-blue-200', bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
        { outline: 'border-purple-200', bg: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
        { outline: 'border-cyan-200', bg: 'bg-cyan-50', icon: 'text-cyan-600', badge: 'bg-cyan-100 text-cyan-700' },
        { outline: 'border-emerald-200', bg: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
        { outline: 'border-orange-200', bg: 'bg-orange-50', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
    ];

    return (
        <div className="min-h-screen bg-[#f4f6f9] pb-12">
            {/* Page Header (consistent with light theme Dashboards) */}
            <div className="bg-white border-b border-slate-200/80 px-8 py-8 mb-8 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                            <Compass className="text-indigo-600" size={30} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                Exam Series
                            </h1>
                            <p className="text-slate-500 font-medium mt-1 max-w-xl">
                                Organize and manage your examination cycles efficiently. Create series for internals, end semesters, and supplementary exams.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Container */}
            <div className="px-8 max-w-[1600px] mx-auto">
                
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-8">
                    <div className="flex-1 w-full sm:w-auto">
                        <div className="relative max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <Input
                                aria-label="Search series"
                                placeholder="Search series..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                                size="lg"
                                className="pl-12"
                                classNames={{
                                    inputWrapper: "bg-white border border-slate-200 hover:border-slate-300 transition-all rounded-xl shadow-sm text-slate-800",
                                    input: "placeholder:text-slate-400"
                                }}
                            />
                        </div>
                    </div>
                    <Button
                        onPress={() => setIsModalOpen(true)}
                        className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 transition-all px-8 rounded-xl h-12"
                        startContent={<Plus size={20} strokeWidth={3} />}
                    >
                        Create Series
                    </Button>
                </div>

                {/* Stats Overview */}
                {!loading && series.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Series</p>
                                    <h3 className="text-4xl font-extrabold text-slate-900">{series.length}</h3>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <Grid3x3 size={28} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Active Series</p>
                                    <h3 className="text-4xl font-extrabold text-slate-900">{series.filter(s => s.IsActive).length}</h3>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                    <CheckCircle size={28} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">Internal Exams</p>
                                    <h3 className="text-4xl font-extrabold text-slate-900">{series.filter(s => s.ExamType === 'Internal').length}</h3>
                                </div>
                                <div className="w-14 h-14 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                    <Tag size={28} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Series Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-64 bg-slate-100/50 border border-slate-200 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredSeries.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-10 h-10 text-slate-400" />
                        </div>
                        <p className="text-slate-800 font-bold text-xl mb-2">
                            {searchQuery ? "No matching series found" : "No exam series yet"}
                        </p>
                        <p className="text-slate-500 text-sm mb-8">
                            {searchQuery ? "Try adjusting your search criteria" : "Create your first series to start managing exams"}
                        </p>
                        {!searchQuery && (
                            <Button
                                onPress={() => setIsModalOpen(true)}
                                className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700"
                                startContent={<Plus size={18} />}
                            >
                                Create First Series
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredSeries.map((s, index) => {
                            const color = seriesColors[index % seriesColors.length];
                            return (
                                <Card
                                    key={s.ExamSeriesID}
                                    className={`bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 group rounded-2xl overflow-hidden`}
                                >
                                    {/* Top trim line */}
                                    <div className={`h-1.5 w-full ${color.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>

                                    <CardBody className="p-6 space-y-5">
                                        {/* Icon & Status & Actions */}
                                        <div className="flex justify-between items-start">
                                            <div className={`p-4 rounded-xl ${color.bg} ${color.icon} group-hover:scale-110 transition-transform duration-300`}>
                                                <Zap size={24} />
                                            </div>
                                            <div className="flex gap-2">
                                                {s.IsActive ? (
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100`}>
                                                        <CheckCircle size={14} />
                                                        Active
                                                    </div>
                                                ) : (
                                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200`}>
                                                        Inactive
                                                    </div>
                                                )}
                                                
                                                <Button 
                                                    isIconOnly size="sm" variant="flat" color="primary" 
                                                    className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 min-w-8 w-8 h-8 rounded-md"
                                                    onPress={() => {
                                                        setEditSeriesId(s.ExamSeriesID);
                                                        setEditSeriesName(s.SeriesName);
                                                        setEditSeriesType(s.ExamType);
                                                        setEditIsActive(s.IsActive);
                                                        setIsEditModalOpen(true);
                                                    }}
                                                ><Edit2 size={14} /></Button>
                                                
                                                <Button 
                                                    isIconOnly size="sm" variant="flat" color="danger" 
                                                    className="bg-red-50 text-red-600 hover:bg-red-100 min-w-8 w-8 h-8 rounded-md"
                                                    onPress={() => {
                                                        setDeleteSeriesId(s.ExamSeriesID);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                ><Trash2 size={14} /></Button>
                                            </div>
                                        </div>

                                        {/* Content - wrapped in a click handler */}
                                        <div className="min-h-[4rem] cursor-pointer group" onClick={() => handleSelectSeries(s.ExamSeriesID)}>
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                                {s.SeriesName}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${color.badge} border ${color.outline}`}>
                                                    {s.ExamType === 'EndSemester' ? '📋 End Semester' : '📝 Internal'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Divider */}
                                        <div className="h-px bg-slate-100"></div>

                                        {/* Footer */}
                                        <div className="flex justify-between items-center group-hover:text-indigo-600 cursor-pointer" onClick={() => handleSelectSeries(s.ExamSeriesID)}>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest transition-colors">
                                                View Exams
                                            </span>
                                            <div className={`p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300`}>
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
                    backdrop: "bg-slate-900/50 backdrop-blur-sm",
                    base: "bg-white shadow-2xl border border-slate-200",
                    header: "border-b border-slate-100 pb-4",
                    body: "gap-6 py-6",
                    footer: "border-t border-slate-100 pt-4",
                    closeButton: "text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3 text-slate-900">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                            <Sparkles className="text-indigo-600" size={20} />
                        </div>
                        <span className="text-xl font-bold">Create New Series</span>
                    </ModalHeader>
                    <ModalBody>
                        <div className="space-y-6">
                            {/* Series Name */}
                            <div>
                                <label htmlFor="newSeriesName" className="block text-sm font-bold text-slate-700 mb-2">
                                    Series Name
                                </label>
                                <Input
                                    id="newSeriesName"
                                    aria-label="New Series Name"
                                    placeholder="e.g., Internals, End Semester"
                                    value={newSeriesName}
                                    onValueChange={setNewSeriesName}
                                    size="lg"
                                    variant="flat"
                                    disabled={isSubmitting}
                                    classNames={{
                                        inputWrapper: "bg-slate-100/70 border-0 shadow-none hover:bg-slate-200 focus-within:!bg-white focus-within:ring-2 focus-within:ring-indigo-600 transition-all rounded-xl outline-none",
                                        input: "text-slate-900 placeholder:text-slate-400 font-medium border-0 focus:border-0 focus:ring-0 ring-0 outline-none focus:outline-none shadow-none bg-transparent"
                                    }}
                                />
                            </div>

                            {/* Exam Type */}
                            <div>
                                <div className="block text-sm font-bold text-slate-700 mb-2">
                                          Exam Type
                                      </div>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button
                                        className={`flex-1 h-12 rounded-xl border-2 transition-all font-bold ${
                                            newSeriesType === 'Internal' 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                        onPress={() => setNewSeriesType('Internal')}
                                        disabled={isSubmitting}
                                    >
                                        Internal Assessment
                                    </Button>
                                    <Button
                                        className={`flex-1 h-12 rounded-xl border-2 transition-all font-bold ${
                                            newSeriesType === 'EndSemester' 
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50' 
                                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                        onPress={() => setNewSeriesType('EndSemester')}
                                        disabled={isSubmitting}
                                    >
                                        End Semester
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="light"
                            onPress={() => setIsModalOpen(false)}
                            disabled={isSubmitting}
                            className="text-slate-600 font-bold hover:bg-slate-100 rounded-xl h-11"
                        >
                            Cancel
                        </Button>
                        <Button
                            onPress={handleCreateSeries}
                            isLoading={isSubmitting}
                            className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 px-6 rounded-xl h-11"
                        >
                            Create Series
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Edit Series Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => !isSubmitting && setIsEditModalOpen(false)}
                size="md"
                backdrop="blur"
                classNames={{
                    backdrop: "bg-slate-900/50 backdrop-blur-sm",
                    base: "bg-white shadow-2xl border border-slate-200",
                    header: "border-b border-slate-100 pb-4",
                    body: "gap-6 py-6",
                    footer: "border-t border-slate-100 pt-4",
                    closeButton: "text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3 text-slate-900">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                            <Edit2 className="text-indigo-600" size={20} />
                        </div>
                        <span className="text-xl font-bold">Edit Series</span>
                    </ModalHeader>
                    <ModalBody>
                        <div>
                            <label htmlFor="editSeriesName" className="block text-sm font-bold text-slate-700 mb-2">Series Name</label>
                            <Input
                                id="editSeriesName"
                                aria-label="Edit Series Name"
                                value={editSeriesName}
                                onChange={(e) => setEditSeriesName(e.target.value)}
                                placeholder="e.g., Spring 2024 Internals"
                                classNames={{
                                    inputWrapper: "bg-slate-50 border-2 border-slate-100 hover:border-indigo-300 focus-within:!border-indigo-600 focus-within:!bg-white rounded-xl shadow-inner h-12 transition-all",
                                    input: "text-slate-900 font-semibold"
                                }}
                                disabled={isSubmitting}
                            />
                        </div>
                        
                        <div>
                            <div className="block text-sm font-bold text-slate-700 mb-2">
                                          Exam Type
                                      </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    className={`flex-1 h-12 rounded-xl border-2 transition-all font-bold ${
                                        editSeriesType === 'Internal'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                    onPress={() => setEditSeriesType('Internal')}
                                    disabled={isSubmitting}
                                >
                                    Internal Assessment
                                </Button>
                                <Button
                                    className={`flex-1 h-12 rounded-xl border-2 transition-all font-bold ${
                                        editSeriesType === 'EndSemester'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                    onPress={() => setEditSeriesType('EndSemester')}
                                    disabled={isSubmitting}
                                >
                                    End Semester
                                </Button>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter className="flex gap-3">
                        <Button variant="light" onPress={() => setIsEditModalOpen(false)} disabled={isSubmitting} className="text-slate-600 font-bold hover:bg-slate-100 rounded-xl h-11">Cancel</Button>
                        <Button color="primary" onPress={handleEditSeriesSubmit} isLoading={isSubmitting} className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 px-6 rounded-xl h-11">Save Changes</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Delete Series Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} size="md" backdrop="blur" classNames={{
                backdrop: "bg-slate-900/50 backdrop-blur-sm",
                base: "bg-white shadow-2xl border border-slate-200",
                header: "border-b border-red-100 pb-4",
                body: "py-6",
            }}>
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3 text-slate-900">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center border border-red-100">
                            <Trash2 className="text-red-600" size={20} />
                        </div>
                        <span className="text-xl font-bold">Delete Series</span>
                    </ModalHeader>
                    <ModalBody>
                        <p className="text-slate-600">Are you sure you want to delete this exam series? This action <span className="font-bold text-red-600">cannot be undone</span> and will delete all associated exams and seating plans.</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" onPress={() => setIsDeleteModalOpen(false)} disabled={isSubmitting} className="font-bold">Cancel</Button>
                        <Button color="danger" onPress={handleDeleteSeriesSubmit} isLoading={isSubmitting} className="font-bold">Delete Series</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default SeriesSelection;

