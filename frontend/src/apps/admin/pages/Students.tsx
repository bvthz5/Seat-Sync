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
    Eye, X, Plus, UserCircle, Key, KeyRound, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import StudentImportModal from '../components/students/StudentImportModal';

import { AddStudentModal } from '../components/students/AddStudentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import StudentQuickViewDrawer from '../components/students/StudentQuickViewDrawer';
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
    Source?: 'Self Registered' | 'Admin Added' | 'Imported';
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
    
    // For the UI Dropdowns - Now with dynamic batch years fetched from API
    const [departments, setDepartments] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [batchYears, setBatchYears] = useState<number[]>([]);  // Dynamic batch years from API
    const [statusOptions, setStatusOptions] = useState<Array<{ value: string; label: string; color?: string }>>([
        { value: 'Active', label: 'Active', color: 'emerald' },
        { value: 'Incomplete', label: 'Incomplete', color: 'amber' },
        { value: 'Pending', label: 'Pending', color: 'blue' },
        { value: 'Disabled', label: 'Disabled', color: 'red' }
    ]);
    const [sourceOptions, setSourceOptions] = useState<Array<{ value: string; label: string }>>([
        { value: 'Self Registered', label: 'Self Registered' },
        { value: 'Admin Added', label: 'Admin Added' },
        { value: 'Imported', label: 'Imported' }
    ]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [isDeletingAll, setIsDeletingAll] = useState(false);
    const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
    
    // New modal states for disable, reset password, and delete
    const [isDisableOpen, setIsDisableOpen] = useState(false);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
    const [shouldResetPassword, setShouldResetPassword] = useState(false);
    const [resetPasswordData, setResetPasswordData] = useState<{ tempPassword: string; email: string } | null>(null);
    const [isDisabling, setIsDisabling] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [drawerStudent, setDrawerStudent] = useState<Student | null>(null);

    // Fetch helper functions - Enhanced for scalability
    const fetchDropdownData = async () => {
        try {
            // Fetch all filter data in parallel for better performance
            const [deptRes, progRes, filterRes] = await Promise.all([
                api.get('/departments').catch(() => ({ data: { data: [] } })),
                api.get('/programs').catch(() => ({ data: { data: [] } })),
                // Fetch filter metadata (batch years, semesters, status, source options) from backend
                api.get('/students/meta/filter-options').catch(() => ({ data: { batchYears: [], semesters: [], statusOptions: [], sourceOptions: [] } }))
            ]);
            
            setDepartments(deptRes.data?.data || deptRes.data || []);
            setPrograms(progRes.data?.data || progRes.data || []);
            
            // Use dynamic batch years from API
            const fetchedBatchYears = filterRes.data?.batchYears || [];
            const batchYearsToSet = fetchedBatchYears.length > 0 
                ? fetchedBatchYears
                : Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
            setBatchYears(batchYearsToSet);
            
            // Use dynamic semesters from API - Deduplicate by SemesterNumber
            const fetchedSemesters = filterRes.data?.semesters || [];
            const semestersToSet = fetchedSemesters.length > 0 
                ? fetchedSemesters
                : [...Array(8)].map((_, i) => ({ SemesterID: i + 1, SemesterNumber: i + 1 }));
            
            // Deduplicate semesters by SemesterNumber (business value, not ID)
            const uniqueSemesterMap = new Map<number, any>();
            semestersToSet.forEach((s: any) => {
                if (!uniqueSemesterMap.has(s.SemesterNumber)) {
                    uniqueSemesterMap.set(s.SemesterNumber, s);
                }
            });
            const uniqueSemesters = Array.from(uniqueSemesterMap.values())
                .sort((a, b) => a.SemesterNumber - b.SemesterNumber);
            setSemesters(uniqueSemesters);

            // Use dynamic status options from API
            const fetchedStatusOptions = filterRes.data?.statusOptions || [];
            if (fetchedStatusOptions.length > 0) {
                // Add color mappings for UI
                const statusWithColors = fetchedStatusOptions.map((s: any) => ({
                    ...s,
                    color: s.value === 'Active' ? 'emerald' 
                        : s.value === 'Incomplete' ? 'amber'
                        : s.value === 'Pending' ? 'blue'
                        : 'red'
                }));
                setStatusOptions(statusWithColors);
            }

            // Use dynamic source options from API
            const fetchedSourceOptions = filterRes.data?.sourceOptions || [];
            if (fetchedSourceOptions.length > 0) {
                setSourceOptions(fetchedSourceOptions);
            }
        } catch (error) {
            console.error('Failed to load filter dropdown data', error);
            // Graceful fallback to default values
            setBatchYears(Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i));
            const fallbackSemesters = [...Array(8)].map((_, i) => ({ SemesterID: i + 1, SemesterNumber: i + 1 }));
            setSemesters(fallbackSemesters);
        }
    };

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            // Debug log for filters
            if (filters.semester) {
                console.log(`[Frontend] Fetching students with Semester Filter: ${filters.semester}`);
                console.log(`[Frontend] Full filters:`, filters);
            }
            
            const res = await api.get('/students', {
                params: { page, limit: 10, search: debouncedSearch, ...filters }
            });
            const fetchedStudents = res.data.students || [];
            
            if (filters.semester) {
                console.log(`[Frontend] Response received: ${fetchedStudents.length} students`);
            }
            
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
                    
                    let programDurationYears = programData?.DurationYears || 3;
                    let programTotalSemesters = programData?.TotalSemesters || 6;

                    // Remove the strict check forcing Incomplete if duration is 0
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
                    if ((s.User?.isActive as any) === false) calculatedStatus = 'Disabled';
                    else if ((s.User?.isActive as any) !== false) {
                        if (s.User?.FullName && s.RegisterNumber && s.ProgramID) {
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

                // Apply client-side filtering for calculated fields (Status, Source)
                let filteredStudents = enhancedStudents;
                
                // Filter by Status (calculated field)
                if (filters.status) {
                    filteredStudents = filteredStudents.filter((s: any) => s.Status === filters.status);
                }
                
                // Note: Source filter would require tracking how each student was added (Self Registered, Admin Added, Imported)
                // For now, filtering by status only

                // Batch state updates to avoid multiple renders
                setStudents(filteredStudents);
                setTotalPages(res.data.totalPages || 1);

                const rawStats = res.data.stats || {};
                setStats({
                    activeDepartments: rawStats.activeDepartments ?? 0,
                    activeBatches: rawStats.activeBatches ?? 0,
                    incompleteProfiles: rawStats.incompleteProfiles ?? 0,
                    totalDatabaseCount: rawStats.totalDatabaseCount ?? 0,
                    activeStudents: rawStats.activeStudents ?? 0,
                    selfRegistered: rawStats.selfRegistered ?? 0,
                    adminAdded: rawStats.adminAdded ?? 0,
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

    // Handle reset password when flag is set
    useEffect(() => {
        if (shouldResetPassword && selectedStudent) {
            handleResetPassword();
            setShouldResetPassword(false);
        }
    }, [shouldResetPassword, selectedStudent]);

    const handleEdit = (student: Student) => { setSelectedStudent(student); setIsEditOpen(true); };
    const confirmDelete = (student: Student) => { setSelectedStudent(student); setIsDeleteOpen(true); };
    const viewStudent = (student: Student) => { setDrawerStudent(student); };

    // New handlers for disable, reset password
    const handleDisableAccount = async () => {
        if (!selectedStudent) return;
        setIsDisabling(true);
        try {
            const isCurrentlyActive = selectedStudent.User?.isActive;
            await api.patch(`/students/${selectedStudent.StudentID}/toggle-status`);
            const action = isCurrentlyActive ? "disabled" : "enabled";
            toast.success(`Student account ${action} successfully`);
            setIsDisableOpen(false);
            setSelectedStudent(null);
            fetchStudents();
            if (drawerStudent?.StudentID === selectedStudent.StudentID) {
                setDrawerStudent(null);
            }
        } catch (error: any) { 
            toast.error(error?.response?.data?.message || "Failed to update account status");
        } finally {
            setIsDisabling(false);
        }
    };

    const handleResetPassword = async () => {
        if (!selectedStudent) return;
        setIsResettingPassword(true);
        try {
            const response = await api.post(`/students/${selectedStudent.StudentID}/reset-password`);
            setResetPasswordData({
                tempPassword: response.data.tempPassword,
                email: response.data.email
            });
            setIsResetPasswordOpen(true);
            toast.success("Password reset successfully");
            fetchStudents();
        } catch (error: any) { 
            toast.error(error?.response?.data?.message || "Failed to reset password");
        } finally {
            setIsResettingPassword(false);
        }
    };

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

    const handleExportCredentials = async () => {
        try {
            toast.loading("Generating credentials report...", { id: "export-creds" });
            const response = await api.get('/students/export-credentials', {
                params: {
                    dept: filters.dept
                },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'Student_Credentials_List.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Credentials report downloaded", { id: "export-creds" });
        } catch (error) {
            toast.error("Failed to export credentials", { id: "export-creds" });
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

    const handleSelectChange = (key: keyof typeof filters) => (keys: "all" | Set<React.Key>) => {
        if (keys === "all") {
            return;
        }
        const selectedKey = Array.from(keys)[0];
        handleFilterChange(key, selectedKey ? String(selectedKey) : "");
    };

    // Calculate active filters
    // Calculate active filters
    const activeFiltersCount = Object.values(filters).filter(Boolean).length;
    const clearFilters = () => {
        setFilters({ dept: "", program: "", semester: "", status: "", source: "", batch: "" });
        setPage(1);
    };

    // Deduplicated filter options
    const uniqueDepartments = React.useMemo(() => {
        const map = new Map();
        (departments || []).forEach(d => {
            const id = d?.DepartmentID?.toString();
            if (id && !map.has(id)) {
                map.set(id, d);
            }
        });
        return Array.from(map.values());
    }, [departments]);

    const uniquePrograms = React.useMemo(() => {
        const map = new Map();
        (programs || []).forEach(p => {
            const id = p?.ProgramID?.toString();
            if (id && !map.has(id)) {
                map.set(id, p);
            }
        });
        return Array.from(map.values());
    }, [programs]);

    const uniqueBatchYears = React.useMemo(() => {
        const set = new Set<number>();
        (batchYears || []).forEach(y => {
            if (y && !isNaN(Number(y))) set.add(Number(y));
        });
        if (set.size === 0) {
            const currentY = new Date().getFullYear();
            for (let i = 0; i < 8; i++) set.add(currentY - i);
        }
        return Array.from(set).sort((a, b) => b - a);
    }, [batchYears]);

    const uniqueSemestersList = React.useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8], []);

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
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><Users size={48}/></div>
                <p className="text-blue-100 font-bold text-xs uppercase tracking-wider">Total Students</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white">{stats.totalDatabaseCount}</h3>
                </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-800 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><CheckCircle2 size={48}/></div>
                <p className="text-emerald-100 font-bold text-xs uppercase tracking-wider">Active Students</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white">{stats.activeStudents}</h3>
                </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 via-orange-600 to-amber-800 rounded-2xl p-5 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><AlertTriangle size={48}/></div>
                <p className="text-amber-100 font-bold text-xs uppercase tracking-wider">Incomplete Profiles</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white">{stats.incompleteProfiles}</h3>
                </div>
            </div>
            <div className="bg-gradient-to-br from-purple-600 via-violet-700 to-purple-900 rounded-2xl p-5 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><UserCircle size={48}/></div>
                <p className="text-purple-100 font-bold text-xs uppercase tracking-wider">Self Registered</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white">{stats.selfRegistered}</h3>
                </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform"><ShieldCheck size={48}/></div>
                <p className="text-indigo-100 font-bold text-xs uppercase tracking-wider">Admin Added</p>
                <div className="mt-2 flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-white">{stats.adminAdded}</h3>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative max-w-[1600px] mx-auto space-y-6 pb-10 min-h-screen">

            {/* Header Title with Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <GraduationCap className="text-indigo-600" size={24}/> University Students
                    </h1>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">End-Semester Examination Management Portal</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button 
                        color="primary" 
                        variant="shadow"
                        startContent={<Plus size={18}/>} 
                        onPress={() => setIsAddOpen(true)} 
                        className="font-black rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200"
                    >
                        Add Student
                    </Button>
                    <Button 
                        color="primary" 
                        variant="shadow" 
                        startContent={<FileSpreadsheet size={18}/>} 
                        onPress={() => setIsImportOpen(true)} 
                        className="font-black rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-200"
                    >
                        Import Data
                    </Button>
                    <Button 
                        variant="shadow" 
                        color="warning" 
                        startContent={<KeyRound size={18}/>} 
                        onPress={handleExportCredentials}
                        className="font-black rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-orange-200"
                    >
                        Passwords
                    </Button>
                    <Button 
                        color="secondary" 
                        variant="shadow" 
                        startContent={<BookOpen size={18}/>} 
                        onPress={async () => {
                            toast.loading("Syncing semesters...", { id: "sync-sems" });
                            try {
                                await api.post('/students/sync-semesters');
                                toast.success("Semesters synced successfully", { id: "sync-sems" });
                                fetchStudents();
                            } catch (error: any) {
                                toast.error(error?.response?.data?.message || "Failed to sync", { id: "sync-sems" });
                            }
                        }}
                        className="font-black rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-purple-200"
                    >
                        Sync Semesters
                    </Button>
                    <Button 
                        variant="shadow" 
                        startContent={<FileDown size={18}/>} 
                        onPress={handleExport}
                        className="font-black rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-slate-200"
                    >
                        Export
                    </Button>
                    <Button 
                        color="danger" 
                        variant="shadow" 
                        startContent={<Trash2 size={18}/>} 
                        onPress={() => setIsDeleteAllOpen(true)} 
                        className="font-black rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200"
                    >
                        Delete All
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <TopSummaryCards />

            {/* Controls Bar: Search & Advanced Filters */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1 max-w-xl h-11 bg-white border border-slate-200 shadow-sm rounded-xl flex items-center overflow-hidden focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
                        <div className="px-3.5 py-2.5 bg-slate-50 border-r border-slate-200/90 flex items-center justify-center shrink-0 h-full">
                            <Search size={16} className="text-slate-400" />
                        </div>
                        <input
                            type="text"
                            id="student-search-enhanced"
                            name="student-search-enhanced"
                            autoComplete="off"
                            placeholder="Search by student name, register number, or email..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                            className="w-full !h-full !px-3.5 !py-0 !bg-transparent !border-none !shadow-none !rounded-none !outline-none !ring-0 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:!outline-none focus:!ring-0 focus:!border-none"
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="text-slate-400 hover:text-slate-600 pr-3.5 pl-1 h-full flex items-center justify-center transition-colors shrink-0"
                            >
                                <X size={14} />
                            </button>
                        )}
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
                                className="font-bold text-xs text-rose-600 hover:bg-rose-50 rounded-xl"
                            >
                                Clear Filters ({activeFiltersCount})
                            </Button>
                        </div>
                    )}
                </div>

                {/* Filter Dropdowns Row */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="relative flex items-center">
                        <select
                            id="filter-dept"
                            name="filter-dept"
                            value={filters.dept}
                            onChange={(e) => handleFilterChange('dept', e.target.value)}
                            className="w-full h-10 bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 focus:border-indigo-600 focus:bg-white text-xs font-semibold text-slate-700 px-3 pr-8 rounded-xl outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="" className="text-slate-400">All Departments</option>
                            {uniqueDepartments.map(d => (
                                <option key={d.DepartmentID} value={d.DepartmentID?.toString()}>{d.DepartmentCode || d.DepartmentName}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative flex items-center">
                        <select
                            id="filter-program"
                            name="filter-program"
                            value={filters.program}
                            onChange={(e) => handleFilterChange('program', e.target.value)}
                            className="w-full h-10 bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 focus:border-indigo-600 focus:bg-white text-xs font-semibold text-slate-700 px-3 pr-8 rounded-xl outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="" className="text-slate-400">All Programs</option>
                            {uniquePrograms.map(p => (
                                <option key={p.ProgramID} value={p.ProgramID?.toString()}>{p.ProgramName}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative flex items-center">
                        <select
                            id="filter-batch"
                            name="filter-batch"
                            value={filters.batch}
                            onChange={(e) => handleFilterChange('batch', e.target.value)}
                            className="w-full h-10 bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 focus:border-indigo-600 focus:bg-white text-xs font-semibold text-slate-700 px-3 pr-8 rounded-xl outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="" className="text-slate-400">All Batches</option>
                            {uniqueBatchYears.map(year => (
                                <option key={year} value={year.toString()}>Batch {year}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative flex items-center">
                        <select
                            id="filter-semester"
                            name="filter-semester"
                            value={filters.semester}
                            onChange={(e) => handleFilterChange('semester', e.target.value)}
                            className="w-full h-10 bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 focus:border-indigo-600 focus:bg-white text-xs font-semibold text-slate-700 px-3 pr-8 rounded-xl outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="" className="text-slate-400">All Semesters</option>
                            {uniqueSemestersList.map(semNum => (
                                <option key={semNum} value={semNum.toString()}>Semester {semNum}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative flex items-center">
                        <select
                            id="filter-status"
                            name="filter-status"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full h-10 bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 focus:border-indigo-600 focus:bg-white text-xs font-semibold text-slate-700 px-3 pr-8 rounded-xl outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="" className="text-slate-400">All Statuses</option>
                            {statusOptions.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="relative flex items-center">
                        <select
                            id="filter-source"
                            name="filter-source"
                            value={filters.source}
                            onChange={(e) => handleFilterChange('source', e.target.value)}
                            className="w-full h-10 bg-slate-50/80 border border-slate-200/90 hover:border-indigo-300 focus:border-indigo-600 focus:bg-white text-xs font-semibold text-slate-700 px-3 pr-8 rounded-xl outline-none transition-all cursor-pointer appearance-none"
                        >
                            <option value="" className="text-slate-400">All Sources</option>
                            {sourceOptions.map(source => (
                                <option key={source.value} value={source.value}>{source.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden auto-scroll overflow-x-auto relative">
                <Table
                    aria-label="Students Directory Table"
                    shadow="none"
                    classNames={{
                        wrapper: "p-0 rounded-none bg-transparent",
                        th: "bg-slate-50/80 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider h-11 border-b border-slate-200 px-5 z-10 sticky top-0",
                        td: "py-3 border-b border-slate-100 group-last:border-none px-5",
                        table: "min-w-[1000px] min-h-[400px]"
                    }}
                    bottomContent={
                        totalPages > 1 && (
                            <div className="flex w-full justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50/30">
                                <span className="text-sm text-slate-500 font-medium">Showing page {page} of {totalPages}</span>
                                <Pagination
                                    total={totalPages}
                                    page={page}
                                    onChange={setPage}
                                    color="primary"
                                    showControls
                                    showShadow
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
                        <TableColumn align="start" width={300} className="font-extrabold text-slate-500 uppercase tracking-wider text-xs text-left">Student</TableColumn>
                        <TableColumn align="start" width={160} className="font-extrabold text-slate-500 uppercase tracking-wider text-xs text-left">Program</TableColumn>
                        <TableColumn align="center" width={110} className="font-extrabold text-slate-500 uppercase tracking-wider text-xs text-center">Department</TableColumn>
                        <TableColumn align="center" width={110} className="font-extrabold text-slate-500 uppercase tracking-wider text-xs text-center">Batch</TableColumn>
                        <TableColumn align="center" width={110} className="font-extrabold text-slate-500 uppercase tracking-wider text-xs text-center">Semester</TableColumn>
                        <TableColumn align="center" width={130} className="font-extrabold text-slate-500 uppercase tracking-wider text-xs text-center">Status</TableColumn>
                        <TableColumn align="center" width={120} className="font-extrabold text-slate-500 uppercase tracking-wider text-xs text-center">Actions</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                                    <Search size={28} className="text-indigo-300" />
                                </div>
                                <p className="text-lg font-semibold text-slate-800">No students found</p>
                                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">We couldn't find any students matching your current search or filter criteria.</p>
                                {(searchQuery || activeFiltersCount > 0) && (
                                    <Button onPress={clearFilters} variant="flat" className="mt-4 font-bold" color="primary">Clear all filters</Button>
                                )}
                            </div>
                        }
                        isLoading={isLoading}
                    >
                        {students.map((item) => (
                            <TableRow key={item.StudentID} className="hover:bg-slate-50/60 transition-colors group cursor-pointer">
                                {/* Student Info */}
                                <TableCell className="text-left">
                                    <div className="flex items-center gap-3 w-full py-1.5" onClick={(e) => { e.stopPropagation(); viewStudent(item); }}>
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-extrabold text-xs shadow-sm shrink-0">
                                            {(item.User?.FullName || "U")[0].toUpperCase()}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <p className="font-bold text-slate-900 text-xs truncate group-hover:text-indigo-600 transition-colors">
                                                {item.User?.FullName || "Unknown"}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-bold tracking-wider">
                                                    {item.RegisterNumber}
                                                </span>
                                                {item.User?.Email && (
                                                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{item.User?.Email}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                
                                {/* Program */}
                                <TableCell className="text-left font-semibold text-xs text-slate-700">
                                    {item.Program?.ProgramName || 'Unknown Program'}
                                </TableCell>

                                {/* Department */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Chip size="sm" variant="flat" className="bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 text-xs">
                                            {item.Department?.DepartmentCode || item.Department?.DepartmentName || '-'}
                                        </Chip>
                                    </div>
                                </TableCell>

                                {/* Batch */}
                                <TableCell className="text-center font-bold text-xs text-slate-700">
                                    {item.BatchYear ? `Batch ${item.BatchYear}` : '-'}
                                </TableCell>

                                {/* Semester */}
                                <TableCell className="text-center">
                                    <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-black text-xs font-mono">
                                        S{item.CalculatedSemester || item.Semester?.SemesterNumber || '-'}
                                    </span>
                                </TableCell>

                                {/* Status */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <div className={`
                                            inline-flex items-center justify-center px-3 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-widest shadow-sm border
                                            ${
                                                item.Status === 'Active' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/50' :
                                                item.Status === 'Incomplete' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-400/50' :
                                                item.Status === 'Pending' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400/50' :
                                                item.Status === 'Disabled' ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white border-rose-400/50' :
                                                'bg-slate-100 text-slate-500 border-slate-200'
                                            }
                                        `}>
                                            {item.Status || 'UNKNOWN'}
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="text-center">
                                    <div className="flex justify-center items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <Tooltip content="Quick View" delay={500}>
                                            <Button isIconOnly size="sm" variant="light" onPress={() => viewStudent(item)}>
                                                <Eye size={17} className="text-slate-500" />
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content="Edit Profile" delay={500}>
                                            <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(item)}>
                                                <Pencil size={16} className="text-slate-500" />
                                            </Button>
                                        </Tooltip>
                                        <Dropdown 
                                            placement="bottom-end"
                                            classNames={{
                                                content: "!bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 min-w-[190px] z-[9999] opacity-100"
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "!bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 z-[9999] opacity-100 min-w-[190px]"
                                                }
                                            }}
                                        >
                                            <DropdownTrigger>
                                                <Button isIconOnly size="sm" variant="light" className="text-slate-400 hover:text-slate-700">
                                                    <MoreVertical size={18} />
                                                </Button>
                                            </DropdownTrigger>
                                            <DropdownMenu 
                                                aria-label="Student Actions" 
                                                className="bg-white min-w-[190px] border-none p-1"
                                            >
                                                <DropdownItem key="edit" textValue="Edit Profile" className="md:hidden hover:bg-slate-50 py-2" startContent={<Pencil size={15} className="mr-2 text-slate-500" />} onPress={() => handleEdit(item)}>
                                                    <span className="text-slate-700 font-medium">Edit Profile</span>
                                                </DropdownItem>
                                                <DropdownItem key="enable" textValue="Toggle State" className="hover:bg-slate-50 py-2" startContent={item.User?.isActive ? <AlertTriangle size={15} className="mr-2 text-amber-500" /> : <ShieldCheck size={15} className="mr-2 text-emerald-500" />} onPress={() => { setSelectedStudent(item); setIsDisableOpen(true); }}>
                                                    <span className={item.User?.isActive ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"}>{item.User?.isActive ? 'Disable Account' : 'Enable Account'}</span>
                                                </DropdownItem>
                                                <DropdownItem key="reset" textValue="Reset Password" className="hover:bg-slate-50 py-2" startContent={<ShieldCheck size={15} className="mr-2 text-slate-500" />} onPress={() => { setSelectedStudent(item); setIsResetConfirmOpen(true); }}>
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

            {/* Slide-over Detail Drawer - Using Dedicated Component */}
            <StudentQuickViewDrawer
                student={drawerStudent}
                isOpen={!!drawerStudent}
                onClose={() => setDrawerStudent(null)}
                onEdit={(student) => {
                    handleEdit(student);
                    setDrawerStudent(null);
                }}
                onDelete={(student) => {
                    confirmDelete(student);
                    setDrawerStudent(null);
                }}
            />

            {/* Original Modals */}
            <AddStudentModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={() => fetchStudents()} />
            <StudentImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onSuccess={() => fetchStudents()} />

            {selectedStudent && (
                <EditStudentModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSuccess={() => fetchStudents()} student={selectedStudent} />
            )}

            {/* Reset Password Confirmation Modal */}
            <Modal isOpen={isResetConfirmOpen} onClose={() => setIsResetConfirmOpen(false)} size="sm" backdrop="blur" classNames={{ base: "bg-white border border-gray-200 shadow-2xl rounded-2xl" }}>
                <ModalContent>
                    {(onClose: () => void) => (
                        <ModalBody className="p-8 text-center space-y-5">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 flex items-center justify-center">
                                <KeyRound size={28} className="text-amber-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Reset Password?</h3>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    This will reset <strong className="text-gray-800">{selectedStudent?.User?.FullName}</strong>'s password to the default formula and force a change on their next login.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button variant="bordered" className="flex-1 font-semibold" onPress={onClose} size="lg" radius="lg">Cancel</Button>
                                <Button 
                                    className="flex-1 bg-amber-500 text-white font-semibold hover:bg-amber-600" 
                                    onPress={() => {
                                        setIsResetConfirmOpen(false);
                                        handleResetPassword();
                                    }} 
                                    size="lg" 
                                    radius="lg" 
                                    isLoading={isResettingPassword}
                                    startContent={!isResettingPassword && <ShieldCheck size={16} />}
                                >
                                    Confirm
                                </Button>
                            </div>
                        </ModalBody>
                    )}
                </ModalContent>
            </Modal>

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

            {/* Disable/Enable Account Modal */}
            <Modal isOpen={isDisableOpen} onClose={() => setIsDisableOpen(false)} size="sm" backdrop="blur" classNames={{ base: "bg-white border border-gray-200 shadow-2xl rounded-2xl" }}>
                <ModalContent>
                    {(onClose: () => void) => {
                        const isCurrentlyActive = selectedStudent?.User?.isActive;
                        const action = isCurrentlyActive ? "Disable" : "Enable";
                        const bgColor = isCurrentlyActive ? "bg-amber-50" : "bg-emerald-50";
                        const textColor = isCurrentlyActive ? "text-amber-500" : "text-emerald-500";
                        const buttonColor = isCurrentlyActive ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600";
                        const icon = isCurrentlyActive ? <AlertTriangle size={28} /> : <ShieldCheck size={28} />;
                        
                        return (
                            <ModalBody className="p-8 text-center space-y-5">
                                <div className={`w-16 h-16 mx-auto rounded-2xl ${bgColor} flex items-center justify-center`}>
                                    <div className={textColor}>{icon}</div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{action} Student Account</h3>
                                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                        Are you sure you want to <strong className={isCurrentlyActive ? "text-amber-600" : "text-emerald-600"}>{action.toLowerCase()}</strong> the account for <strong className="text-gray-800">{selectedStudent?.User?.FullName || 'this student'}</strong>?
                                    </p>
                                    <p className="text-xs text-gray-400 mt-3">
                                        {isCurrentlyActive 
                                            ? "The student will not be able to log in or access the portal."
                                            : "The student will be able to log in and access the portal again."
                                        }
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="bordered" className="flex-1 font-semibold" onPress={onClose} size="lg" radius="lg">Cancel</Button>
                                    <Button 
                                        className={`flex-1 text-white font-semibold ${buttonColor}`}
                                        onPress={handleDisableAccount}
                                        size="lg" 
                                        radius="lg"
                                        isLoading={isDisabling}
                                        startContent={isCurrentlyActive ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
                                    >
                                        {action} Account
                                    </Button>
                                </div>
                            </ModalBody>
                        );
                    }}
                </ModalContent>
            </Modal>

            {/* Reset Password Modal */}
            <Modal isOpen={isResetPasswordOpen} onClose={() => { setIsResetPasswordOpen(false); setResetPasswordData(null); }} size="sm" backdrop="blur" classNames={{ base: "bg-white border border-gray-200 shadow-2xl rounded-2xl" }}>
                <ModalContent>
                    {(onClose: () => void) => {
                        const handleCopyPassword = () => {
                            if (resetPasswordData?.tempPassword) {
                                navigator.clipboard.writeText(resetPasswordData.tempPassword);
                                toast.success("Password copied to clipboard");
                            }
                        };
                        
                        return (
                            <ModalBody className="p-8 space-y-5">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center">
                                    <ShieldCheck size={28} className="text-emerald-500" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-gray-900">Password Reset Successfully</h3>
                                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                        A temporary password has been generated for <strong className="text-gray-800">{selectedStudent?.User?.FullName || 'the student'}</strong>.
                                    </p>
                                </div>
                                
                                {resetPasswordData && (
                                    <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</p>
                                            <p className="text-sm text-gray-800 font-mono break-all">{resetPasswordData.email}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Temporary Password</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-gray-800 font-mono font-bold flex-1">{resetPasswordData.tempPassword}</p>
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    className="text-slate-500 hover:text-slate-700"
                                                    onPress={handleCopyPassword}
                                                    title="Copy password"
                                                >
                                                    Copy
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                    <p className="text-xs font-semibold text-blue-900">Important Notes:</p>
                                    <ul className="text-xs text-blue-800 space-y-1">
                                        <li>• Student must change this password on first login</li>
                                        <li>• Share this password securely with the student</li>
                                        <li>• This password is temporary and should not be used permanently</li>
                                    </ul>
                                </div>

                                <Button 
                                    className="w-full bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                                    onPress={onClose}
                                    size="lg"
                                    radius="lg"
                                >
                                    Done
                                </Button>
                            </ModalBody>
                        );
                    }}
                </ModalContent>
            </Modal>

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
