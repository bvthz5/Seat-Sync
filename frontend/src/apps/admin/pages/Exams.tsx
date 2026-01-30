
import React, { useState, useEffect } from 'react';
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Plus, Search, Download, RefreshCw, Bell } from "lucide-react";
import { toast } from 'react-hot-toast';

import ExamStats from '../components/exams/ExamStats';
import ExamListTable from '../components/exams/ExamListTable';
import CreateExamModal from '../components/exams/CreateExamModal';
import ExamDetailPanel from '../components/exams/ExamDetailPanel';
import { ExamService } from '../services/examService';

const Exams: React.FC = () => {
    // State
    const [stats, setStats] = useState<{ total: number; completed: number; upcoming: number; activeToday: number; } | null>(null);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Panel State
    const [selectedExam, setSelectedExam] = useState<any>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('All');
    const [sessionFilter, setSessionFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const apiStatus = statusFilter === 'All' ? '' : statusFilter;
            const [statsData, examsData] = await Promise.all([
                ExamService.getStats(),
                ExamService.getAll({ search: searchQuery, status: apiStatus })
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
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Exam Schedule: Spring Semester 2024</h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage sessions, verify seating, and resolve automated audit conflicts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="flat"
                        color="default"
                        className="bg-white border border-gray-200 text-gray-700 font-medium shadow-sm"
                        startContent={<Download size={16} />}
                    >
                        Export Report
                    </Button>
                    <Button
                        color="primary"
                        className="bg-blue-600 font-bold shadow-md shadow-blue-600/20"
                        startContent={<RefreshCw size={16} />}
                        onPress={() => setIsCreateModalOpen(true)} // Reusing this for Create
                    >
                        Create / Audit
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <ExamStats stats={stats} />

            {/* Filter Bar */}
            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-3">
                <div className="flex items-center flex-1 gap-2 w-full lg:w-auto p-1">
                    {/* Search */}
                    <div className="w-full lg:w-72">
                        <Input
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

                    {/* Dropdowns */}
                    <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                        <Select
                            placeholder="Department: All"
                            size="sm"
                            className="w-40"
                            variant="bordered"
                            classNames={{ trigger: "bg-gray-50 border-gray-200" }}
                            selectedKeys={[deptFilter]}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            selectorIcon={<></>}
                        >
                            <SelectItem key="All">Department: All</SelectItem>
                            <SelectItem key="CS">Computer Science</SelectItem>
                            <SelectItem key="Math">Mathematics</SelectItem>
                        </Select>

                        <Select
                            placeholder="Session"
                            size="sm"
                            className="w-36"
                            variant="bordered"
                            classNames={{ trigger: "bg-gray-50 border-gray-200" }}
                            selectedKeys={[sessionFilter]}
                            onChange={(e) => setSessionFilter(e.target.value)}
                            selectorIcon={<></>}
                        >
                            <SelectItem key="All">Session: All</SelectItem>
                            <SelectItem key="Morning">Morning</SelectItem>
                            <SelectItem key="Afternoon">Afternoon</SelectItem>
                        </Select>

                        <Select
                            placeholder="Status"
                            size="sm"
                            className="w-36"
                            variant="bordered"
                            classNames={{ trigger: "bg-gray-50 border-gray-200" }}
                            selectedKeys={[statusFilter]}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            selectorIcon={<></>}
                        >
                            <SelectItem key="All">Audit Status: All</SelectItem>
                            <SelectItem key="Scheduled">Clean</SelectItem>
                            <SelectItem key="Conflict">Conflict</SelectItem>
                        </Select>
                    </div>
                </div>

                <div className="px-4 text-xs font-semibold text-gray-400 hidden lg:block">
                    Showing 1-10 of {stats?.total || 0}
                </div>
            </div>

            {/* Table */}
            <ExamListTable
                exams={exams}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onAllocate={handleAllocate}
                onRowClick={handleRowClick}
            />

            {/* Create Modal */}
            <CreateExamModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchData}
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
