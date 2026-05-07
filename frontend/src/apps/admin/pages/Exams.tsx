import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Plus, Search, FileSpreadsheet, List as ListIcon, LayoutGrid, ArrowLeft, Building2, Layers, Sun, Moon, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from 'react-hot-toast';

import ExamStats from '../components/exams/ExamStats';
import ExamListTable from '../components/exams/ExamListTable';
import ExamCalendar from '../components/exams/ExamCalendar';
import CreateExamModal from '../components/exams/CreateExamModal';
import EditExamModal from '../components/exams/EditExamModal';
import ExamImportModal from '../components/exams/ExamImportModal';
import { InternalExamImportModal } from '../components/internal-structure/InternalExamImportModal';
import ExamDetailPanel from '../components/exams/ExamDetailPanel';
import ConfirmationModal from '../components/ConfirmationModal';
import { ExamService } from '../services/examService';
import { SeriesService } from '../services/seriesService';
import { academicService } from '../services/academicService';

const Exams: React.FC = () => {
    const { seriesId } = useParams<{ seriesId: string }>();
    const navigate = useNavigate();

    // State
    const [stats, setStats] = useState<{ total: number; completed: number; upcoming: number; activeToday: number; } | null>(null);
    const [exams, setExams] = useState([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [seriesName, setSeriesName] = useState<string>('');
    const [examType, setExamType] = useState<'Internal' | 'EndSemester'>('EndSemester');
    const [deleteExamId, setDeleteExamId] = useState<number | null>(null);

    // Panel State
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [sessionFilter, setSessionFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState('');

    // FRONTEND GROUPING / UI FILTERING ONLY
    // Since backend does not natively support session and exact date filtering in some APIs, we filter visually here.
    const uiFilteredExams = React.useMemo(() => {
        return exams.filter((exam: any) => {
            if (sessionFilter !== 'All' && exam.Session !== sessionFilter) return false;
            // HTML Date input returns YYYY-MM-DD. ExamDate is usually a full ISO string from backend.
            if (dateFilter) {
                const examDateStr = new Date(exam.ExamDate).toISOString().split('T')[0];
                if (examDateStr !== dateFilter) return false;
            }
            return true;
        });
    }, [exams, sessionFilter, dateFilter]);

    useEffect(() => {
        fetchDepartments();
        if (seriesId) {
            fetchSeriesDetails();
        }
        fetchData();
    }, [seriesId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter, deptFilter, seriesId]);

    const fetchDepartments = async () => {
        try {
            const response = await academicService.getDepartments();
            setDepartments(response.data);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    };

    const fetchSeriesDetails = async () => {
        if (!seriesId) return;
        try {
            // Optimization: In a real app, we might have a specific endpoint or store this in context/state
            // For now, we'll fetch all and find the one we need, or rely on a new endpoint if exists
            const response = await SeriesService.getAll();
            if (response.success) {
                const found = response.data.find((s: any) => String(s.ExamSeriesID) === seriesId);
                if (found) {
                    setSeriesName(found.SeriesName);
                    setExamType(found.ExamType);
                }
            }
        } catch (error) {
            console.error("Failed to fetch series details", error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const apiStatus = statusFilter === 'All' ? '' : statusFilter;
            const apiSeries = seriesId || ''; // Force series filter if in detail view

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

    const handleDeleteClick = (id: number) => {
        setDeleteExamId(id);
    };

    const confirmDelete = async () => {
        if (!deleteExamId) return;
        try {
            await ExamService.delete(deleteExamId);
            toast.success("Exam deleted successfully");
            fetchData();
            if (selectedExam?.ExamID === deleteExamId) setIsPanelOpen(false);
        } catch (error) {
            toast.error("Failed to delete exam");
        }
    };

    const handleAllocate = async (id: number) => {
        const toastId = toast.loading("Running allocation algorithm...");
        try {
            await ExamService.allocate(id);
            toast.success("Seat allocation completed successfully", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Allocation failed", { id: toastId });
        }
    };

    const handleEdit = (exam: any) => {
        setSelectedExam(exam);
        setIsEditModalOpen(true);
        setIsPanelOpen(false);
    };

    const handleExamUpdated = () => {
        fetchData();
        // Trigger audit re-check if needed, but fetchData usually gets fresh data
    };

    const handleRowClick = (exam: any) => {
        setSelectedExam(exam);
        setIsPanelOpen(true);
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 bg-[#F8F9FA] min-h-screen">
            {/* Top Bar (SeatSync Header) */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        isIconOnly
                        variant="light"
                        onPress={() => navigate('/admin/exams')}
                        className="text-gray-500 hover:text-blue-600"
                    >
                        <ArrowLeft size={24} />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                            {seriesName || 'Exam Schedule'}
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">Manage sessions and resolve automated audit conflicts.</p>
                    </div>
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
                    <div className="flex bg-gray-100 rounded-lg p-1 mr-2" role="group" aria-label="View Toggle Options">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="List View"
                            aria-label="Switch to List View"
                        >
                            <ListIcon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            title="Calendar View"
                            aria-label="Switch to Calendar View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="w-full lg:w-72">
                        <Input 
                            aria-label="Search exams"
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

                    {/* Date Picker Filter (UI ONLY) */}
                    <div className="w-full lg:w-44">
                        <Input
                            type="date"
                            size="sm"
                            aria-label="Filter by date"
                            placeholder="Select Date"
                            value={dateFilter}
                            onValueChange={setDateFilter}
                            classNames={{
                                inputWrapper: "bg-white border-gray-200 hover:border-blue-400 h-10 transition-all rounded-lg shadow-sm"
                            }}
                        />
                    </div>

                    {/* Dropdowns */}
                    <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                        <Select 
                            aria-label="Filter by Department"
                            placeholder="Department: All"
                            size="sm"
                            className="w-48"
                            variant="bordered"
                            classNames={{
                                trigger: "bg-white border-gray-200 h-10 rounded-lg relative transition-all hover:border-blue-400 focus:border-blue-500",
                                selectorIcon: "absolute right-2 text-gray-400",
                                popoverContent: "bg-white border border-gray-100 shadow-xl rounded-xl p-1"
                            }}
                            selectedKeys={[deptFilter]}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            disallowEmptySelection
                        >
                            {[
                                { DepartmentID: 'All', DepartmentName: 'Department: All', description: 'Show all departments' },
                                ...departments.map((d: any) => ({ ...d, description: 'Academic Department' }))
                            ].map((dept: any) => (
                                <SelectItem
                                    key={dept.DepartmentID.toString()}
                                    textValue={dept.DepartmentName}
                                    startContent={
                                        <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            {dept.DepartmentID === 'All' ? <Layers size={16} /> : <Building2 size={16} />}
                                        </div>
                                    }
                                    description={dept.description}
                                    classNames={{
                                        base: "rounded-lg data-[hover=true]:bg-gray-50 mb-1",
                                        title: "text-sm font-semibold text-slate-700",
                                        description: "text-xs text-slate-400"
                                    }}
                                >
                                    {dept.DepartmentName}
                                </SelectItem>
                            ))}
                        </Select>

                        <Select 
                            aria-label="Filter by Session"
                            placeholder="Session"
                            size="sm"
                            className="w-40"
                            variant="bordered"
                            classNames={{
                                trigger: "bg-white border-gray-200 h-10 rounded-lg relative transition-all hover:border-blue-400 focus:border-blue-500",
                                selectorIcon: "absolute right-2 text-gray-400",
                                popoverContent: "bg-white border border-gray-100 shadow-xl rounded-xl p-1"
                            }}
                            selectedKeys={[sessionFilter]}
                            onChange={(e) => setSessionFilter(e.target.value)}
                            disallowEmptySelection
                        >
                            <SelectItem
                                key="All"
                                textValue="Session: All"
                                startContent={<div className="p-1.5 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center shrink-0"><Clock size={16} /></div>}
                                description="Show all sessions"
                                classNames={{ base: "rounded-lg data-[hover=true]:bg-gray-50 mb-1", title: "text-sm font-semibold text-slate-700", description: "text-xs text-slate-400" }}
                            >
                                Session: All
                            </SelectItem>
                            <SelectItem
                                key="FN"
                                textValue="Morning"
                                startContent={<div className="p-1.5 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center shrink-0"><Sun size={16} /></div>}
                                description="Forenoon Session"
                                classNames={{ base: "rounded-lg data-[hover=true]:bg-gray-50 mb-1", title: "text-sm font-semibold text-slate-700", description: "text-xs text-slate-400" }}
                            >
                                Morning
                            </SelectItem>
                            <SelectItem
                                key="AN"
                                textValue="Afternoon"
                                startContent={<div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Moon size={16} /></div>}
                                description="Afternoon Session"
                                classNames={{ base: "rounded-lg data-[hover=true]:bg-gray-50 mb-1", title: "text-sm font-semibold text-slate-700", description: "text-xs text-slate-400" }}
                            >
                                Afternoon
                            </SelectItem>
                        </Select>

                        <Select 
                            aria-label="Filter by Status"
                            placeholder="Status"
                            size="sm"
                            className="w-40"
                            variant="bordered"
                            classNames={{
                                trigger: "bg-white border-gray-200 h-10 rounded-lg relative transition-all hover:border-blue-400 focus:border-blue-500",
                                selectorIcon: "absolute right-2 text-gray-400",
                                popoverContent: "bg-white border border-gray-100 shadow-xl rounded-xl p-1"
                            }}
                            selectedKeys={[statusFilter]}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            disallowEmptySelection
                        >
                            <SelectItem
                                key="All"
                                textValue="Audit Status: All"
                                startContent={<div className="p-1.5 rounded-md bg-gray-100 text-gray-600 flex items-center justify-center shrink-0"><Layers size={16} /></div>}
                                description="Show all statuses"
                                classNames={{ base: "rounded-lg data-[hover=true]:bg-gray-50 mb-1", title: "text-sm font-semibold text-slate-700", description: "text-xs text-slate-400" }}
                            >
                                Audit Status: All
                            </SelectItem>
                            <SelectItem
                                key="Scheduled"
                                textValue="Clean"
                                startContent={<div className="p-1.5 rounded-md bg-green-50 text-green-600 flex items-center justify-center shrink-0"><CheckCircle size={16} /></div>}
                                description="No conflicts detected"
                                classNames={{ base: "rounded-lg data-[hover=true]:bg-gray-50 mb-1", title: "text-sm font-semibold text-slate-700", description: "text-xs text-slate-400" }}
                            >
                                Clean
                            </SelectItem>
                            <SelectItem
                                key="Conflict"
                                textValue="Conflict"
                                startContent={<div className="p-1.5 rounded-md bg-red-50 text-red-600 flex items-center justify-center shrink-0"><AlertCircle size={16} /></div>}
                                description="Schedule clashes found"
                                classNames={{ base: "rounded-lg data-[hover=true]:bg-gray-50 mb-1", title: "text-sm font-semibold text-slate-700", description: "text-xs text-slate-400" }}
                            >
                                Conflict
                            </SelectItem>
                        </Select>
                    </div>
                </div>

                <div className="px-4 text-xs font-semibold text-gray-400 hidden lg:block">
                    Showing {uiFilteredExams.length} exams
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'list' ? (
                <ExamListTable
                    exams={uiFilteredExams}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    onAllocate={handleAllocate}
                    onRowClick={handleRowClick}
                />
            ) : (
                <div className="border border-gray-200 rounded-xl shadow-sm bg-white min-h-[600px]">
                    <ExamCalendar
                        exams={uiFilteredExams}
                        onExamClick={handleRowClick}
                    />
                </div>
            )}

            {/* Create Modal */}
            <CreateExamModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchData}
                seriesId={seriesId}
            />

            {/* Edit Modal */}
            {selectedExam && (
                <EditExamModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={handleExamUpdated}
                    exam={selectedExam}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deleteExamId}
                onClose={() => setDeleteExamId(null)}
                onConfirm={confirmDelete}
                title="Delete Exam"
                message="Are you sure you want to delete this exam? This action cannot be undone and will remove all associated allocations."
                confirmText="Delete Exam"
                cancelText="Cancel"
                type="danger"
            />

            {/* Import Modal */}
            {examType === 'Internal' ? (
                <InternalExamImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={() => {
                        setIsImportModalOpen(false);
                        fetchData();
                    }}
                    seriesId={seriesId!}
                />
            ) : (
                <ExamImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSuccess={fetchData}
                    preSelectedSeriesId={seriesId} // Pass seriesId to pre-select
                />
            )}

            {/* Detail Drawer */}
            <ExamDetailPanel
                isOpen={isPanelOpen}
                exam={selectedExam}
                onClose={() => setIsPanelOpen(false)}
                onEdit={handleEdit}
            />

        </div>
    );
};

export default Exams;
