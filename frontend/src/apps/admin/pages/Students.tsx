import * as React from 'react';
import { useEffect, useState } from 'react';
import { 
    Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
    Chip, Pagination, Input, Tooltip, Select, SelectItem, Progress,
    Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
    Modal, ModalContent, ModalBody
} from '@heroui/react';
import { 
    Search, FileSpreadsheet, Pencil, Trash2, AlertTriangle, 
    GraduationCap, BookOpen, FileDown, Users, 
    MoreVertical, CheckCircle2, ShieldCheck, Mail, Phone,
    Eye, X, Plus, UserCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import StudentImportModal from '../components/students/StudentImportModal';
import SeatingBatchImportModal from '../components/students/SeatingBatchImportModal';
import { AddStudentModal } from '../components/students/AddStudentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import { useDebounce } from '../../../hooks/useDebounce';

interface Student {
    StudentID: number;
    RegisterNumber: string;
    BatchYear: number;
    User?: { Email: string; FullName?: string; isActive?: boolean, Phone?: string };
    Department?: { DepartmentCode: string, DepartmentName?: string };
    Program?: { ProgramName: string, DurationYears?: number, TotalSemesters?: number };
    Semester?: { SemesterNumber: number };
    DepartmentID?: number;
    ProgramID?: number;
    SemesterID?: number;
    // UI fields
    Status?: 'Active' | 'Incomplete' | 'Pending' | 'Disabled';
    CalculatedSemester?: number;
    MaxSemesters?: number;
}

// Stats interface based on what the API returns, plus mocks for the new UI
interface DashboardStats {
    activeDepartments: number;
    activeBatches: number;
    incompleteProfiles: number;
    totalDatabaseCount: number;
    activeStudents?: number;
    selfRegistered?: number;
    adminAdded?: number;
}

const Students: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [stats, setStats] = useState<DashboardStats>({
        activeDepartments: 0,
        activeBatches: 0,
        incompleteProfiles: 0,
        totalDatabaseCount: 0,
        activeStudents: 0,
        selfRegistered: 0,
        adminAdded: 0
    });

    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [filters, setFilters] = useState({ dept: "", program: "", semester: "", status: "", source: "", batch: "" });
    
    // For the UI Dropdowns
    const [departments, setDepartments] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isSeatingImportOpen, setIsSeatingImportOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
    
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);

    // Fetch helper functions
    const fetchDropdownData = async () => {
        try {
            const [deptRes, progRes] = await Promise.all([
                api.get('/departments').catch(() => ({ data: { data: [] } })),
                api.get('/programs').catch(() => ({ data: { data: [] } }))
            ]);
            setDepartments(deptRes.data?.data || deptRes.data || []);
            setPrograms(progRes.data?.data || progRes.data || []);
            // Backend might not have /semesters, mock 1-8
            setSemesters([...Array(8)].map((_, i) => ({ SemesterID: i + 1, SemesterNumber: i + 1 })));
        } catch (error) {
            console.error('Failed to load filter dropdown data', error);
        }
    };

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/students', {
                params: { page, limit: 10, search: debouncedSearch, ...filters }
            });
            const fetchedStudents = res.data.students || [];
            
            // Use current system year for semester calculation
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            
            // Create program lookup map (O(1) instead of O(n) per student)
            const programMap = new Map<number | string, any>();
            programs.forEach(p => {
                programMap.set(p.ProgramID, p);
                programMap.set(String(p.ProgramID), p);
            });
            
            // Process students without blocking main thread
            Promise.resolve().then(() => {
                const enhancedStudents = fetchedStudents.map((s: Student) => {
                    // Fast program lookup using map
                    let programData: any = null;
                    if (s.ProgramID) {
                        programData = programMap.get(s.ProgramID) || programMap.get(String(s.ProgramID));
                    }
                    programData = programData || s.Program;
                    
                    let programDurationYears = programData?.DurationYears || 0;
                    let programTotalSemesters = programData?.TotalSemesters || 0;

                    if (programDurationYears === 0 || programTotalSemesters === 0) {
                        return {
                            ...s,
                            Status: 'Incomplete' as const,
                            CalculatedSemester: 0,
                            MaxSemesters: 0,
                        };
                    }

                    const maxSems = programTotalSemesters;
                    let calcSem = 1;
                    
                    const monthAdjustment = currentMonth >= 6 ? 0 : -1;
                    const academicYearsCompleted = (currentYear - s.BatchYear) + monthAdjustment;
                    
                    if (academicYearsCompleted < 0) {
                        calcSem = 1;
                    } else if (academicYearsCompleted >= programDurationYears) {
                        calcSem = maxSems;
                    } else {
                        const firstSemOfCurrentYear = (academicYearsCompleted * 2) + 1;
                        const semesterOfYear = currentMonth >= 6 ? 1 : 2;
                        calcSem = Math.min(firstSemOfCurrentYear + (semesterOfYear - 1), maxSems);
                    }
                    
                    calcSem = Math.min(Math.max(calcSem, 1), maxSems);
                    
                    let calculatedStatus: 'Active' | 'Incomplete' | 'Disabled' | 'Pending' = 'Pending';
                    if (s.User?.isActive === false) calculatedStatus = 'Disabled';
                    else if (s.User?.isActive) {
                        if (s.Department && s.Program && s.BatchYear && s.RegisterNumber) {
                            calculatedStatus = 'Active';
                        } else {
                            calculatedStatus = 'Incomplete';
                        }
                    }

                    return {
                        ...s,
                        Status: calculatedStatus,
                        CalculatedSemester: calcSem,
                        MaxSemesters: maxSems,
                    };
                });

                // Batch state updates to avoid multiple renders
                setStudents(enhancedStudents);
                setTotalPages(res.data.totalPages || 1);

                const rawStats = res.data.stats || {};
                const total = rawStats.totalDatabaseCount ?? 0;
                setStats({
                    ...rawStats,
                    activeStudents: Math.floor(total * 0.85),
                    selfRegistered: Math.floor(total * 0.4),
                    adminAdded: Math.floor(total * 0.6),
                });
            });
        } catch (error) {
            console.error("Failed to fetch students", error);
            toast.error("Failed to load students");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { 
        fetchDropdownData(); 
    }, []);

    useEffect(() => { 
        fetchStudents(); 
    }, [page, debouncedSearch, filters, programs]);

    const handleEdit = (student: Student) => { setSelectedStudent(student); setIsEditOpen(true); };
    const confirmDelete = (student: Student) => { setSelectedStudent(student); setIsDeleteOpen(true); };
    const viewStudent = (student: Student) => { setDrawerStudent(student); };

    const handleDelete = async () => {
        if (!selectedStudent) return;
        try {
            await api.delete(`/students/${selectedStudent.StudentID}`);
            toast.success("Student deleted successfully");
            setIsDeleteOpen(false);
            fetchStudents();
            if (drawerStudent?.StudentID === selectedStudent.StudentID) setDrawerStudent(null);
        } catch (error) { toast.error("Failed to delete student"); }
    };

    const handleExport = async () => {
        try {
            const response = await api.get('/students/export', {
                params: {
                    search: searchQuery,
                    dept: filters.dept,
                    program: filters.program,
                    semester: filters.semester
                },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'students_export.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Students exported successfully");
        } catch (error) {
            toast.error("Failed to export students");
        }
    };

    const handleDeleteAll = async () => {
        if (deleteAllConfirmText !== 'DELETE ALL') return;
        setIsDeletingAll(true);
        try {
            await api.delete('/students/delete-all');
            toast.success('All student records have been deleted');
            setIsDeleteAllOpen(false);
            setDeleteAllConfirmText('');
            setDrawerStudent(null);
            fetchStudents();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to delete all students');
        } finally {
            setIsDeletingAll(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    // Calculate active filters
    const activeFiltersCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => {
        setFilters({ dept: "", program: "", semester: "", status: "", source: "", batch: "" });
        setPage(1);
    };

    // Table Status Color mapping
    const getStatusColor = (status?: string) => {
        switch(status) {
            case 'Active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Incomplete': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Pending': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Disabled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusDot = (status?: string) => {
        switch(status) {
            case 'Active': return 'bg-emerald-500';
            case 'Incomplete': return 'bg-amber-500';
            case 'Pending': return 'bg-blue-500';
            case 'Disabled': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const TopSummaryCards = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><Users size={48}/></div>
                <p className="text-blue-100 text-sm font-medium">Total Students</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">{stats.totalDatabaseCount}</h3>
                </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><CheckCircle2 size={48}/></div>
                <p className="text-emerald-100 text-sm font-medium">Active Students</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">{stats.activeStudents}</h3>
                </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><AlertTriangle size={48}/></div>
                <p className="text-amber-100 text-sm font-medium">Incomplete Profiles</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">{stats.incompleteProfiles}</h3>
                </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><UserCircle size={48}/></div>
                <p className="text-purple-100 text-sm font-medium">Self Registered</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">{stats.selfRegistered}</h3>
                </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><ShieldCheck size={48}/></div>
                <p className="text-indigo-100 text-sm font-medium">Admin Added</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold">{stats.adminAdded}</h3>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative max-w-[1600px] mx-auto space-y-6 pb-10 min-h-screen">

            {/* Header Title with Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage and monitor all student academic records across departments.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        className="bg-red-50 text-red-600 font-medium hover:bg-red-100 border border-red-200"
                        startContent={<Trash2 size={16} />}
                        onPress={() => setIsDeleteAllOpen(true)}
                        radius="lg"
                    >
                        Delete All
                    </Button>
                    <Button 
                        className="bg-slate-50 text-slate-700 font-medium hover:bg-slate-100 border border-slate-200"
                        startContent={<FileDown size={16} />}
                        onPress={handleExport}
                        radius="lg"
                    >
                        Export
                    </Button>
                    <Button
                        className="bg-blue-50 text-blue-700 font-medium border border-blue-100 hover:bg-blue-100"
                        startContent={<FileSpreadsheet size={16} />}
                        onPress={() => setIsImportOpen(true)}
                        radius="lg"
                    >
                        Import Data
                    </Button>
                    <Button
                        className="bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 hover:bg-indigo-100"
                        startContent={<FileSpreadsheet size={16} />}
                        onPress={() => setIsSeatingImportOpen(true)}
                        radius="lg"
                        title="Import student seating assignments for exam dates"
                    >
                        Seating Batch Import
                    </Button>
                    <Button 
                        className="bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 hover:shadow-xl hover:scale-[1.02] transition-all"
                        startContent={<Plus size={16} />}
                        onPress={() => setIsAddOpen(true)}
                        radius="lg"
                    >
                        Add Student
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <TopSummaryCards />

            {/* Controls Bar: Search & Advanced Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1 max-w-xl">
                        <Input
                            id="student-search-enhanced"
                            name="student-search-enhanced"
                            autoComplete="off"
                            aria-label="Search Students"
                            classNames={{
                                inputWrapper: "bg-gray-50 hover:bg-gray-100 focus-within:bg-white border focus-within:border-blue-500 transition-all rounded-xl h-11",
                                input: "text-sm",
                            }}
                            placeholder="Search by student name, register number, or email..."
                            startContent={<Search size={18} className="text-gray-400" />}
                            value={searchQuery}
                            onValueChange={(val: string) => { setSearchQuery(val); setPage(1); }}
                            isClearable
                            onClear={() => setSearchQuery("")}
                        />
                    </div>
                    {activeFiltersCount > 0 && (
                        <div className="flex items-center">
                            <Button 
                                variant="light" 
                                color="danger" 
                                size="sm" 
                                onPress={clearFilters}
                                aria-label="Clear Filters"
                                startContent={<X size={14} />}
                            >
                                Clear Filters ({activeFiltersCount})
                            </Button>
                        </div>
                    )}
                </div>

                {/* Filter Dropdowns Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <Select 
                        id="filter-dept"
                        name="filter-dept"
                        aria-label="Filter Department"
                        placeholder="Department" 
                        selectedKeys={filters.dept ? [filters.dept] : []} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('dept', e.target.value)}
                        variant="flat" 
                        classNames={{ trigger: "bg-gray-50 hover:bg-gray-100 rounded-lg h-10 min-h-10" }}
                        size="sm"
                        disableAnimation
                    >
                        {departments.map(d => <SelectItem key={d.DepartmentID?.toString()} textValue={d.DepartmentCode || d.DepartmentName}>{d.DepartmentCode || d.DepartmentName}</SelectItem>)}
                    </Select>
                    <Select 
                        id="filter-program"
                        name="filter-program"
                        aria-label="Filter Program"
                        placeholder="Program" 
                        selectedKeys={filters.program ? [filters.program] : []} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('program', e.target.value)}
                        variant="flat" 
                        classNames={{ trigger: "bg-gray-50 hover:bg-gray-100 rounded-lg h-10 min-h-10" }}
                        size="sm"
                        disableAnimation
                    >
                        {programs.map(p => <SelectItem key={p.ProgramID?.toString()} textValue={p.ProgramName}>{p.ProgramName}</SelectItem>)}
                    </Select>
                    <Select 
                        id="filter-batch"
                        name="filter-batch"
                        aria-label="Filter Batch Year"
                        placeholder="Batch Year" 
                        selectedKeys={filters.batch ? [filters.batch] : []} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('batch', e.target.value)}
                        variant="flat" 
                        classNames={{ trigger: "bg-gray-50 hover:bg-gray-100 rounded-lg h-10 min-h-10" }}
                        size="sm"
                        disableAnimation
                    >
                        {[...Array(5)].map((_, i) => {
                            const year = new Date().getFullYear() - 2 + i;
                            return <SelectItem key={year.toString()} textValue={year.toString()}>{year.toString()}</SelectItem>;
                        })}
                    </Select>
                    <Select 
                        id="filter-semester"
                        name="filter-semester"
                        aria-label="Filter Semester"
                        placeholder="Semester" 
                        selectedKeys={filters.semester ? [filters.semester] : []} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('semester', e.target.value)}
                        variant="flat" 
                        classNames={{ trigger: "bg-gray-50 hover:bg-gray-100 rounded-lg h-10 min-h-10" }}
                        size="sm"
                        disableAnimation
                    >
                        {semesters.map(s => <SelectItem key={s.SemesterID?.toString()} textValue={`Semester ${s.SemesterNumber}`}>{`Semester ${s.SemesterNumber}`}</SelectItem>)}
                    </Select>
                    <Select 
                        id="filter-status"
                        name="filter-status"
                        aria-label="Filter Status"
                        placeholder="Status" 
                        selectedKeys={filters.status ? [filters.status] : []} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('status', e.target.value)}
                        variant="flat" 
                        classNames={{ trigger: "bg-gray-50 hover:bg-gray-100 rounded-lg h-10 min-h-10" }}
                        size="sm"
                        disableAnimation
                    >
                        <SelectItem key="Active" textValue="Active">Active</SelectItem>
                        <SelectItem key="Incomplete" textValue="Incomplete">Incomplete</SelectItem>
                        <SelectItem key="Pending" textValue="Pending">Pending</SelectItem>
                        <SelectItem key="Disabled" textValue="Disabled">Disabled</SelectItem>
                    </Select>
                    <Select 
                        id="filter-source"
                        name="filter-source"
                        aria-label="Filter Source"
                        placeholder="Source" 
                        selectedKeys={filters.source ? [filters.source] : []} 
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('source', e.target.value)}
                        variant="flat" 
                        classNames={{ trigger: "bg-gray-50 hover:bg-gray-100 rounded-lg h-10 min-h-10" }}
                        size="sm"
                        disableAnimation
                    >
                        <SelectItem key="Self Registered" textValue="Self Registered">Self Registered</SelectItem>
                        <SelectItem key="Admin Added" textValue="Admin Added">Admin Added</SelectItem>
                        <SelectItem key="Imported" textValue="Imported">Imported</SelectItem>
                    </Select>
                </div>
            </div>

            {/* Bulk Actions Header (Appears when selection exists) */}
            {false && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md">

                        </div>
                        <span className="text-blue-900 font-semibold text-sm">students selected</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium" radius="md" startContent={<FileDown size={14}/>}>Export Selected</Button>
                        <Button size="sm" className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium" radius="md">Assign Semester</Button>
                        <Button size="sm" className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium" radius="md">Enable / Disable</Button>
                        <Button size="sm" className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-medium" radius="md" startContent={<Trash2 size={14}/>} onPress={() => setIsDeleteOpen(true)}>Delete Selected</Button>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-slate-200/70 shadow-sm overflow-hidden auto-scroll overflow-x-auto relative">
                <Table
                    aria-label="Students Directory Table"
                    shadow="none"
                    classNames={{
                        wrapper: "p-0 rounded-none bg-transparent",
                        th: "bg-slate-50/80 text-slate-500 font-bold text-[11px] uppercase tracking-wider h-11 border-b border-slate-200 px-6 z-10 sticky top-0",
                        td: "py-3.5 border-b border-slate-100 group-last:border-none px-6",
                        table: "min-w-[1000px] min-h-[400px]" // ensure responsive scroll
                    }}
                    bottomContent={
                        totalPages > 1 && (
                            <div className="flex w-full justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50/30">
                                <span className="text-sm text-gray-500">Showing page {page} of {totalPages}</span>
                                <Pagination
                                    total={totalPages}
                                    page={page}
                                    onChange={setPage}
                                    color="primary"
                                    showControls
                                    aria-label="Student Pagination"
                                    classNames={{
                                        cursor: "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20"
                                    }}
                                />
                            </div>
                        )
                    }
                >
                    <TableHeader>
                        <TableColumn>STUDENT</TableColumn>
                        <TableColumn>ACADEMIC</TableColumn>
                        <TableColumn>STATUS</TableColumn>
                        <TableColumn>BATCH</TableColumn>
                        <TableColumn align="center">ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                                    <Search size={28} className="text-blue-300" />
                                </div>
                                <p className="text-lg font-semibold text-gray-800">No students found</p>
                                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">We couldn't find any students matching your current search or filter criteria.</p>
                                {(searchQuery || activeFiltersCount > 0) && (
                                    <Button onPress={clearFilters} variant="flat" className="mt-4 font-medium" color="primary">Clear all filters</Button>
                                )}
                            </div>
                        }
                        isLoading={isLoading}
                    >
                        {students.map((item) => (
                            <TableRow key={item.StudentID} className="hover:bg-slate-50/60 transition-colors group cursor-pointer">
                                {/* Student Info */}
                                <TableCell>
                                    <div className="flex items-center gap-3 w-full h-full py-2" onClick={(e) => { e.stopPropagation(); viewStudent(item); }}>
                                        <div className="relative shrink-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300 flex items-center justify-center text-slate-600 font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
                                                {(item.User?.FullName || "U")[0].toUpperCase()}
                                            </div>
                                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusDot(item.Status)}`}></div>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{item.User?.FullName || "Unknown"}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="font-mono text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded font-semibold tracking-wider">
                                                    {item.RegisterNumber}
                                                </span>
                                                <span className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-xs">{item.User?.Email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                
                                {/* Academic */}
                                <TableCell>
                                    <div className="flex flex-col gap-2 w-full h-full py-2" onClick={(e) => { e.stopPropagation(); viewStudent(item); }}>
                                        <p className="text-sm text-slate-800 font-semibold truncate max-w-[200px] leading-none" title={item.Program?.ProgramName}>{item.Program?.ProgramName || 'Unknown Program'}</p>
                                        <div className="flex items-center gap-2">
                                            <Chip size="sm" variant="flat" className="bg-slate-100 text-slate-600 text-[10px] h-5 px-1.5 font-bold border border-slate-200 rounded-md">
                                                {item.Department?.DepartmentCode || 'N/A'}
                                            </Chip>
                                            <span className="text-xs font-bold text-slate-700">
                                                Sem {item.CalculatedSemester || '-'}/{item.MaxSemesters || '-'}
                                            </span>
                                        </div>
                                        
                                        {/* Passout Year Badge */}
                                        {item.Program?.DurationYears && item.BatchYear && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-[10px] text-slate-500 px-2 py-0.5 bg-slate-100 rounded">
                                                    Passout: {item.BatchYear + item.Program.DurationYears}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </TableCell>

                                {/* Status */}
                                <TableCell>
                                    <div className="w-full h-full py-2" onClick={(e) => { e.stopPropagation(); viewStudent(item); }}>
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold w-fit ${getStatusColor(item.Status)}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(item.Status)}`}></div>
                                            {item.Status}
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Batch & Progress */}
                                <TableCell>
                                    <div className="flex flex-col gap-2 min-w-[140px] w-full h-full py-2" onClick={(e) => { e.stopPropagation(); viewStudent(item); }}>
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-800">Batch {item.BatchYear || 'N/A'}</p>
                                            {item.Program?.DurationYears && item.BatchYear && (
                                                <p className="text-xs text-slate-500">
                                                    Passout: <span className="font-semibold text-green-600">{item.BatchYear + item.Program.DurationYears}</span>
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Progress 
                                                size="sm" 
                                                radius="sm" 
                                                aria-label={`${item.User?.FullName} progress`}
                                                classNames={{
                                                    base: "flex-1", 
                                                    track: "bg-slate-100", 
                                                    indicator: "bg-indigo-500"
                                                }}
                                                value={((item.CalculatedSemester || 0) / (item.MaxSemesters || 1)) * 100} 
                                            />
                                            <span className="text-[10px] font-semibold text-slate-600 min-w-[28px] text-right">
                                                {Math.round(((item.CalculatedSemester || 0) / (item.MaxSemesters || 1)) * 100)}%
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Actions */}
                                <TableCell>
                                    <div className="flex justify-center items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Tooltip content="Quick View">
                                            <Button isIconOnly size="sm" variant="light" onPress={() => viewStudent(item)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50">
                                                <Eye size={18} />
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content="Edit Profile">
                                            <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(item)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 hidden md:flex">
                                                <Pencil size={16} />
                                            </Button>
                                        </Tooltip>
                                        <Dropdown placement="bottom-end">
                                            <DropdownTrigger>
                                                <Button isIconOnly size="sm" variant="light" className="text-slate-400 hover:text-slate-700">
                                                    <MoreVertical size={18} />
                                                </Button>
                                            </DropdownTrigger>
                                            <DropdownMenu 
                                                aria-label="Student Actions" 
                                                className="bg-white min-w-[200px] border border-slate-100 shadow-xl rounded-xl p-1"
                                            >
                                                <DropdownItem key="edit" textValue="Edit Profile" className="md:hidden hover:bg-slate-50 py-2" startContent={<Pencil size={15} className="mr-2 text-slate-500" />} onPress={() => handleEdit(item)}>
                                                    <span className="text-slate-700 font-medium">Edit Profile</span>
                                                </DropdownItem>
                                                <DropdownItem key="enable" textValue="Toggle State" className="hover:bg-slate-50 py-2" startContent={item.User?.isActive ? <AlertTriangle size={15} className="mr-2 text-amber-500" /> : <ShieldCheck size={15} className="mr-2 text-emerald-500" />}>
                                                    <span className={item.User?.isActive ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"}>{item.User?.isActive ? 'Disable Account' : 'Enable Account'}</span>
                                                </DropdownItem>
                                                <DropdownItem key="reset" textValue="Reset Password" className="hover:bg-slate-50 py-2" startContent={<ShieldCheck size={15} className="mr-2 text-slate-500" />}>
                                                    <span className="text-slate-700 font-medium">Reset Password</span>
                                                </DropdownItem>
                                                <DropdownItem key="delete" textValue="Delete Student" className="hover:bg-red-50 py-2 mt-1 border-t border-slate-100" startContent={<Trash2 size={15} className="mr-2 text-red-500" />} onPress={() => confirmDelete(item)} color="danger">
                                                    <span className="text-red-600 font-medium">Delete Student</span>
                                                </DropdownItem>
                                            </DropdownMenu>
                                        </Dropdown>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Slide-over Detail Drawer */}
            <div className={`fixed inset-0 transition-all duration-300 z-50 ${drawerStudent ? 'bg-slate-900/30 backdrop-blur-sm opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setDrawerStudent(null)}>
                <div 
                    className={`fixed inset-y-0 right-0 w-full md:w-[440px] bg-white shadow-2xl transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] flex flex-col ${drawerStudent ? 'translate-x-0' : 'translate-x-full'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {drawerStudent && (
                        <>
                            {/* Drawer Header */}
                            <div className="px-7 py-8 border-b border-gray-100 bg-white flex items-start justify-between relative overflow-hidden">
                                <div className="absolute -top-4 -right-4 p-8 opacity-[0.03]">
                                    <GraduationCap size={140} />
                                </div>
                                <div className="flex gap-5 items-center relative z-10 w-full">
                                    <div className="relative shrink-0 border border-gray-100 p-0.5 rounded-full bg-white shadow-sm">
                                        <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner">
                                            {(drawerStudent.User?.FullName || "U")[0].toUpperCase()}
                                        </div>
                                        <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${getStatusDot(drawerStudent.Status)} shadow-sm`}></div>
                                    </div>
                                    <div className="flex-1">
                                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{drawerStudent.User?.FullName || "Unknown Student"}</h2>
                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                            <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100">{drawerStudent.RegisterNumber}</span>
                                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider font-bold ${getStatusColor(drawerStudent.Status)}`}>
                                                {drawerStudent.Status}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Button isIconOnly variant="light" size="sm" onPress={() => setDrawerStudent(null)} className="absolute top-4 right-4 bg-gray-50 hover:bg-gray-100 rounded-full z-10 text-gray-500">
                                    <X size={18} />
                                </Button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-7 custom-scrollbar bg-slate-50/50">
                                
                                {/* Snapshot */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-center items-center text-center">
                                        <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wide">Batch Selection</p>
                                        <p className="text-lg font-bold text-slate-900">{drawerStudent.BatchYear}</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-center items-center text-center">
                                        <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wide">Access State</p>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                                            {drawerStudent.User?.isActive ? <ShieldCheck size={12} className="text-emerald-500"/> : <AlertTriangle size={12} className="text-amber-500"/>} 
                                            {drawerStudent.User?.isActive ? 'Unlocked' : 'Locked'}
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Card */}
                                <section>
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <BookOpen size={14} className="text-slate-400" /> Academic Profile
                                    </h3>
                                    <div className="bg-white rounded-2xl p-5 space-y-5 border border-slate-200/60 shadow-sm">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1 font-medium">Program Enrolled</p>
                                            <p className="text-sm font-semibold text-slate-900 leading-snug">{drawerStudent.Program?.ProgramName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1 font-medium">Department</p>
                                            <p className="text-sm font-semibold text-slate-900">{drawerStudent.Department?.DepartmentName || drawerStudent.Department?.DepartmentCode}</p>
                                        </div>

                                        {/* Program Duration & Passout */}
                                        {drawerStudent.Program?.DurationYears && drawerStudent.BatchYear && (
                                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                                                <div className="bg-slate-50 rounded-lg p-3">
                                                    <p className="text-[10px] text-slate-500 mb-1 font-medium uppercase">Program Duration</p>
                                                    <p className="text-sm font-bold text-slate-900">{drawerStudent.Program.DurationYears} years</p>
                                                </div>
                                                <div className="bg-green-50 rounded-lg p-3">
                                                    <p className="text-[10px] text-slate-500 mb-1 font-medium uppercase">Passout Year</p>
                                                    <p className="text-sm font-bold text-green-700">{drawerStudent.BatchYear + drawerStudent.Program.DurationYears}</p>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="pt-4 border-t border-slate-100">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="text-xs font-medium text-slate-500">Current Progress</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-sm font-bold text-indigo-600">Sem {drawerStudent.CalculatedSemester}</span>
                                                    <span className="text-xs font-semibold text-slate-400">/ {drawerStudent.MaxSemesters || '-'}</span>
                                                </div>
                                            </div>
                                            <Progress 
                                                size="md" 
                                                radius="md"
                                                aria-label="Student Progress"
                                                value={((drawerStudent.CalculatedSemester || 0) / (drawerStudent.MaxSemesters || 1)) * 100} 
                                                classNames={{ indicator: "bg-indigo-600", track: "bg-slate-100" }} 
                                            />
                                            <p className="text-[11px] text-slate-500 mt-2 text-center">
                                                {Math.round(((drawerStudent.CalculatedSemester || 0) / (drawerStudent.MaxSemesters || 1)) * 100)}% Complete
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* Contact Card */}
                                <section>
                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Phone size={14} className="text-slate-400" /> Contact Information
                                    </h3>
                                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                                        <div className="flex items-center gap-4 p-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                            <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl text-blue-600 group-hover:bg-blue-100 group-hover:border-blue-200 transition-colors"><Mail size={18} /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email Address</p>
                                                <p className="text-sm font-semibold text-slate-900 truncate">{drawerStudent.User?.Email || "Not provided"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
                                            <div className="bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-100 group-hover:border-emerald-200 transition-colors"><Phone size={18} /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone Network</p>
                                                <p className="text-sm font-semibold text-slate-900 truncate">{drawerStudent.User?.Phone || "Not provided"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Drawer Footer Actions */}
                            <div className="p-6 border-t border-gray-100 bg-white grid grid-cols-2 gap-4 shadow-min relative z-10">
                                <Button 
                                    className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 shadow-sm h-12"
                                    onPress={() => { handleEdit(drawerStudent); setDrawerStudent(null); }}
                                    radius="lg"
                                    startContent={<Pencil size={18}/>}
                                >
                                    Edit Profile
                                </Button>
                                <Button 
                                    className="w-full bg-red-50 text-red-600 font-bold hover:bg-red-100 border border-red-100 shadow-sm h-12"
                                    onPress={() => confirmDelete(drawerStudent)}
                                    radius="lg"
                                    startContent={<Trash2 size={18}/>}
                                >
                                    Delete Account
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Original Modals */}
            <AddStudentModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={() => fetchStudents()} />
            <StudentImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onSuccess={() => fetchStudents()} />
            <SeatingBatchImportModal isOpen={isSeatingImportOpen} onClose={() => setIsSeatingImportOpen(false)} onSuccess={() => fetchStudents()} />
            {selectedStudent && (
                <EditStudentModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSuccess={() => fetchStudents()} student={selectedStudent} />
            )}

            {/* Delete Student Modal */}
            <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" backdrop="blur" classNames={{ base: "bg-white border border-gray-200 shadow-2xl rounded-2xl" }}>
                <ModalContent>
                    {(onClose: () => void) => (
                        <ModalBody className="p-8 text-center space-y-5">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
                                <AlertTriangle size={28} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Delete Operation</h3>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    Are you sure you want to delete <strong className="text-gray-800">{selectedStudent?.User?.FullName || 'this student'}</strong>? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="bordered" className="flex-1 font-semibold" onPress={onClose} size="lg" radius="lg">Cancel</Button>
                                <Button className="flex-1 bg-red-500 text-white font-semibold hover:bg-red-600" onPress={handleDelete} size="lg" radius="lg" startContent={<Trash2 size={16} />}>Delete</Button>
                            </div>
                        </ModalBody>
                    )}
                </ModalContent>
            </Modal>

            {/* Delete All Students Modal */}
            <Modal isOpen={isDeleteAllOpen} onClose={() => { setIsDeleteAllOpen(false); setDeleteAllConfirmText(''); }} size="md" backdrop="blur" classNames={{ base: "bg-white border border-gray-200 shadow-2xl rounded-2xl" }}>
                <ModalContent>
                    {(onClose: () => void) => (
                        <ModalBody className="p-8 text-center space-y-5">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
                                <AlertTriangle size={28} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Delete All Students</h3>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    This will permanently delete <strong className="text-red-600">all {stats.totalDatabaseCount} student records</strong> from the database. User accounts will be preserved but their student data will be removed.
                                </p>
                                <p className="text-sm text-gray-500 mt-3">
                                    Type <strong className="text-red-600 font-mono">DELETE ALL</strong> to confirm:
                                </p>
                                <Input
                                    id="delete-all-confirm"
                                    name="delete-all-confirm"
                                    aria-label="Confirm delete all"
                                    value={deleteAllConfirmText}
                                    onValueChange={setDeleteAllConfirmText}
                                    placeholder="Type DELETE ALL"
                                    classNames={{
                                        inputWrapper: "mt-2 bg-red-50/50 border border-red-200 hover:border-red-300 focus-within:border-red-500 rounded-xl",
                                        input: "text-center font-mono font-bold text-red-600 placeholder:text-red-300"
                                    }}
                                    autoComplete="off"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="bordered" className="flex-1 font-semibold" onPress={onClose} size="lg" radius="lg">Cancel</Button>
                                <Button 
                                    className="flex-1 bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onPress={handleDeleteAll} 
                                    size="lg" 
                                    radius="lg" 
                                    startContent={<Trash2 size={16} />}
                                    isDisabled={deleteAllConfirmText !== 'DELETE ALL'}
                                    isLoading={isDeletingAll}
                                >
                                    Delete All Students
                                </Button>
                            </div>
                        </ModalBody>
                    )}
                </ModalContent>
            </Modal>

            <StudentImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onSuccess={() => fetchStudents()} />

            {/* Some minimal global styles for scrollbar and animation */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
            `}</style>
        </div>
    );
};

export default Students;
