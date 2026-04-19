import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Button } from "@heroui/react";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { toast } from 'react-hot-toast';
import { ExamService } from '../services/examService';

const ExamDates: React.FC = () => {
    const navigate = useNavigate();
    const { seriesId } = useParams<{ seriesId: string }>();
    const [dates, setDates] = useState<{ date: string; count: number }[]>([]);
    const [loading, setLoading] = useState(true);

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
                // Count unique exam papers, not branch rows
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

    return (
        <div className="min-h-screen bg-[#f4f6f9] pb-12">
            <div className="bg-white border-b border-slate-200/80 px-8 py-8 mb-8 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Button
                            isIconOnly
                            variant="light"
                            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                            onPress={() => navigate(`/admin/exams/series/${seriesId}`)}
                        >
                            <ArrowLeft size={24} />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Date-wise Schedule</h1>
                            <p className="text-slate-500 mt-1">Click a date to view exams happening that day.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto">
                {loading ? (
                    <div className="text-center py-12">Loading...</div>
                ) : dates.length === 0 ? (
                    <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">No scheduled dates found</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {dates.map(d => (
                            <Card
                                key={d.date}
                                className="cursor-pointer"
                                isPressable
                                onPress={() => navigate(`/admin/exams/series/${seriesId}/dates/${d.date}`)}
                            >
                                <CardBody className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                            <h3 className="text-2xl font-bold">{d.count} exam{d.count > 1 ? 's' : ''}</h3>
                                        </div>
                                        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <CalendarDays size={28} />
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamDates;
