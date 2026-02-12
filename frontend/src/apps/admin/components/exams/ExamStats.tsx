
import React from 'react';
import { Card, CardBody, Chip } from "@heroui/react";
import { FileText, CheckCircle, CalendarClock, Zap } from "lucide-react";

interface StatsProps {
    stats: {
        total: number;
        completed: number;
        upcoming: number;
        activeToday: number;
    } | null;
}

const ExamStats: React.FC<StatsProps> = ({ stats }) => {
    const total = stats?.total || 0;
    const completed = stats?.completed || 0;
    const upcoming = stats?.upcoming || 0;
    const activeToday = stats?.activeToday || 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* Card 1: Total Exams */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardBody className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <FileText size={18} className="text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Total Exams</p>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">{total}</h2>
                </CardBody>
            </Card>

            {/* Card 2: Completed */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardBody className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
                            <CheckCircle size={18} className="text-green-600" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Completed</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-gray-900">{completed}</h2>
                        {total > 0 && (
                            <Chip size="sm" variant="flat" className="bg-green-50 text-green-600 font-semibold px-2">
                                {Math.round((completed / total) * 100)}%
                            </Chip>
                        )}
                    </div>
                </CardBody>
            </Card>

            {/* Card 3: Upcoming */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardBody className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <CalendarClock size={18} className="text-indigo-600" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Upcoming</p>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900">{upcoming}</h2>
                </CardBody>
            </Card>

            {/* Card 4: Active Today */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardBody className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Zap size={18} className="text-amber-600" />
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Active Today</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-gray-900">{activeToday}</h2>
                        {activeToday > 0 && (
                            <Chip size="sm" variant="flat" className="bg-amber-50 text-amber-600 font-semibold px-2">
                                Live
                            </Chip>
                        )}
                    </div>
                </CardBody>
            </Card>

        </div>
    );
};

export default ExamStats;
