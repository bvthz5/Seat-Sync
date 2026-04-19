import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Select, SelectItem, Input } from "@heroui/react";
import { ArrowLeft, CalendarDays, Filter, CalendarCheck2, ArrowRight, Search } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';

const ExamDates: React.FC = () => {
    const navigate = useNavigate();
    const { seriesId } = useParams<{ seriesId: string }>();
    const [dates, setDates] = useState<{ date: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<string>('All');
    const [exactDate, setExactDate] = useState<string>('');

    useEffect(() => {
        if (seriesId) fetchDates();
    }, [seriesId]);

    const fetchDates = async () => {
        setLoading(true);
        try {
            const response = await ExamService.getAll({ seriesId });
            const exams = response || [];
            const groups: Record<string, Set<string>> = {};
            exams.forEach((ex: any) => {
                const d = new Date(ex.ExamDate).toISOString().split('T')[0];
                if (!groups[d]) groups[d] = new Set();
                groups[d].add(`${String(ex.ExamName || '').trim()}::${String(ex.Session || '').trim().toUpperCase()}`);
            });
            const entries = Object.keys(groups)
                .sort()
                .map(k => ({ date: k, count: groups[k].size }));
            setDates(entries);
        } catch (e: any) {
            console.error("Failed to load dates", e);
            toast.error("Failed to load date-wise schedule");
        } finally {
            setLoading(false);
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
        return result;
    }, [dates, selectedMonth, exactDate]);

    const getLoadInfo = (count: number) => {
        // Updated colors for a softer, more ultra-premium enterprise appearance
        if (count <= 3) return { 
            bg: 'bg-emerald-50 text-emerald-600', 
            text: 'text-emerald-500', 
            border: 'border-emerald-100', 
            hoverBorder: 'group-hover:border-emerald-300',
            label: 'Light Load' 
        };
        if (count <= 8) return { 
            bg: 'bg-amber-50 text-amber-600', 
            text: 'text-amber-500', 
            border: 'border-amber-100', 
            hoverBorder: 'group-hover:border-amber-300',
            label: 'Moderate Load' 
        };
        return { 
            bg: 'bg-rose-50 text-rose-600', 
            text: 'text-rose-500', 
            border: 'border-rose-100', 
            hoverBorder: 'group-hover:border-rose-300',
            label: 'Heavy Load' 
        };
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-12">
            {/* Header Area */}
            <div className="bg-white border-b border-slate-200/80 px-8 py-8 md:py-10 mb-8 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/3"></div>
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <Button
                            isIconOnly
                            variant="light"
                            className="bg-slate-50 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-2xl shadow-sm border border-slate-100 transition-all w-12 h-12"
                            onPress={() => navigate(`/admin/exams/series/${seriesId}`)}
                        >
                            <ArrowLeft size={20} className="stroke-[2.5]" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                                Date-wise Schedule
                            </h1>
                            <p className="text-slate-500 mt-1.5 font-medium text-sm">Visually monitor your daily exam load and density.</p>
                        </div>
                    </div>
                    
                    {/* UI Only Filters */}
                    {!loading && dates.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
                            <div className="hidden sm:flex items-center justify-center p-2 rounded-xl bg-slate-50 text-slate-400">
                                <Filter size={18} className="stroke-[2.5]" />
                            </div>
                            
                            <div className="flex gap-2 w-full sm:w-auto">
                                <div className="w-full sm:w-44">
                                    <Input
                                        type="date"
                                        aria-label="Filter specific date"
                                        placeholder="Jump to date"
                                        value={exactDate}
                                        onValueChange={(val) => {
                                            setExactDate(val);
                                            if (val) setSelectedMonth('All'); // Reset month if explicit date selected
                                        }}
                                        classNames={{
                                            inputWrapper: "bg-white hover:bg-slate-50 border-slate-200 shadow-none h-10 transition-colors"
                                        }}
                                    />
                                </div>
                                <div className="w-full sm:w-48 text-left">
                                    <Select 
                                        aria-label="Filter by month"
                                        placeholder="Select Month"
                                        classNames={{
                                            trigger: "bg-white hover:bg-slate-50 border-slate-200 shadow-none h-10 min-h-10 transition-colors",
                                            popoverContent: "bg-white border border-slate-100 shadow-xl rounded-xl p-1"
                                        }}
                                        selectedKeys={[selectedMonth]}
                                        onChange={(e) => {
                                            setSelectedMonth(e.target.value);
                                            if (e.target.value !== 'All') setExactDate(''); // Reset date if month selected
                                        }}
                                        disallowEmptySelection
                                    >
                                        <SelectItem
                                            key="All"
                                            textValue="All Months"
                                            classNames={{ base: "rounded-lg data-[hover=true]:bg-slate-50 mb-1", title: "text-sm font-bold text-slate-700" }}
                                        >
                                            All Months
                                        </SelectItem>
                                        {availableMonths.map((m) => (
                                            <SelectItem
                                                key={m}
                                                textValue={m}
                                                classNames={{ base: "rounded-lg data-[hover=true]:bg-slate-50 mb-1", title: "text-sm font-bold text-slate-700" }}
                                            >
                                                {m}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto">
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 animate-pulse">
                         {[...Array(10)].map((_, i) => (
                             <div key={i} className="h-56 bg-slate-200/60 rounded-[28px]"></div>
                         ))}
                    </div>
                ) : dates.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200/60 rounded-[32px] shadow-sm max-w-3xl mx-auto">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 text-indigo-400">
                            <CalendarCheck2 size={32} />
                        </div>
                        <h2 className="text-slate-900 font-extrabold text-2xl mb-2 tracking-tight">No exams scheduled</h2>
                        <p className="text-slate-500 font-medium text-sm">There are no dates allocated in your current series.</p>
                    </div>
                ) : filteredDates.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200/60 rounded-[32px] shadow-sm max-w-3xl mx-auto">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 text-slate-400">
                            <Search size={28} />
                        </div>
                        <h2 className="text-slate-900 font-extrabold text-xl mb-2 tracking-tight">No matching dates</h2>
                        <p className="text-slate-500 font-medium text-sm">Try clearing your date or month filters.</p>
                        <Button 
                            color="primary" variant="flat" size="sm" className="mt-5 font-bold" 
                            onPress={() => { setSelectedMonth('All'); setExactDate(''); }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredDates.map(d => {
                            const load = getLoadInfo(d.count);
                            const dateObj = new Date(d.date);
                            
                            return (
                                <Card
                                    key={d.date}
                                    className={`cursor-pointer bg-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 transition-all duration-400 rounded-[28px] overflow-hidden group w-full ring-0 outline-none border-2 border-transparent ${load.hoverBorder}`}
                                    isPressable
                                    onPress={() => navigate(`/admin/exams/series/${seriesId}/dates/${d.date}`)}
                                >
                                    <div className="flex flex-col h-full w-full">
                                        <div className="p-7">
                                            {/* Top Status & Arrow */}
                                            <div className="flex justify-between items-center mb-6">
                                                <div className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest font-extrabold border bg-opacity-40 shadow-sm ${load.bg} ${load.border}`}>
                                                    {load.label}
                                                </div>
                                                <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 bg-white ${load.text} ${load.hoverBorder}`}>
                                                    <ArrowRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                </div>
                                            </div>
                                            
                                            {/* Epic Typography Date Layout */}
                                            <div className="mb-8 flex items-baseline gap-2">
                                                <h2 className={`text-6xl font-black leading-none tracking-tighter transition-colors duration-400 ${load.text} group-hover:drop-shadow-sm`}>
                                                    {String(dateObj.getDate()).padStart(2, '0')}
                                                </h2>
                                                <div className="flex flex-col mb-1.5">
                                                    <p className="text-slate-400 font-extrabold uppercase tracking-[0.15em] text-xs leading-none mb-1">
                                                        {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                                                    </p>
                                                    <p className="text-slate-800 font-black text-sm leading-none">
                                                        {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Bottom Metrics */}
                                            <div className="pt-5 border-t border-slate-100 flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-[12px] flex flex-shrink-0 items-center justify-center border bg-opacity-30 ${load.bg} ${load.border}`}>
                                                    <CalendarDays size={18} className="stroke-[2.5]" />
                                                </div>
                                                <div className="flex flex-col justify-center translate-y-[2px]">
                                                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold mb-0.5 leading-none shadow-none">Total Exams</p>
                                                    <div className="flex items-baseline gap-1 leading-none shadow-none">
                                                        <p className={`text-lg font-black leading-none ${load.text}`}>{d.count}</p>
                                                        <span className="text-[11px] font-bold text-slate-400 leading-none">Scheduled</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamDates;
