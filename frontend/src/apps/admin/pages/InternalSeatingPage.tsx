import React from 'react';
import { Card, CardBody } from "@heroui/react";
import { Clock } from "lucide-react";

const InternalSeatingPage: React.FC = () => {
    return (
        <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-[#f4f6f9]">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Internal Exam Seating Plan</h1>
                <p className="text-slate-500 font-medium mt-1">Manage seating arrangements for internal assessments</p>
            </div>

            <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl">
                <CardBody className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-2">
                        <Clock size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Coming Soon</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Internal Seating System Coming Soon. We are working hard to bring you a dedicated seating arrangement system for internal assessments.
                    </p>
                </CardBody>
            </Card>
        </div>
    );
};

export default InternalSeatingPage;
