
import React, { useState, useEffect } from 'react';
import { Button, Input, Select, SelectItem, ButtonGroup } from "@heroui/react";
import { Plus, Search, Download, RefreshCw, Bell, LayoutGrid, List as ListIcon, FileSpreadsheet, BookOpen } from "lucide-react";
import { toast } from 'react-hot-toast';

import ExamStats from '../components/exams/ExamStats';
import ExamListTable from '../components/exams/ExamListTable';
import ExamCalendar from '../components/exams/ExamCalendar';
import CreateExamModal from '../components/exams/CreateExamModal';
import ExamImportModal from '../components/exams/ExamImportModal';
import ExamSeriesManagementModal from '../components/exams/ExamSeriesManagementModal';
import ExamDetailPanel from '../components/exams/ExamDetailPanel';
import { ExamService } from '../services/examService';
import { SeriesService } from '../services/seriesService';
import { academicService } from '../services/academicService';

const Exams: React.FC = () => {
    // State
    const [stats, setStats] = useState<{ total: number; completed: number; upcoming: number; activeToday: number; } | null>(null);
    const [exams, setExams] = useState([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [series, setSeries] = useState<any[]>([]);

    // Panel State
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [seriesFilter, setSeriesFilter] = useState('All');
    const [sessionFilter, setSessionFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        fetchDepartments();
        fetchSeries();
        fetchData();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter, deptFilter, seriesFilter]);

    const fetchDepartments = async () => {
        try {
            const response = await academicService.getDepartments();
            setDepartments(response.data);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    };

    const fetchSeries = async () => {
        try {
            const response = await SeriesService.getAll();
            if (response.success) setSeries(response.data);
        } catch (error) {
            console.error("Failed to fetch series", error);
        }
    };

    // ...



    const fetchData = async () => {
        setLoading(true);
        try {
            const apiStatus = statusFilter === 'All' ? '' : statusFilter;
            const apiSeries = seriesFilter === 'All' ? '' : seriesFilter;
            const [statsData, examsData] = await Promise.all([
                ExamService.getStats({ seriesId: apiSeries }),
                ExamService.getAll({
                    search: searchQuery,
                    status: apiStatus,
                    department: deptFilter,
                    seriesId: apiSeries
                })
            ]);
            setStats(statsData);
            setExams(examsData);
        } catch (error) {
            console.error("Failed to fetch exam data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this exam?")) return;
        try {
            await ExamService.delete(id);
            toast.success("Exam deleted successfully");
            fetchData();
            if (selectedExam?.ExamID === id) setIsPanelOpen(false);
        } catch (error) {
            toast.error("Failed to delete exam");
        }
    };

    const handleAllocate = (id: number) => {
        toast("Running allocation algorithm...", { icon: '⚙️' });
    };

    const handleEdit = (exam: any) => {
        toast("Edit detailed configuration", { icon: '✏️' });
    };

    const handleRowClick = (exam: any) => {
        setSelectedExam(exam);
        setIsPanelOpen(true);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen">

            {/* Top Bar (SeatSync Header) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Exam Schedule {seriesFilter !== 'All' ? `: ${series.find(s => String(s.ExamSeriesID) === seriesFilter)?.SeriesName}` : ''}
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage sessions, group by series, and resolve automated audit conflicts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="flat"
                        color="secondary"
                        className="bg-purple-50 text-purple-700 font-medium border border-purple-200"
                        startContent={<FileSpreadsheet size={18} />}
                        onPress={() => setIsImportModalOpen(true)}
                    >
                        Import Timetable
                    </Button>
                    <Button
                        variant="flat"
                        color="primary"
                        className="bg-blue-50 text-blue-700 font-medium border border-blue-200"
                        startContent={<BookOpen size={18} />}
                        onPress={() => setIsSeriesModalOpen(true)}
                    >
                        Manage Series
                    </Button>
                    <Button
                        color="primary"
                        className="bg-blue-600 font-bold shadow-md shadow-blue-600/20"
                        startContent={<Plus size={16} />}
                        onPress={() => setIsCreateModalOpen(true)}
                    >
                        Manual Create
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <ExamStats stats={stats} />

            {/* Filter Bar & Toggle */}
            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-3">
                <div className="flex items-center flex-1 gap-2 w-full lg:w-auto p-1">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="List View"
                        >
                            <ListIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Calendar View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="w-full lg:w-72">
                        <Input
                            id="search-exams"
                            name="search-exams"
                            placeholder="Search subject or code..."
                            startContent={<Search size={18} className="text-gray-400" />}
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            size="sm"
                            classNames={{
                                inputWrapper: "bg-gray-50 group-data-[focus=true]:bg-white border border-transparent group-data-[focus=true]:border-blue-500 transition-all rounded-lg"
                            }}
                        />
                    </div>

                    <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                    {/* Series Select */}
                    <div className="w-full lg:w-56">
                        <Select
                            placeholder="All Exam Series"
                            size="sm"
                            variant="bordered"
                            classNames={{ trigger: "bg-blue-50/50 border-blue-100" }}
                            selectedKeys={[seriesFilter]}
                            onSelectionChange={(keys) => setSeriesFilter(String(Array.from(keys)[0]))}
                            startContent={<BookOpen size={16} className="text-blue-500" />}
                            aria-label="Filter by Series"
                            items={[
                                { ExamSeriesID: 'All', SeriesName: 'All Exam Series' },
                                ...series
                            ]}
                        >
                            {(item: any) => (
                                <SelectItem key={String(item.ExamSeriesID)} textValue={item.SeriesName}>
                                    {item.SeriesName}
                                </SelectItem>
                            )}
                        </Select>
                    </div>

                    <div className="h-8 w-px bg-gray-200 mx-2 hidden lg:block"></div>

                    {/* Dropdowns */}
                    <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                        <Select
                            id="filter-department"
                            name="filter-department"
                            placeholder="Department: All"
                            size="sm"
                            className="w-40"
                            variant="bordered"
                            classNames={{ trigger: "bg-gray-50 border-gray-200" }}
                            selectedKeys={[deptFilter]}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            selectorIcon={<span />}
                            aria-label="Filter by Department"
                        >
                            {[
                                { DepartmentID: 'All', DepartmentName: 'Department: All' },
                                ...departments
                            ].map((dept) => (
                                <SelectItem key={dept.DepartmentID.toString()}>
                                    {dept.DepartmentName}
                                </SelectItem>
                            ))}
                        </Select>

                        <Select
                            id="filter-session"
                            name="filter-session"
                            placeholder="Session"
                            size="sm"
                            className="w-36"
                            variant="bordered"
                            classNames={{ trigger: "bg-gray-50 border-gray-200" }}
                            selectedKeys={[sessionFilter]}
                            onChange={(e) => setSessionFilter(e.target.value)}
                            selectorIcon={<span />}
                            aria-label="Filter by Session"
                        >
                            <SelectItem key="All">Session: All</SelectItem>
                            <SelectItem key="Morning">Morning</SelectItem>
                            <SelectItem key="Afternoon">Afternoon</SelectItem>
                        </Select>

                        <Select
                            id="filter-status"
                            name="filter-status"
                            placeholder="Status"
                            size="sm"
                            className="w-36"
                            variant="bordered"
                            classNames={{ trigger: "bg-gray-50 border-gray-200" }}
                            selectedKeys={[statusFilter]}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            selectorIcon={<span />}
                            aria-label="Filter by Status"
                        >
                            <SelectItem key="All">Audit Status: All</SelectItem>
                            <SelectItem key="Scheduled">Clean</SelectItem>
                            <SelectItem key="Conflict">Conflict</SelectItem>
                        </Select>
                    </div>
                </div>

                <div className="px-4 text-xs font-semibold text-gray-400 hidden lg:block">
                    Showing {exams.length} exams
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'list' ? (
                <ExamListTable
                    exams={exams}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAllocate={handleAllocate}
                    onRowClick={handleRowClick}
                />
            ) : (
                <div className="border border-gray-200 rounded-xl shadow-sm bg-white min-h-[600px]">
                    <ExamCalendar
                        exams={exams}
                        onExamClick={handleRowClick}
                    />
                </div>
            )}

            {/* Create Modal */}
            <CreateExamModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchData}
            />

            {/* Import Modal */}
            <ExamImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={fetchData}
            />

            {/* Series Management Modal */}
            <ExamSeriesManagementModal
                isOpen={isSeriesModalOpen}
                onClose={() => setIsSeriesModalOpen(false)}
                onSuccess={() => {
                    fetchSeries();
                    fetchData();
                }}
            />

            {/* Detail Drawer */}
            <ExamDetailPanel
                isOpen={isPanelOpen}
                exam={selectedExam}
                onClose={() => setIsPanelOpen(false)}
            />

        </div>
    );
};

export default Exams;
