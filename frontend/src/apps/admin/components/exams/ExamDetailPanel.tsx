
import React from 'react';
import { Button, Chip, Tabs, Tab, Card, CardBody, Progress, Divider } from "@heroui/react";
import { X, Calendar, Clock, MapPin, Users, CheckCircle, AlertCircle, FileText } from "lucide-react";

interface ExamDetailPanelProps {
    exam: any;
    isOpen: boolean;
    onClose: () => void;
}

const ExamDetailPanel: React.FC<ExamDetailPanelProps> = ({ exam, isOpen, onClose }) => {
    if (!isOpen || !exam) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Slide-over Panel */}
            <div className={`fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-xl font-bold text-gray-800">Exam Details</h2>
                                <Chip size="sm" color={exam.Status === 'Scheduled' ? 'primary' : 'default'} variant="flat">
                                    {exam.Status}
                                </Chip>
                            </div>
                            <p className="text-sm text-gray-500">ID: #{exam.ExamID}</p>
                        </div>
                        <Button isIconOnly variant="light" onPress={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </Button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Key Info Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="flex items-center gap-2 mb-2 text-blue-600">
                                    <Calendar size={18} />
                                    <span className="text-xs font-semibold uppercase tracking-wide">Date</span>
                                </div>
                                <p className="text-lg font-bold text-gray-800">{new Date(exam.ExamDate).toLocaleDateString()}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                                <div className="flex items-center gap-2 mb-2 text-indigo-600">
                                    <Clock size={18} />
                                    <span className="text-xs font-semibold uppercase tracking-wide">Time</span>
                                </div>
                                <p className="text-lg font-bold text-gray-800">
                                    {exam.Session === 'FN' ? '10:00 AM - 1:00 PM' : '02:00 PM - 05:00 PM'}
                                </p>
                            </div>
                        </div>

                        {/* Details Tabs */}
                        <div className="w-full flex flex-col">
                            <Tabs aria-label="Exam Options" color="primary" variant="underlined" classNames={{
                                tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                                cursor: "w-full bg-indigo-500",
                                tab: "max-w-fit px-0 h-10",
                                tabContent: "group-data-[selected=true]:text-indigo-600 text-gray-500 font-medium"
                            }}>
                                <Tab key="overview" title="Overview">
                                    <div className="pt-4 space-y-6">

                                        {/* Subject Info */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <FileText size={16} /> Subject Information
                                            </h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Subject Name</span>
                                                    <span className="text-sm font-medium text-gray-800">{exam.ExamName}</span>
                                                    {/* Ideally subject name should be separate from Exam Name, using ExamName for now */}
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Subject Code</span>
                                                    <span className="text-sm font-medium text-gray-800">{exam.Subject?.SubjectCode || 'N/A'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Duration</span>
                                                    <span className="text-sm font-medium text-gray-800">{exam.Duration} Minutes</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Seating Progress */}
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <Users size={16} /> Seat Allocation
                                                </h3>
                                                <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">0% Allocated</span>
                                            </div>
                                            <Progress value={0} color="primary" className="h-2" />
                                            <p className="text-xs text-gray-400 mt-2">0 out of 0 students allocated.</p>
                                        </div>

                                        <Divider />

                                        {/* Actions */}
                                        <div className="flex flex-col gap-3">
                                            <Button variant="flat" color="primary" startContent={<Users size={18} />}>
                                                Allocate Seats Automatically
                                            </Button>
                                            <Button variant="flat" color="secondary" startContent={<CheckCircle size={18} />}>
                                                Publish Exam Schedule
                                            </Button>
                                        </div>
                                    </div>
                                </Tab>

                                <Tab key="rooms" title="Rooms">
                                    <div className="pt-4 flex flex-col items-center justify-center text-center h-40">
                                        <MapPin size={32} className="text-gray-300 mb-2" />
                                        <p className="text-gray-500 text-sm">No rooms allocated yet.</p>
                                        <Button size="sm" variant="light" color="primary" className="mt-2">
                                            Manage Rooms
                                        </Button>
                                    </div>
                                </Tab>

                                <Tab key="invigilators" title="Invigilators">
                                    <div className="pt-4 flex flex-col items-center justify-center text-center h-40">
                                        <Users size={32} className="text-gray-300 mb-2" />
                                        <p className="text-gray-500 text-sm">No invigilators assigned.</p>
                                        <Button size="sm" variant="light" color="primary" className="mt-2">
                                            Assign Staff
                                        </Button>
                                    </div>
                                </Tab>
                            </Tabs>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                        <Button color="danger" variant="light" onPress={onClose}>
                            Close
                        </Button>
                        <Button color="primary" onPress={() => console.log('Edit')}>
                            Edit Details
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ExamDetailPanel;
