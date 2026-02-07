import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardFooter, Button, Chip } from "@heroui/react";
import { BookOpen, Calendar, ChevronRight, Plus, GraduationCap } from "lucide-react";
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

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Exam Series
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Select an exam series to manage timetables and sessions.</p>
                </div>
                <Button
                    color="primary"
                    className="bg-blue-600 font-bold shadow-md shadow-blue-600/20"
                    startContent={<Plus size={16} />}
                    onPress={() => setIsSeriesModalOpen(true)}
                >
                    Manage Series
                </Button>
            </div>

            {/* Series Grid */}
            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading series...</div>
            ) : series.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">No Exam Series Found</p>
                    <p className="text-sm text-gray-400 mt-1">Create a new series to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {series.map((item) => (
                        <Card
                            key={item.ExamSeriesID}
                            isPressable
                            onPress={() => handleSeriesClick(item.ExamSeriesID)}
                            className="border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                        >
                            <CardBody className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                                        <BookOpen size={24} />
                                    </div>
                                    <Chip size="sm" variant="flat" color={item.IsActive ? "success" : "default"}>
                                        {item.IsActive ? "Active" : "Archived"}
                                    </Chip>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                        {item.SeriesName}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                                        {item.Description || "No description provided."}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <Calendar size={14} />
                                    <span>{item.AcademicYear?.YearName || "Unknown Year"}</span>
                                    {item.Semester && (
                                        <>
                                            <span>•</span>
                                            <span>{item.Semester.SemesterName}</span>
                                        </>
                                    )}
                                </div>
                            </CardBody>
                            <CardFooter className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    Manage Timetable
                                </span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                            </CardFooter>
                        </Card>
                    ))}
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
