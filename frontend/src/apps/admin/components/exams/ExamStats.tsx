
import React from 'react';
import { Card, CardBody, Chip } from "@heroui/react";
import { Users, AlertTriangle, Home, FileText, TrendingUp, AlertCircle } from "lucide-react";

interface StatsProps {
    stats: {
        total: number;
        completed: number;
        upcoming: number;
        activeToday: number;
    } | null;
}

const ExamStats: React.FC<StatsProps> = ({ stats }) => {
    // Fallback if stats are loading
    const total = stats?.total || 0;

    // Mocking specific metrics that might not be in the basic stats object yet
    const studentsSeated = 3850; // Mock
    const clashes = 12;          // Mock
    const roomUtilization = 85;  // Mock

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* Card 1: Total Exams */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardBody className="p-5">
                    <p className="text-sm text-gray-500 font-medium mb-1">Total Exams</p>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-gray-900">{total}</h2>
                        <Chip size="sm" color="success" variant="flat" className="bg-green-50 text-green-600 font-semibold px-2">
                            <TrendingUp size={12} className="inline mr-1" /> +5%
                        </Chip>
                    </div>
                </CardBody>
            </Card>

            {/* Card 2: Students Seated */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardBody className="p-5">
                    <p className="text-sm text-gray-500 font-medium mb-1">Students Seated</p>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-gray-900">{studentsSeated.toLocaleString()}</h2>
                        <span className="text-xs text-gray-400 font-medium">Total capacity</span>
                    </div>
                </CardBody>
            </Card>

            {/* Card 3: Clashes Detected */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardBody className="p-5">
                    <p className="text-sm text-gray-500 font-medium mb-1">Clashes Detected</p>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-red-600">{clashes}</h2>
                        <Chip size="sm" color="danger" variant="flat" className="bg-red-50 text-red-600 font-bold px-2">
                            Action Required
                        </Chip>
                    </div>
                </CardBody>
            </Card>

            {/* Card 4: Rooms Utilized */}
            <Card className="border border-gray-100 shadow-sm bg-white">
                <CardBody className="p-5">
                    <p className="text-sm text-gray-500 font-medium mb-1">Rooms Utilized</p>
                    <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-gray-900">{roomUtilization}%</h2>
                        <Chip size="sm" color="warning" variant="flat" className="bg-orange-50 text-orange-600 font-semibold px-2">
                            Near Capacity
                        </Chip>
                    </div>
                </CardBody>
            </Card>

        </div>
    );
};

export default ExamStats;
