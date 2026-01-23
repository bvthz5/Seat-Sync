import React, { useState } from 'react';
import { Card, CardBody, CardHeader, Tabs, Tab } from '@heroui/react';
import { Clock, Users, AlertOctagon, FileText, Search } from 'lucide-react';

export const LiveExamDetails: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState('overview');

    return (
        <Card className="border-none shadow-sm rounded-2xl bg-white w-full">
            <CardHeader className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 gap-4">
                <div>
                    <h3 className="text-lg font-normal text-[#202124]">Current Session: Morning Slot (09:00 - 12:00)</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">ONGOING</span>
                        <span className="text-xs text-[#5f6368]"> • End Semester Exams • 3 Subjects</span>
                    </div>
                </div>

                {/* Time Remaining Widget */}
                <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                    <Clock size={16} className="text-red-500" />
                    <div className="flex flex-col">
                        <span className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Time Remaining</span>
                        <span className="text-sm font-semibold text-red-700 leading-none">01:24:10</span>
                    </div>
                </div>
            </CardHeader>
            <CardBody className="p-0">
                <Tabs
                    aria-label="Exam Details"
                    color="primary"
                    variant="underlined"
                    classNames={{
                        tabList: "gap-6 w-full relative rounded-none p-0 border-b border-gray-100 px-6",
                        cursor: "w-full bg-blue-600",
                        tab: "max-w-fit px-0 h-12",
                        tabContent: "group-data-[selected=true]:text-blue-600 font-medium"
                    }}
                    selectedKey={selectedTab}
                    onSelectionChange={(key) => setSelectedTab(key as string)}
                >
                    {/* OVERVIEW TAB */}
                    <Tab key="overview" title="Overview">
                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Stat 1 */}
                            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">Subjects</p>
                                    <p className="text-lg font-semibold text-[#202124] mt-1">CS302, ME201, EC304</p>
                                    <p className="text-xs text-[#5f6368] mt-1">Computer Networks, Thermodynamics...</p>
                                </div>
                            </div>
                            {/* Stat 2 */}
                            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-purple-600">
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">Attendance</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <p className="text-lg font-semibold text-[#202124]">98.2%</p>
                                        <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded font-medium">12 Absent</span>
                                    </div>
                                    <div className="w-full h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                        <div className="h-full bg-purple-600 w-[98.2%]"></div>
                                    </div>
                                </div>
                            </div>
                            {/* Stat 3 */}
                            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex items-start gap-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-orange-600">
                                    <AlertOctagon size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-[#5f6368] font-medium uppercase tracking-wider">Malpractice</p>
                                    <div className="flex items-baseline gap-2 mt-1">
                                        <p className="text-lg font-semibold text-[#202124]">0 Reported</p>
                                    </div>
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        All clear so far
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Tab>

                    {/* STUDENTS TAB */}
                    <Tab key="students" title="Students List">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div className="relative w-64">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Find student by ID..."
                                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <button className="text-sm font-medium text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors">
                                    Download Attendance Sheet
                                </button>
                            </div>
                            <div className="border border-gray-100 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-[#f8f9fa] border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 font-medium text-[#5f6368]">Student ID</th>
                                            <th className="px-6 py-3 font-medium text-[#5f6368]">Name</th>
                                            <th className="px-6 py-3 font-medium text-[#5f6368]">Seat No</th>
                                            <th className="px-6 py-3 font-medium text-[#5f6368]">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">CS21B1014</td>
                                            <td className="px-6 py-3">Rahul Kumar</td>
                                            <td className="px-6 py-3 text-gray-500">A-102</td>
                                            <td className="px-6 py-3"><span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full font-medium">Present</span></td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">CS21B1015</td>
                                            <td className="px-6 py-3">Sarah Wilson</td>
                                            <td className="px-6 py-3 text-gray-500">A-103</td>
                                            <td className="px-6 py-3"><span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full font-medium">Present</span></td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">CS21B1018</td>
                                            <td className="px-6 py-3">Mike Chen</td>
                                            <td className="px-6 py-3 text-gray-500">A-105</td>
                                            <td className="px-6 py-3"><span className="text-red-600 text-xs bg-red-50 px-2 py-1 rounded-full font-medium">Absent</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Tab>

                    {/* INVIGILATORS TAB */}
                    <Tab key="invigilators" title="Invigilators">
                        <div className="p-6 text-center text-gray-500 py-12">
                            Invigilator assignment details would go here.
                        </div>
                    </Tab>
                </Tabs>
            </CardBody>
        </Card>
    );
};
