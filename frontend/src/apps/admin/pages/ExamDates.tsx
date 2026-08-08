import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Select, SelectItem, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { ArrowLeft, Filter, CalendarCheck, CalendarDays, ArrowRight, Search, X, Trash2, AlertTriangle, Upload } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';
import { SeriesService } from '../services/seriesService';
import BulkEligibleImportModal from '../components/exams/BulkEligibleImportModal';

const ExamDates: React.FC = () => {
    const navigate = useNavigate();
    const { seriesId } = useParams<{ seriesId: string }>();
    const [dates, setDates] = useState<{ date: string; count: number; hasRegistrations: boolean; subjects: { name: string; code: string }[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<string>('All');
    const [exactDate, setExactDate] = useState<string>('');
    const [subjectSearch, setSubjectSearch] = useState<string>('');
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

    useEffect(() => {
        if (seriesId) {
            checkSeriesType();
            fetchDates();
        }
    }, [seriesId]);

    const checkSeriesType = async () => {
        try {
            const response = await SeriesService.getAll();
            const series = Array.isArray(response) ? response : response.data || [];
            const found = series.find((s: any) => String(s.ExamSeriesID) === seriesId);
            if (found && found.ExamType === 'Internal') {
                toast.error("Date View is not available for Internal Exams");
                navigate(`/admin/exams/series/${seriesId}`);
            }
        } catch (error) {
            console.error("Failed to check series type", error);
        }
    };

    const fetchDates = async () => {
        setLoading(true);
        try {
            const response = await ExamService.getAll({ seriesId });
            const exams = response || [];
            const groups: Record<string, { sessions: Set<string>; subjects: Map<string, string>; hasReg: boolean }> = {};
            exams.forEach((ex: any) => {
                const d = new Date(ex.ExamDate).toISOString().split('T')[0];
                if (!groups[d]) groups[d] = { sessions: new Set(), subjects: new Map(), hasReg: false };
                groups[d].sessions.add(`${String(ex.ExamName || '').trim()}::${String(ex.Session || '').trim().toUpperCase()}`);
                const code = String(ex.SubjectCode || ex.ExamCode || '').trim();
                const name = String(ex.ExamName || ex.SubjectName || '').trim();
                if (name) groups[d].subjects.set(code || name, name);
                if (ex.registrationCount > 0) groups[d].hasReg = true;
            });
            const entries = Object.keys(groups)
                .sort()
                .map(k => ({
                    date: k,
                    count: groups[k].sessions.size,
                    hasRegistrations: groups[k].hasReg,
                    subjects: Array.from(groups[k].subjects.entries()).map(([code, name]) => ({ code, name }))
                }));
            setDates(entries);
        } catch (e: any) {
            console.error("Failed to load dates", e);
            toast.error("Failed to load date-wise schedule");
        } finally {
            setLoading(false);
        }
    };

    const handleClearEligibility = async () => {
        setIsClearing(true);
        try {
            await ExamService.clearEligibility(Number(seriesId));
            toast.success('Successfully cleared all eligibility data');
            fetchDates(); // Refresh to update any necessary state
            setIsClearConfirmOpen(false);
        } catch (error: any) {
            console.error('Failed to clear eligibility', error);
            toast.error(error.response?.data?.message || 'Failed to clear eligibility data');
        } finally {
            setIsClearing(false);
        }
    };

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        dates.forEach(d => {
            const dateObj = new Date(d.date);
            const m = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            months.add(m);
        });
        return Array.from(months).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }, [dates]);

    const filteredDates = useMemo(() => {
        let result = dates;
        if (selectedMonth !== 'All') {
            result = result.filter(d => {
                const m = new Date(d.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return m === selectedMonth;
            });
        }
        if (exactDate) {
            result = result.filter(d => d.date === exactDate);
        }
        if (subjectSearch.trim()) {
            const q = subjectSearch.trim().toLowerCase();
            result = result.filter(d =>
                d.subjects.some(s =>
                    s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
                )
            );
        }
        return result;
    }, [dates, selectedMonth, exactDate, subjectSearch]);

    const getLoadInfo = (count: number) => {
        // Updated colors for a softer, more ultra-premium enterprise appearance
        if (count <= 3) return { 
            bg: 'bg-emerald-50 text-emerald-600', 
            text: 'text-emerald-500', 
            border: 'border-emerald-100', 
            hoverBorder: 'group-hover:border-emerald-300'
        };
        if (count <= 8) return { 
            bg: 'bg-amber-50 text-amber-600', 
            text: 'text-amber-500', 
            border: 'border-amber-100', 
            hoverBorder: 'group-hover:border-amber-300'
        };
        return { 
            bg: 'bg-rose-50 text-rose-600', 
            text: 'text-rose-500', 
            border: 'border-rose-100', 
            hoverBorder: 'group-hover:border-rose-300'
        };
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-16">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200/80 px-8 py-8 mb-8 shadow-xs relative overflow-hidden">
                <div className="max-w-[1600px] mx-auto space-y-6 relative z-10">
                    {/* Top Row: Title + Action Buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Button
                                isIconOnly
                                variant="light"
                                className="bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl shadow-xs border border-slate-200/80 transition-all w-11 h-11 shrink-0"
                                onPress={() => navigate(`/admin/exams/series/${seriesId}`)}
                            >
                                <ArrowLeft size={18} className="stroke-[2.5]" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                                    Date-wise Schedule
                                </h1>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">Visually monitor daily exam load, dates, and session density.</p>
                            </div>
                        </div>

                        {/* Top Right Action Buttons */}
                        <div className="flex items-center gap-3 shrink-0">
                            <Button
                                className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/80 font-bold rounded-xl h-10 px-4 text-xs transition-all"
                                startContent={<Trash2 size={15} className="stroke-[2.5]" />}
                                onPress={() => setIsClearConfirmOpen(true)}
                            >
                                Clear Eligibility
                            </Button>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-5 text-xs shadow-md shadow-indigo-200 transition-all"
                                startContent={<Upload size={15} className="stroke-[2.5]" />}
                                onPress={() => setIsBulkImportOpen(true)}
                            >
                                Bulk Import
                            </Button>
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    {!loading && dates.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                            <div className="flex flex-wrap items-center gap-3 flex-1">
                                {/* Search Input */}
                                <div className="flex items-center flex-1 min-w-[240px] h-10 rounded-xl border border-slate-200/90 bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                    <div className="w-9 h-full flex items-center justify-center text-slate-400 shrink-0">
                                        <Search size={15} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search course name or code..."
                                        value={subjectSearch}
                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                        className="w-full h-full pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                    />
                                    {subjectSearch && (
                                        <button onClick={() => setSubjectSearch('')} className="p-2 text-slate-400 hover:text-slate-600">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Jump to Date */}
                                <div className="flex items-center w-full sm:w-48 h-10 rounded-xl border border-slate-200/90 bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                    <div className="w-9 h-full flex items-center justify-center text-slate-400 shrink-0">
                                        <CalendarDays size={15} />
                                    </div>
                                    <input
                                        type="date"
                                        value={exactDate}
                                        onChange={(e) => {
                                            setExactDate(e.target.value);
                                            if (e.target.value) setSelectedMonth('All');
                                        }}
                                        className="w-full h-full pr-2 text-xs font-semibold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0 cursor-pointer"
                                    />
                                </div>

                                {/* Select Month */}
                                <div className="relative flex items-center w-full sm:w-48 h-10 rounded-xl border border-slate-200/90 bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => {
                                            setSelectedMonth(e.target.value);
                                            if (e.target.value !== 'All') setExactDate('');
                                        }}
                                        className="w-full h-full px-3.5 pr-8 text-xs font-semibold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0 cursor-pointer appearance-none"
                                    >
                                        <option value="All">All Months</option>
                                        {availableMonths.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <Filter size={14} className="absolute right-3 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Clear All Filters Button */}
                            {(subjectSearch.trim() || exactDate || selectedMonth !== 'All') && (
                                <button
                                    onClick={() => { setSubjectSearch(''); setExactDate(''); setSelectedMonth('All'); }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-all whitespace-nowrap"
                                >
                                    <X size={13} className="stroke-[3]" />
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Date Grid Cards */}
            <div className="px-8 max-w-[1600px] mx-auto">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-pulse">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="h-48 bg-slate-200/60 rounded-3xl"></div>
                        ))}
                    </div>
                ) : dates.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200/80 rounded-3xl shadow-xs max-w-xl mx-auto p-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4 text-indigo-500">
                            <CalendarCheck size={28} />
                        </div>
                        <h2 className="text-slate-900 font-extrabold text-xl mb-1 tracking-tight">No exams scheduled</h2>
                        <p className="text-slate-500 font-medium text-xs">There are no dates allocated in your current series.</p>
                    </div>
                ) : filteredDates.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200/80 rounded-3xl shadow-xs max-w-xl mx-auto p-8">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <Search size={26} />
                        </div>
                        <h2 className="text-slate-900 font-extrabold text-lg mb-1 tracking-tight">No matching dates found</h2>
                        <p className="text-slate-500 font-medium text-xs mb-4">Try adjusting your search criteria or month filter.</p>
                        <Button 
                            color="primary" variant="flat" size="sm" className="font-bold rounded-xl" 
                            onPress={() => { setSelectedMonth('All'); setExactDate(''); setSubjectSearch(''); }}
                        >
                            Reset Filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                        {filteredDates.map(d => {
                            const load = getLoadInfo(d.count);
                            const dateObj = new Date(d.date);
                            
                            return (
                                <div
                                    key={d.date}
                                    onClick={() => navigate(`/admin/exams/series/${seriesId}/dates/${d.date}`)}
                                    className={`cursor-pointer bg-white border border-slate-200/90 hover:border-indigo-400 shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 rounded-3xl p-6 group flex flex-col justify-between relative overflow-hidden`}
                                >
                                    {/* Top Info */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            {d.hasRegistrations ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-black tracking-wider uppercase">
                                                    <CalendarCheck size={12} className="stroke-[2.5]" /> Registered
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-extrabold tracking-wider uppercase">
                                                    Scheduled
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all">
                                            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </div>

                                    {/* Main Date Display */}
                                    <div className="flex items-baseline gap-3 my-2">
                                        <span className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                                            {String(dateObj.getDate()).padStart(2, '0')}
                                        </span>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black uppercase text-indigo-600 tracking-wider leading-tight">
                                                {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                                            </span>
                                            <span className="text-xs font-bold text-slate-700 leading-tight">
                                                {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bottom Metrics Bar */}
                                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${load.bg} ${load.border}`}>
                                                <CalendarDays size={15} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Exams</span>
                                                <span className="text-xs font-extrabold text-slate-800">
                                                    {d.count} {d.count === 1 ? 'Exam' : 'Exams'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <Modal 
                isOpen={isClearConfirmOpen} 
                onClose={() => setIsClearConfirmOpen(false)} 
                size="md"
                backdrop="blur"
                classNames={{
                    base: "bg-white rounded-[24px] shadow-2xl border border-slate-100",
                    backdrop: "bg-slate-900/30 backdrop-blur-md"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 px-6 pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 shrink-0">
                                <AlertTriangle size={20} className="stroke-[2.5]" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Clear Eligibility Data</h2>
                        </div>
                    </ModalHeader>
                    <ModalBody className="px-6 py-4">
                        <p className="text-slate-600 font-medium leading-relaxed">
                            Are you sure you want to completely clear <strong className="text-red-500">ALL imported eligibility lists</strong> for this series?
                        </p>
                        <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                            This action is permanent. All mapped students will be wiped from these exams.
                        </p>
                    </ModalBody>
                    <ModalFooter className="px-6 pb-6 pt-2">
                        <Button variant="light" onPress={() => setIsClearConfirmOpen(false)} className="font-bold text-slate-500">
                            Cancel
                        </Button>
                        <Button 
                            color="danger" 
                            onPress={handleClearEligibility} 
                            isLoading={isClearing} 
                            className="font-bold shadow-md shadow-red-200"
                        >
                            Yes, Clear All
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <BulkEligibleImportModal
                isOpen={isBulkImportOpen}
                onClose={() => setIsBulkImportOpen(false)}
                onSuccess={fetchDates}
            />
        </div>
    );
};

export default ExamDates;
