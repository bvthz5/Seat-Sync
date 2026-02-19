import React, { useEffect, useState } from 'react';
import { ExamControlService } from '../services/examControlService';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../../utils/toast';
import { useNavigate } from 'react-router-dom';
import { ExamStatsCards } from '../components/exam-control/ExamStatsCards';
import { ExamListTable } from '../components/exam-control/ExamListTable';
import { ManagementConsole } from '../components/exam-control/ManagementConsole';
import { EmergencyPanel } from '../components/exam-control/EmergencyPanel';
import { AuditLogs } from '../components/exam-control/AuditLogs';
import { Exam, ExamStatus, ActivityLog } from '../types/examControl';
import { Tabs, Tab, Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Switch } from '@heroui/react';
import { RefreshCcw, LayoutDashboard, ShieldAlert, Settings, AlertTriangle, ChevronDown, Lock } from 'lucide-react';

const ExamControl: React.FC = () => {
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [exams, setExams] = useState<Exam[]>([]);
    const [stats, setStats] = useState<any>({});
    const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
    const [logs, setLogs] = useState<ActivityLog[]>([]); // Global logs
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Crisis Mode
    const [emergencyMode, setEmergencyMode] = useState(false);

    useEffect(() => {
        if (!authLoading && user) {
            if (user.Role !== 'exam_admin') {
                // Access check logic if needed
            }
        }
    }, [user, authLoading]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const overview = await ExamControlService.getOverview(page, 10);
            setExams(overview.data.exams);
            setStats(overview.data.statusCounts);
            setTotal(overview.data.total);
            setTotalPages(overview.data.totalPages);

            // Fetch global logs only if on dashboard or no exam selected
            if (!selectedExam) {
                const logData = await ExamControlService.getLogs();
                setLogs(logData.data);
            }

        } catch (error) {
            toast.error("Failed to load Exam Control data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page]);

    const handleExamSelect = (exam: Exam) => {
        setSelectedExam(exam);
        setActiveTab('manage');
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-8 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                        Exam Control Center
                    </h1>
                    <p className="text-slate-500 font-medium">Root Access • Enterprise Lifecycle Management</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="flat"
                        color="secondary"
                        onPress={fetchData}
                        isLoading={loading}
                        startContent={<RefreshCcw className="w-4 h-4" />}
                        className="font-semibold"
                    >
                        Sync Data
                    </Button>
                </div>
            </div>

            <Tabs
                aria-label="Control Modes"
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(key as string)}
                variant="underlined"
                color="secondary"
                classNames={{
                    tabList: "gap-8 w-full relative rounded-none p-0 border-b border-slate-200 mb-6",
                    cursor: "w-full bg-indigo-600 h-1",
                    tab: "max-w-fit px-2 h-10 text-slate-500 font-medium",
                    tabContent: "group-data-[selected=true]:text-indigo-600 group-data-[selected=true]:font-bold text-base"
                }}
            >
                <Tab
                    key="overview"
                    title={
                        <div className="flex items-center space-x-2">
                            <LayoutDashboard className="w-5 h-5" />
                            <span>Dashboard</span>
                        </div>
                    }
                >
                    <div className="space-y-8 mt-2">
                        {/* Metrics Cards */}
                        <ExamStatsCards
                            total={exams.length}
                            draft={stats.Draft || 0}
                            ready={stats.Ready || 0}
                            published={stats.Published || 0}
                            inProgress={stats['In Progress'] || 0}
                            completed={stats.Completed || 0}
                            emergency={stats.Emergency || 0}
                            locked={stats.Locked || 0}
                        />

                        {/* Lifecycle Distribution Bar */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Lifecycle Distribution</h3>
                            <div className="flex h-4 w-full rounded-full overflow-hidden bg-slate-100">
                                <div style={{ width: `${((stats.Draft || 0) / total) * 100}%` }} className="bg-amber-300 h-full" title={`Draft: ${stats.Draft || 0}`} />
                                <div style={{ width: `${((stats.Ready || 0) / total) * 100}%` }} className="bg-yellow-400 h-full" title={`Ready: ${stats.Ready || 0}`} />
                                <div style={{ width: `${((stats.Published || 0) / total) * 100}%` }} className="bg-green-500 h-full" title={`Published: ${stats.Published || 0}`} />
                                <div style={{ width: `${((stats['In Progress'] || 0) / total) * 100}%` }} className="bg-blue-500 h-full" title={`In Progress: ${stats['In Progress'] || 0}`} />
                                <div style={{ width: `${((stats.Completed || 0) / total) * 100}%` }} className="bg-slate-600 h-full" title={`Completed: ${stats.Completed || 0}`} />
                            </div>
                            <div className="flex justify-between text-xs text-slate-400 font-mono mt-2">
                                <span>Draft: {stats.Draft || 0}</span>
                                <span>Ready: {stats.Ready || 0}</span>
                                <span>Published: {stats.Published || 0}</span>
                                <span>In Progress: {stats['In Progress'] || 0}</span>
                                <span>Completed: {stats.Completed || 0}</span>
                            </div>
                        </div>

                        <div className="flex gap-8 grid-cols-1 xl:grid-cols-4 grid">
                            <div className="xl:col-span-3">
                                <ExamListTable
                                    exams={exams}
                                    onSelectExam={handleExamSelect}
                                    currentSelectionId={selectedExam?.ExamID}
                                    total={total}
                                    page={page}
                                    totalPages={totalPages}
                                    onPageChange={setPage}
                                />
                            </div>
                            <div className="xl:col-span-1">
                                <div className="sticky top-6">
                                    <div className="mb-2 flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-wider">
                                        <ShieldAlert className="w-4 h-4" /> Global Audit Log
                                    </div>
                                    <AuditLogs logs={logs} />
                                </div>
                            </div>
                        </div>
                    </div>
                </Tab>

                <Tab
                    key="manage"
                    title={
                        <div className="flex items-center space-x-2">
                            <Settings className="w-5 h-5" />
                            <span>Management Console</span>
                        </div>
                    }
                >
                    {!selectedExam ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-slate-300 mt-2">
                            <div className="bg-indigo-50 p-6 rounded-full mb-6">
                                <Settings className="w-12 h-12 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">No Exam Selected</h3>
                            <p className="text-slate-500 max-w-md text-center mt-2 mb-8">
                                Select an exam to access strict lifecycle controls, candidate constraints, and rapid operational overrides.
                            </p>

                            <Dropdown>
                                <DropdownTrigger>
                                    <Button
                                        variant="shadow"
                                        color="primary"
                                        size="lg"
                                        endContent={<ChevronDown className="w-4 h-4" />}
                                        className="font-bold text-white bg-indigo-600"
                                    >
                                        Select Exam to Manage
                                    </Button>
                                </DropdownTrigger>
                                <DropdownMenu
                                    aria-label="Select Exam"
                                    className="max-h-80 overflow-y-auto"
                                    onAction={(key) => {
                                        const selected = exams.find(e => e.ExamID === Number(key));
                                        if (selected) handleExamSelect(selected);
                                    }}
                                >
                                    {exams.map(e => (
                                        <DropdownItem key={e.ExamID} description={e.Session} startContent={<div className={`w-2 h-2 rounded-full ${e.Status === 'Published' ? 'bg-green-500' : 'bg-slate-300'}`} />}>
                                            {e.ExamName}
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    ) : (
                        <div className="mt-2">
                            <ManagementConsole
                                exam={selectedExam}
                                allExams={exams}
                                onRefresh={fetchData}
                                onSelectExam={handleExamSelect}
                            />
                        </div>
                    )}
                </Tab>

                <Tab
                    key="emergency"
                    title={
                        <div className="flex items-center space-x-2 text-red-600">
                            <ShieldAlert className="w-5 h-5" />
                            <span>Crisis Center</span>
                        </div>
                    }
                >
                    <div className={`mt-2 min-h-[500px] flex flex-col transition-all duration-500 rounded-3xl overflow-hidden ${emergencyMode ? 'bg-red-50 border-4 border-red-500' : 'bg-slate-100 border border-slate-200'}`}>
                        {/* Emergency Toggle Header */}
                        <div className={`p-8 flex justify-between items-center ${emergencyMode ? 'bg-red-600 text-white' : 'bg-white'}`}>
                            <div>
                                <h2 className={`text-2xl font-black ${emergencyMode ? 'text-white' : 'text-slate-800'}`}>Emergency Operations Center</h2>
                                <p className={`font-medium ${emergencyMode ? 'text-red-100' : 'text-slate-500'}`}>
                                    {emergencyMode ? 'CRITICAL MODE ACTIVE - ACTIONS LOGGED WITH HIGH PRIORITY' : 'Standard Mode - Emergency protocols standby'}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`text-sm font-bold uppercase tracking-wider ${emergencyMode ? 'text-white' : 'text-slate-500'}`}>
                                    {emergencyMode ? 'ARMED' : 'DISARMED'}
                                </span>
                                <Switch
                                    isSelected={emergencyMode}
                                    onValueChange={setEmergencyMode}
                                    size="lg"
                                    color="danger"
                                    startContent={<ShieldAlert className="text-white" />}
                                    endContent={<Lock className="text-slate-600" />}
                                    classNames={{
                                        wrapper: "group-data-[selected=true]:bg-white bg-slate-300",
                                        thumb: "bg-white group-data-[selected=true]:bg-red-600",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="p-8 flex-1 flex items-center justify-center">
                            {!emergencyMode ? (
                                <div className="text-center max-w-lg opacity-75">
                                    <Lock className="w-24 h-24 mx-auto mb-6 text-slate-400" />
                                    <h3 className="text-2xl font-bold text-slate-600">Panel Locked</h3>
                                    <p className="text-slate-500 mt-2 font-medium">Toggle the emergency switch to access evacuation, global broadcast, and kill-switch controls.</p>
                                </div>
                            ) : (
                                <div className="w-full max-w-4xl animate-in zoom-in-95 duration-200">
                                    <EmergencyPanel
                                        examId={selectedExam?.ExamID}
                                        examName={selectedExam?.ExamName}
                                        onActionComplete={fetchData}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </Tab>
            </Tabs>
        </div>
    );
};

export default ExamControl;
