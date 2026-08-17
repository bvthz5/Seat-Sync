import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Tooltip } from "@heroui/react";
import { BookOpen, Plus, CheckCircle, Search, Sparkles, Grid3x3, Tag, Edit2, Trash2, GraduationCap, ArrowRight, FileText, CalendarDays, ShieldCheck, AlertTriangle, X } from "lucide-react";
import { toast } from 'react-hot-toast';
import { SeriesService } from '../services/seriesService';

const SeriesSelection: React.FC = () => {
    // ==========================================
    // BACKEND LOGIC & DATA (UNCHANGED)
    // ==========================================
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

    // Conflict Details Modal State
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [selectedConflictSeries, setSelectedConflictSeries] = useState<any>(null);

    // ==========================================
    // UI/UX STATE (NEW)
    // ==========================================
    const [activeTab, setActiveTab] = useState<'Internal' | 'EndSemester'>(() => {
        return (sessionStorage.getItem('examSeriesActiveTab') as 'Internal' | 'EndSemester') || 'Internal';
    });
    const [createStep, setCreateStep] = useState<1 | 2>(1);

    // ==========================================
    // EFFECT & API HANDLERS (UNCHANGED)
    // ==========================================
    useEffect(() => {
        fetchSeries();
    }, []);

    // Remember the selected tab so it restores when navigating back
    useEffect(() => {
        sessionStorage.setItem('examSeriesActiveTab', activeTab);
    }, [activeTab]);

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
            toast.success("Series created successfully!");
            setNewSeriesName('');
            setNewSeriesType('Internal');
            setIsModalOpen(false);
            setCreateStep(1); // Reset step for UI
            fetchSeries();
            setActiveTab(newSeriesType); // Automatically switch to the created tab type
        } catch (error: any) {
            console.error("Failed to create series", error);
            toast.error(error.response?.data?.message || "Failed to create series");
        } finally {
            setIsSubmitting(false);
        }
    };

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

    const handleSelectSeries = (s: any) => {
        navigate(`/admin/exams/series/${s.ExamSeriesID}`, {
            state: { seriesName: s.SeriesName, examType: s.ExamType }
        });
    };

    // ==========================================
    // UI DERIVED STATE (FILTERING BY TAB & SEARCH)
    // ==========================================
    const tabSeries = series.filter(s => s.ExamType === activeTab);

    const filteredSeries = tabSeries.filter(s =>
        s.SeriesName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalSeriesCount = tabSeries.length;
    const activeCount = tabSeries.filter(s => s.IsActive).length;
    const completedCount = tabSeries.filter(s => !s.IsActive).length;

    // ==========================================
    // RENDER UI
    // ==========================================
    return (
        <div className="min-h-screen bg-[#f8fafc] pb-12 font-sans selection:bg-indigo-100">
            {/* 2. HEADER */}
            <div className="bg-white border-b border-slate-200/60 px-8 py-5 sticky top-0 z-30 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Exam Series</h1>
                        <p className="text-slate-500 text-sm font-medium mt-0.5">Manage examination cycles</p>
                    </div>
                    <Button
                        onPress={() => {
                            setCreateStep(1);
                            setNewSeriesType(activeTab); // sync modal type with active tab
                            setIsModalOpen(true);
                        }}
                        className="bg-indigo-600 text-white font-bold shadow-sm hover:scale-105 active:scale-95 transition-transform px-6 rounded-xl h-11"
                        startContent={<Plus size={18} strokeWidth={3} />}
                    >
                        Create Series
                    </Button>
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto mt-8">

                {/* 1. TOP SEGMENT CONTROL */}
                <div className="flex justify-center mb-10">
                    <div className="relative flex p-1.5 bg-slate-200/50 rounded-2xl shadow-inner">
                        <button
                            onClick={() => setActiveTab('Internal')}
                            className={`relative w-48 py-2.5 text-sm font-bold rounded-xl transition-colors duration-300 z-10 ${activeTab === 'Internal' ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            Internal Exams
                        </button>
                        <button
                            onClick={() => setActiveTab('EndSemester')}
                            className={`relative w-48 py-2.5 text-sm font-bold rounded-xl transition-colors duration-300 z-10 ${activeTab === 'EndSemester' ? 'text-purple-700' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            End Semester Exams
                        </button>

                        <div
                            className={`absolute top-1.5 bottom-1.5 w-48 bg-white rounded-xl shadow-sm transition-transform duration-300 ease-in-out`}
                            style={{ transform: `translateX(${activeTab === 'Internal' ? '0%' : '100%'})` }}
                        />
                    </div>
                </div>

                {/* 3. SUMMARY CARDS (PER TAB) */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <Grid3x3 size={24} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Total Series</p>
                                <h3 className="text-2xl font-extrabold text-slate-900">{totalSeriesCount}</h3>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Active Series</p>
                                <h3 className="text-2xl font-extrabold text-slate-900">{activeCount}</h3>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:scale-110 transition-transform">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Completed Series</p>
                                <h3 className="text-2xl font-extrabold text-slate-900">{completedCount}</h3>
                            </div>
                        </div>
                    </div>
                )}

                {/* Clean Single Search Bar */}
                <div className="mb-8">
                    <div className="flex items-center w-full max-w-sm h-11 rounded-xl border border-slate-200/90 bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden shadow-xs">
                        <div className="w-10 h-full flex items-center justify-center text-slate-400 shrink-0">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search series..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-full pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="pr-3 text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 4. SERIES DISPLAY (CLEAN CARD GRID) */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-44 bg-slate-200/50 rounded-2xl animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredSeries.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200/60 rounded-3xl shadow-sm max-w-3xl mx-auto">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5">
                            {activeTab === 'Internal' ? <Tag className="w-10 h-10 text-indigo-400" /> : <GraduationCap className="w-10 h-10 text-purple-400" />}
                        </div>
                        <h2 className="text-slate-900 font-bold text-xl mb-2">
                            {searchQuery ? "No matching series found" : `No ${activeTab === 'Internal' ? 'Internal' : 'End Semester'} Series`}
                        </h2>
                        <p className="text-slate-500 text-sm mb-8">
                            {searchQuery ? "Try adjusting your search criteria" : "Start by creating your first examination cycle."}
                        </p>
                        {!searchQuery && (
                            <Button
                                onPress={() => {
                                    setCreateStep(1);
                                    setNewSeriesType(activeTab);
                                    setIsModalOpen(true);
                                }}
                                className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 rounded-xl"
                            >
                                <Plus size={18} />
                                Create First Series
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredSeries.map((s) => {
                            const isInternal = s.ExamType === 'Internal';
                            const badgeBg = isInternal ? 'bg-indigo-50/80 text-indigo-700' : 'bg-purple-50/80 text-purple-700';

                            // Fix: Tailwind needs full class names, string interpolation breaks the compiler.
                            const hoverTitleColor = isInternal ? 'group-hover:text-indigo-600' : 'group-hover:text-purple-600';
                            const hoverIconBg = isInternal ? 'group-hover:bg-indigo-600' : 'group-hover:bg-purple-600';
                            const hoverShadow = isInternal ? 'group-hover:shadow-indigo-200' : 'group-hover:shadow-purple-200';

                            return (
                                <Card
                                    key={s.ExamSeriesID}
                                    className="bg-white border text-left border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 rounded-[24px] overflow-hidden group w-full ring-0 outline-none cursor-pointer"
                                >
                                    <div
                                        className="p-7 flex flex-col h-full w-full relative"
                                        onClick={() => handleSelectSeries(s)}
                                    >

                                        {/* HEADER: Type Badge (Left) & Active Status + Quick Actions (Right) */}
                                        <div className="flex justify-between items-center mb-3 w-full min-h-[32px]">
                                            {/* Left: Type Badge */}
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase border border-white/40 shadow-xs ${badgeBg}`}>
                                                {isInternal ? 'Internal' : 'End Sem'}
                                            </span>

                                            {/* Right: Active Status & Quick Actions */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${s.IsActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200/60' : 'bg-slate-100 text-slate-400 border-slate-200/60'}`}>
                                                    {s.IsActive ? 'Active' : 'Completed'}
                                                </span>

                                                {/* Quick Actions */}
                                                <div
                                                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                >
                                                    <Button
                                                        isIconOnly variant="flat" size="sm"
                                                        className="bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 min-w-7 w-7 h-7 rounded-lg"
                                                        onPress={() => {
                                                            setEditSeriesId(s.ExamSeriesID);
                                                            setEditSeriesName(s.SeriesName);
                                                            setEditSeriesType(s.ExamType);
                                                            setEditIsActive(s.IsActive);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    ><Edit2 size={12} strokeWidth={2.5} /></Button>
                                                    <Button
                                                        isIconOnly variant="flat" size="sm" color="danger"
                                                        className="bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-700 min-w-7 w-7 h-7 rounded-lg"
                                                        onPress={() => {
                                                            setDeleteSeriesId(s.ExamSeriesID);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    ><Trash2 size={12} strokeWidth={2.5} /></Button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* BODY: Title, Semesters & Telemetry Badges */}
                                        <div className="mb-4 flex-1">
                                            <h3 className={`text-[19px] font-black text-slate-900 leading-snug mb-2 ${hoverTitleColor} transition-colors line-clamp-2`}>
                                                {s.SeriesName}
                                            </h3>

                                            {/* Semester Row (Always Fully Visible) */}
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-4">
                                                <GraduationCap size={14} className="text-indigo-500 shrink-0" />
                                                <span className="font-semibold text-slate-600">Semesters:</span>
                                                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                                                    {s.SemesterDisplay || 'All Semesters'}
                                                </span>
                                            </div>

                                            {/* Side-by-Side Telemetry Row */}
                                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                {/* Exams Count Badge */}
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-700 font-bold text-xs shrink-0">
                                                    <FileText size={13} className={isInternal ? "text-indigo-500" : "text-purple-500"} />
                                                    <span>{s.ExamsCount || 0} Exams</span>
                                                </div>

                                                {/* Conflict Status Badge */}
                                                {(s.ExamsCount || 0) === 0 ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200/60 shrink-0">
                                                        <ShieldCheck size={13} className="text-slate-400" />
                                                        <span>0 Conflicts</span>
                                                    </div>
                                                ) : (s.ConflictCount || 0) > 0 ? (
                                                    <Tooltip content="Click to view conflict breakdown details" placement="top">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedConflictSeries(s);
                                                                setIsConflictModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-all cursor-pointer shrink-0 shadow-2xs group/btn"
                                                        >
                                                            <AlertTriangle size={13} className="text-amber-600 group-hover/btn:scale-110 transition-transform shrink-0" />
                                                            <span>{s.ConflictCount} {s.ConflictCount === 1 ? 'Conflict' : 'Conflicts'} ({s.ConflictFreeCount || 0} Clean)</span>
                                                        </button>
                                                    </Tooltip>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                                                        <CheckCircle size={13} className="text-emerald-600" />
                                                        <span>0 Conflicts</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* FOOTER: Call to Action */}
                                        <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center w-full">
                                            <span className={`text-xs font-extrabold tracking-wide text-slate-400 uppercase ${hoverTitleColor} transition-colors`}>
                                                Manage Exams
                                            </span>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all bg-slate-50 text-slate-400 ${hoverIconBg} group-hover:text-white group-hover:shadow-md ${hoverShadow}`}>
                                                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>

                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 6. CREATE MODAL (SIMPLIFIED STEP UI) */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => !isSubmitting && setIsModalOpen(false)}
                size="md"
                backdrop="blur"
                placement="center"
                classNames={{
                    base: "bg-white shadow-2xl rounded-3xl",
                    header: "border-b border-slate-100 pb-4 pt-6 px-8",
                    body: "py-6 px-8",
                    footer: "border-t border-slate-100 pt-4 pb-6 px-8",
                    closeButton: "top-5 right-5 text-slate-400 hover:bg-slate-100"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3 text-slate-900">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                            <Sparkles className="text-indigo-600" size={20} />
                        </div>
                        <span className="text-xl font-bold">Create Series</span>
                    </ModalHeader>
                    <ModalBody>
                        {createStep === 1 ? (
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-slate-700">Select Event Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setNewSeriesType('Internal')}
                                        className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${newSeriesType === 'Internal' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <Tag className={`w-8 h-8 mb-3 ${newSeriesType === 'Internal' ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        <span className={`text-sm font-bold ${newSeriesType === 'Internal' ? 'text-indigo-900' : 'text-slate-600'}`}>Internal</span>
                                    </button>
                                    <button
                                        onClick={() => setNewSeriesType('EndSemester')}
                                        className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${newSeriesType === 'EndSemester' ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <GraduationCap className={`w-8 h-8 mb-3 ${newSeriesType === 'EndSemester' ? 'text-purple-600' : 'text-slate-400'}`} />
                                        <span className={`text-sm font-bold ${newSeriesType === 'EndSemester' ? 'text-purple-900' : 'text-slate-600'}`}>End Semester</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <label className="block text-sm font-bold text-slate-700">Enter Series Name</label>
                                <div className="flex items-center w-full h-12 rounded-xl border border-slate-200/90 bg-slate-50 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden shadow-xs">
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder={newSeriesType === 'Internal' ? "e.g., S1 Internal Oct 2025" : "e.g., Fall 2024 Finals"}
                                        value={newSeriesName}
                                        onChange={(e) => setNewSeriesName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newSeriesName) handleCreateSeries();
                                        }}
                                        className="w-full h-full px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                    />
                                </div>
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter className="flex justify-between">
                        {createStep === 1 ? (
                            <>
                                <Button variant="light" className="font-bold text-slate-500" onPress={() => setIsModalOpen(false)}>Cancel</Button>
                                <Button className="bg-slate-900 text-white font-bold rounded-xl" onPress={() => setCreateStep(2)}>Next</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="light" className="font-bold text-slate-500" onPress={() => setCreateStep(1)}>Back</Button>
                                <Button className="bg-indigo-600 text-white font-bold shadow-md hover:bg-indigo-700 rounded-xl" isLoading={isSubmitting} onPress={handleCreateSeries}>Create Series</Button>
                            </>
                        )}
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
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Series Name</label>
                                <div className="flex items-center w-full h-12 rounded-xl border border-slate-200/90 bg-slate-50 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden shadow-xs">
                                    <input
                                        type="text"
                                        value={editSeriesName}
                                        onChange={(e) => setEditSeriesName(e.target.value)}
                                        placeholder="e.g., Spring 2024 Internals"
                                        disabled={isSubmitting}
                                        className="w-full h-full px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0 disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Exam Type</label>
                                <div className="flex gap-3">
                                    <Button
                                        className={`flex-1 h-12 rounded-xl border-2 transition-all font-bold ${editSeriesType === 'Internal'
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                        onPress={() => setEditSeriesType('Internal')}
                                        disabled={isSubmitting}
                                    >
                                        Internal
                                    </Button>
                                    <Button
                                        className={`flex-1 h-12 rounded-xl border-2 transition-all font-bold ${editSeriesType === 'EndSemester'
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200/50'
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                        onPress={() => setEditSeriesType('EndSemester')}
                                        disabled={isSubmitting}
                                    >
                                        End Semester
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                                <div className="flex gap-3">
                                    <Button size="sm" className={`flex-1 h-10 rounded-xl font-bold ${editIsActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`} onPress={() => setEditIsActive(true)}>Active</Button>
                                    <Button size="sm" className={`flex-1 h-10 rounded-xl font-bold ${!editIsActive ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`} onPress={() => setEditIsActive(false)}>Completed</Button>
                                </div>
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
            <Modal 
                isOpen={isDeleteModalOpen} 
                onClose={() => !isSubmitting && setIsDeleteModalOpen(false)} 
                size="sm" 
                backdrop="blur" 
                hideCloseButton={true}
                classNames={{
                    backdrop: "bg-slate-900/40 backdrop-blur-md",
                    base: "bg-white shadow-2xl rounded-[2.5rem] border border-slate-100 p-3",
                }}
            >
                <ModalContent>
                    <ModalBody className="py-8 px-6 text-center space-y-6">
                        <div className="relative">
                            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner relative z-10">
                                <Trash2 size={24} className="animate-pulse" />
                            </div>
                            <div className="absolute inset-0 w-16 h-16 bg-rose-200/40 rounded-full blur-md mx-auto scale-110 -z-0" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Delete Series?</h3>
                            <p className="text-slate-500 text-xs font-semibold leading-relaxed px-4">
                                Are you sure you want to delete this exam series? All timetable schedules and seating allocations belonging to this series will be deleted. Master student records and Academic Setup will <span className="font-extrabold text-emerald-600">remain completely untouched</span>.
                            </p>
                        </div>
                        <div className="flex gap-4 w-full pt-2">
                            <Button 
                                variant="flat" 
                                onPress={() => setIsDeleteModalOpen(false)} 
                                disabled={isSubmitting} 
                                className="flex-1 font-black bg-slate-100 hover:bg-slate-200/80 text-slate-600 rounded-2xl h-12 transition-all"
                            >
                                Cancel
                            </Button>
                            <Button 
                                color="danger" 
                                onPress={handleDeleteSeriesSubmit} 
                                isLoading={isSubmitting} 
                                className="flex-1 font-black bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-2xl h-12 shadow-lg shadow-rose-500/20 active:scale-98 transition-all"
                            >
                                Delete Series
                            </Button>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Conflict Breakdown Modal */}
            <Modal
                isOpen={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                size="2xl"
                backdrop="blur"
                placement="center"
                classNames={{
                    base: "bg-white shadow-2xl rounded-3xl",
                    header: "border-b border-slate-100 pb-4 pt-6 px-8",
                    body: "py-6 px-8 max-h-[70vh] overflow-y-auto",
                    footer: "border-t border-slate-100 pt-4 pb-6 px-8",
                    closeButton: "top-5 right-5 text-slate-400 hover:bg-slate-100"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex items-center gap-3 text-slate-900">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shrink-0">
                            <AlertTriangle className="text-amber-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Schedule Conflict Details</h2>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                {selectedConflictSeries?.SeriesName} — {selectedConflictSeries?.ConflictCount || 0} Conflict{(selectedConflictSeries?.ConflictCount || 0) === 1 ? '' : 's'} Detected
                            </p>
                        </div>
                    </ModalHeader>
                    <ModalBody className="space-y-4">
                        {(!selectedConflictSeries?.ConflictsList || selectedConflictSeries.ConflictsList.length === 0) ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
                                <p className="text-sm font-bold text-slate-700">No Active Conflicts Detected</p>
                                <p className="text-xs text-slate-500 mt-1">All exams in this series are scheduled cleanly without overlapping slots.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedConflictSeries.ConflictsList.map((item: any, idx: number) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                                    {item.conflictType || 'Schedule Overlap'}
                                                </span>
                                                <span className="text-xs font-extrabold text-slate-700">{item.subjectCode}</span>
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                                {item.date} ({item.session})
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900">{item.examName}</h4>
                                        <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white/80 p-2.5 rounded-xl border border-amber-100">
                                            <span className="font-bold text-amber-900">Issue / Cause: </span>
                                            {item.details}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ModalBody>
                    <ModalFooter>
                        <Button
                            variant="flat"
                            className="bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 rounded-xl h-11 px-6"
                            onPress={() => setIsConflictModalOpen(false)}
                        >
                            Close
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default SeriesSelection;
