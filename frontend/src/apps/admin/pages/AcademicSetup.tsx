import React, { useEffect, useState } from 'react';
import { Tabs, Tab, Card, CardBody, Select, SelectItem } from '@heroui/react';
import { BookOpen, Calendar, Building2, Layers, Book, Bookmark, Clock, ChevronDown } from 'lucide-react';
import { AcademicYears } from '../components/academic/AcademicYears';
import { Departments } from '../components/academic/Departments';
import { Programs } from '../components/academic/Programs';
import { Semesters } from '../components/academic/Semesters';
import { Subjects } from '../components/academic/Subjects';
import { academicService } from '../services/academicService';
import { AcademicYear } from '../types/academic';
import { toast } from '../../../utils/toast';

const AcademicSetup: React.FC = () => {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [selectedTab, setSelectedTab] = useState("years");

    const fetchYears = async () => {
        try {
            const res = await academicService.getYears();
            if (res.data?.success) {
                const yearList = res.data.data;
                setYears(yearList);
                // Auto-select current year if none selected
                if (!selectedYearId) {
                    const current = yearList.find((y: AcademicYear) => y.IsCurrent);
                    if (current) setSelectedYearId(current.AcademicYearID.toString());
                    else if (yearList.length > 0) setSelectedYearId(yearList[0].AcademicYearID.toString());
                }
            }
        } catch (error) {
            console.error("Failed to load years", error);
        }
    };

    useEffect(() => {
        fetchYears();
    }, []);

    const handleYearChange = () => {
        fetchYears();
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Header Section */}
            <div className="pt-8 px-8 max-w-[1920px] mx-auto flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-xl text-white shadow-lg shadow-blue-500/20">
                        <BookOpen size={28} strokeWidth={2} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Academic Setup</h1>
                        <p className="text-slate-500 font-medium mt-1">Manage hierarchical academic data structure</p>
                    </div>
                </div>

                {/* Global Context Selector */}
                <div className="w-full md:w-72">
                    <label className="block text-sm font-semibold text-slate-600 mb-1.5">Working Academic Year</label>
                    <Select
                        aria-label="Working Academic Year"
                        placeholder="Select Year"
                        selectedKeys={selectedYearId ? [selectedYearId] : []}
                        onChange={(e) => setSelectedYearId(e.target.value)}
                        variant="bordered"
                        startContent={<Calendar size={18} className="text-slate-400" />}
                        selectorIcon={<ChevronDown size={18} className="text-slate-500" />}
                        classNames={{
                            trigger: "bg-white border-slate-200 shadow-sm min-h-[48px]",
                            value: "text-slate-700 font-medium",
                        }}
                    >
                        {years.map((year) => (
                            <SelectItem key={year.AcademicYearID} textValue={year.YearName}>
                                {year.YearName} {year.IsCurrent ? '(Current)' : ''}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-8 max-w-[1920px] mx-auto">
                <div className="sticky top-0 z-40 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/60 mb-6">
                    <Tabs
                        aria-label="Academic Navigation"
                        color="primary"
                        variant="underlined"
                        classNames={{
                            tabList: "gap-8 relative rounded-none p-0",
                            cursor: "w-full bg-blue-600 h-[2px]",
                            tab: "max-w-fit px-0 h-12 data-[hover=true]:opacity-80",
                            tabContent: "group-data-[selected=true]:text-blue-600 group-data-[selected=true]:font-bold font-medium text-slate-500 text-base transition-colors"
                        }}
                        selectedKey={selectedTab}
                        onSelectionChange={(key) => setSelectedTab(key.toString())}
                    >
                        <Tab
                            key="years"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <Calendar size={18} />
                                    <span>Academic Years</span>
                                </div>
                            }
                        />
                        <Tab
                            key="departments"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <Building2 size={18} />
                                    <span>Departments</span>
                                </div>
                            }
                        />
                        <Tab
                            key="programs"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <Layers size={18} />
                                    <span>Programs</span>
                                </div>
                            }
                        />
                        <Tab
                            key="semesters"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <Clock size={18} /> {/* Using Clock for Semester/Time logic */}
                                    <span>Semesters</span>
                                </div>
                            }
                        />
                        <Tab
                            key="subjects"
                            title={
                                <div className="flex items-center space-x-2 py-1">
                                    <Book size={18} />
                                    <span>Subjects</span>
                                </div>
                            }
                        />
                    </Tabs>
                </div>

                {/* Content Area */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="border-none shadow-none bg-transparent">
                        <CardBody className="p-0">
                            {selectedTab === "years" && (
                                <AcademicYears onYearChange={handleYearChange} />
                            )}
                            {selectedTab === "departments" && (
                                <Departments academicYearId={selectedYearId ? Number(selectedYearId) : null} />
                            )}
                            {selectedTab === "programs" && (
                                <Programs academicYearId={selectedYearId ? Number(selectedYearId) : null} />
                            )}
                            {selectedTab === "semesters" && (
                                <Semesters academicYearId={selectedYearId ? Number(selectedYearId) : null} />
                            )}
                            {selectedTab === "subjects" && (
                                <Subjects academicYearId={selectedYearId ? Number(selectedYearId) : null} />
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default AcademicSetup;
