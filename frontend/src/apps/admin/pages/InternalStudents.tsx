import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
    Chip, Pagination, Input, Tooltip, Select, SelectItem,
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Switch
} from '@heroui/react';
import { 
    Search, FileSpreadsheet, Pencil, Trash2, AlertTriangle, 
    GraduationCap, BookOpen, FileDown, Users, 
    MoreVertical, CheckCircle2, ShieldCheck, Mail, Phone,
    Eye, X, Plus, UserCircle, Key, KeyRound, Building2, RefreshCcw, RefreshCw, AlertCircle, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InternalStudentService } from '../services/internalStudentService';
import { useDebounce } from '../../../hooks/useDebounce';
import StudentImportModal from '../components/students/StudentImportModal';
import { AddStudentModal } from '../components/students/AddStudentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import StudentQuickViewDrawer from '../components/students/StudentQuickViewDrawer';

const InternalStudents: React.FC = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [importFromExams, setImportFromExams] = useState(true);
    
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [filters, setFilters] = useState({ dept: "", batch: "", sem: "" });
    
    const [filterOptions, setFilterOptions] = useState<{ departments: any[], batchYears: number[] }>({
        departments: [],
        batchYears: []
    });
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeStudents: 0,
        graduated: 0,
        dropped: 0,
        inactive: 0,
        adminAdded: 0,
        totalDepartments: 0
    });

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [drawerStudent, setDrawerStudent] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchFilterOptions = async () => {
        try {
            const data = await InternalStudentService.getFilterOptions();
            setFilterOptions(data);
        } catch (error) {
            console.error("Failed to load internal student filters", error);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const data = await InternalStudentService.getAllStudents({
                page,
                limit: 10,
                search: debouncedSearch,
                dept: filters.dept ? parseInt(filters.dept) : undefined,
                batch: filters.batch ? parseInt(filters.batch) : undefined,
                sem: filters.sem ? filters.sem : undefined
            });
            setStudents(data.students || []);
            setTotalPages(data.totalPages || 1);
            setTotalCount(data.totalItems || 0);
            if (data.stats) {
                setStats(data.stats);
            }
        } catch (error) {
            toast.error("Failed to load internal students");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFilterOptions(); }, []);
    useEffect(() => { fetchStudents(); }, [page, debouncedSearch, filters]);

    const handleDelete = async () => {
        if (!selectedStudent) return;
        setIsDeleting(true);
        try {
            await InternalStudentService.deleteStudent(selectedStudent.InternalStudentID);
            toast.success("Internal student record deleted");
            setIsDeleteOpen(false);
            fetchStudents();
        } catch (error) {
            toast.error("Failed to delete student");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleImportSuccess = () => {
        setIsImportOpen(false);
        fetchStudents();
        toast.success("Students imported successfully");
    };

    const handleDeleteAll = async () => {
        setIsDeleting(true);
        try {
            await InternalStudentService.deleteAllInternalStudents();
            toast.success("All internal student records cleared");
            setIsDeleteAllOpen(false);
            fetchStudents();
        } catch (error) {
            toast.error("Failed to clear records");
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportPasswords = async () => {
        const toastId = toast.loading("Generating credentials list...");
        try {
            const data = await InternalStudentService.exportPasswords(filters.dept);
            
            // Success case: data is a blob
            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Internal_Passwords_${new Date().toLocaleDateString()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            toast.success("Credentials exported successfully", { id: toastId });
        } catch (error: any) {
            console.error("Export Error:", error);
            
            let message = "Failed to export passwords";
            
            // If error is a Blob (common when responseType is 'blob'), parse it to read the JSON error
            if (error.response?.data instanceof Blob) {
                const text = await error.response.data.text();
                try {
                    const json = JSON.parse(text);
                    message = json.message || message;
                } catch (e) {
                    // Not JSON, use default message
                }
            } else if (error.response?.data?.message) {
                message = error.response.data.message;
            } else if (error.message) {
                message = error.message;
            }

            toast.error(message, { id: toastId });
        }
    };

    const handleSyncSemesters = async () => {
        try {
            setIsSyncing(true);
            const result = await InternalStudentService.syncSemesters();
            toast.success(`Successfully updated ${result.updatedCount || 0} student semesters`);
            fetchStudents();
        } catch (error: any) {
            toast.error(error.message || "Failed to sync semesters");
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSelectChange = (key: string) => (keys: any) => {
        const value = Array.from(keys)[0] as string;
        setFilters(prev => ({ ...prev, [key]: value || "" }));
        setPage(1);
    };

    const handleEdit = (student: any) => {
        setSelectedStudent(student);
        setIsEditOpen(true);
    };

    const viewStudent = (student: any) => {
        const semNum = student.SemesterModel?.SemesterNumber 
            || (typeof student.Semester === 'object' ? student.Semester?.SemesterNumber : null)
            || (typeof student.Semester === 'string' ? parseInt(student.Semester.replace(/[^0-9]/g, ''), 10) : null)
            || (typeof student.Semester === 'number' ? student.Semester : null);

        const transformed: any = {
            StudentID: student.InternalStudentID,
            RegisterNumber: student.RegisterNumber,
            RollNumber: student.RollNumber,
            Division: student.Division,
            BatchYear: student.BatchYear || student.BatchStart,
            User: {
                FullName: student.FullName,
                Email: student.User?.Email || 'N/A',
                isActive: student.Status === 'ACTIVE',
            },
            Department: student.Department,
            Program: student.Program,
            Semester: { SemesterNumber: semNum },
            CalculatedSemester: semNum,
            MaxSemesters: student.Program?.TotalSemesters || 8,
            Status: student.Status === 'ACTIVE' ? 'Active' : student.Status
        };
        setDrawerStudent(transformed);
        setIsQuickViewOpen(true);
    };

    return (
        <div className="max-w-[1600px] mx-auto pt-6 px-4 md:px-8 pb-12 space-y-6">
            {/* Header Title + Action Buttons Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                            <Users size={22} />
                        </div>
                        Internal Students
                    </h1>
                    <p className="text-slate-500 font-medium text-xs mt-1">Manage isolated student records and class mappings for internal examinations</p>
                </div>

                {/* Ordered Action Buttons: Add Student -> Import Data -> Passwords -> Sync Semesters -> Export -> Delete All */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* 1. Add Student */}
                    <Button 
                        color="primary" 
                        variant="shadow"
                        startContent={<Plus size={18}/>} 
                        onPress={() => setIsAddOpen(true)} 
                        className="font-black rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200 h-10 px-4 text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Add Student
                    </Button>

                    {/* 2. Import Data (Disabled: Student registration is automated via Timetable import in Exams Page) */}
                    <Tooltip content="Student registration is automatically managed via Timetable Import in the Exams Page.">
                        <div>
                            <Button 
                                color="primary" 
                                variant="shadow" 
                                isDisabled={true}
                                startContent={<FileSpreadsheet size={18}/>} 
                                className="font-black rounded-xl h-10 px-4 text-xs transition-all bg-slate-200 text-slate-400 border border-slate-300/80 shadow-none opacity-60 cursor-not-allowed"
                            >
                                Import Data
                            </Button>
                        </div>
                    </Tooltip>

                    {/* 3. Passwords */}
                    <Button 
                        variant="shadow" 
                        color="warning" 
                        startContent={<KeyRound size={18}/>} 
                        onPress={handleExportPasswords}
                        className="font-black rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-orange-200 h-10 px-4 text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Passwords
                    </Button>

                    {/* 4. Sync Semesters */}
                    <Button 
                        variant="shadow" 
                        color="secondary" 
                        startContent={<RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />} 
                        onPress={handleSyncSemesters}
                        isLoading={isSyncing}
                        className="font-black rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md shadow-purple-200 h-10 px-4 text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Sync Semesters
                    </Button>

                    {/* 5. Export */}
                    <Button 
                        variant="shadow" 
                        startContent={<FileDown size={18}/>} 
                        className="font-black rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-md shadow-slate-200 h-10 px-4 text-xs hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Export
                    </Button>

                    {/* 6. Delete All */}
                    <Button 
                        color="danger" 
                        variant="flat" 
                        startContent={<Trash2 size={16}/>} 
                        onPress={() => setIsDeleteAllOpen(true)} 
                        className="font-bold rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 h-10 px-4 text-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Delete All
                    </Button>
                </div>
            </div>

            {/* Stats Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Total Students Card */}
                <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 p-5 rounded-2xl shadow-lg shadow-blue-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-blue-100 text-[0.65rem] font-black uppercase tracking-widest mb-1">Total Students</p>
                        <h3 className="text-3xl font-black text-white">{stats.totalStudents}</h3>
                    </div>
                    <Users className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>

                {/* Active Students Card */}
                <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-teal-700 p-5 rounded-2xl shadow-lg shadow-emerald-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-emerald-50 text-[0.65rem] font-black uppercase tracking-widest mb-1">Active Students</p>
                        <h3 className="text-3xl font-black text-white">{stats.activeStudents}</h3>
                    </div>
                    <CheckCircle2 className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>

                {/* Graduated Card */}
                <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-purple-700 p-5 rounded-2xl shadow-lg shadow-purple-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-purple-100 text-[0.65rem] font-black uppercase tracking-widest mb-1">Graduated</p>
                        <h3 className="text-3xl font-black text-white">{stats.graduated}</h3>
                    </div>
                    <GraduationCap className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>

                {/* Dropped Card */}
                <div className="bg-gradient-to-br from-rose-600 via-pink-600 to-pink-700 p-5 rounded-2xl shadow-lg shadow-pink-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-rose-100 text-[0.65rem] font-black uppercase tracking-widest mb-1">Dropped Out</p>
                        <h3 className="text-3xl font-black text-white">{stats.dropped}</h3>
                    </div>
                    <AlertTriangle className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>

                {/* Total Departments Card */}
                <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 p-5 rounded-2xl shadow-lg shadow-orange-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-amber-100 text-[0.65rem] font-black uppercase tracking-widest mb-1">Departments</p>
                        <h3 className="text-3xl font-black text-white">{filterOptions.departments.length}</h3>
                    </div>
                    <Building2 className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>
            </div>

            {/* Main Table Card with Search & Filters */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50/50">
                    {/* Search Bar with Icon Boundary Divider */}
                    <div className="relative flex items-center w-full md:w-80 h-10 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-indigo-400 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                        <div className="flex items-center justify-center pl-3 pr-2.5 h-full bg-slate-50/80 border-r border-slate-200/80 text-slate-400 shrink-0">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, reg no, roll no..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full !h-full !px-3 !py-0 !bg-transparent !border-none !shadow-none !rounded-none !outline-none !ring-0 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:!outline-none focus:!ring-0 focus:!border-none"
                        />
                        {searchQuery && (
                            <button 
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="text-slate-400 hover:text-slate-600 pr-3 pl-1 h-full flex items-center justify-center transition-colors shrink-0"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
                        {/* Department Filter */}
                        <Select
                            aria-label="Filter by department"
                            placeholder="All Departments"
                            size="sm"
                            variant="bordered"
                            selectedKeys={filters.dept ? [filters.dept] : []}
                            onSelectionChange={handleSelectChange('dept')}
                            className="w-full sm:w-44"
                            selectorIcon={<ChevronDown size={14} className="text-slate-400 shrink-0" />}
                            classNames={{
                                trigger: "bg-white border border-slate-200 shadow-sm rounded-xl h-10 min-h-10 hover:border-indigo-400 data-[hover=true]:border-indigo-400 focus-within:border-indigo-600 transition-colors px-3 pr-7 relative",
                                value: "text-xs font-semibold text-slate-700 text-left",
                                selectorIcon: "right-2.5 absolute text-slate-400 pointer-events-none"
                            }}
                            popoverProps={{
                                classNames: {
                                    content: "!bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 z-[9999] opacity-100 min-w-[260px]"
                                }
                            }}
                            listboxProps={{
                                classNames: {
                                    base: "bg-white p-1"
                                }
                            }}
                        >
                            {filterOptions.departments.map(d => (
                                <SelectItem key={d.DepartmentID} value={d.DepartmentID} textValue={`${d.DepartmentCode} ${d.DepartmentName}`}>
                                    <div className="flex items-center gap-2.5 py-1 px-1 w-full">
                                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-xs font-mono shrink-0">
                                            {d.DepartmentCode}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-700 truncate">
                                            {d.DepartmentName}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </Select>

                        {/* Semester Filter */}
                        <Select
                            aria-label="Filter by semester"
                            placeholder="All Semesters"
                            size="sm"
                            variant="bordered"
                            selectedKeys={filters.sem ? [filters.sem] : []}
                            onSelectionChange={handleSelectChange('sem')}
                            className="w-full sm:w-36"
                            selectorIcon={<ChevronDown size={14} className="text-slate-400 shrink-0" />}
                            classNames={{
                                trigger: "bg-white border border-slate-200 shadow-sm rounded-xl h-10 min-h-10 hover:border-indigo-400 data-[hover=true]:border-indigo-400 focus-within:border-indigo-600 transition-colors px-3 pr-7 relative",
                                value: "text-xs font-semibold text-slate-700 text-left",
                                selectorIcon: "right-2.5 absolute text-slate-400 pointer-events-none"
                            }}
                            popoverProps={{
                                classNames: {
                                    content: "!bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 z-[9999] opacity-100 min-w-[200px]"
                                }
                            }}
                            listboxProps={{
                                classNames: {
                                    base: "bg-white p-1"
                                }
                            }}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                <SelectItem key={String(sem)} value={String(sem)} textValue={`Semester ${sem}`}>
                                    <div className="flex items-center gap-2.5 py-1 px-1 w-full">
                                        <span className="px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-700 font-extrabold text-xs font-mono shrink-0">
                                            S{sem}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-700">
                                            Semester {sem}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </Select>

                        {/* Batch Filter */}
                        <Select
                            aria-label="Filter by batch"
                            placeholder="All Batches"
                            size="sm"
                            variant="bordered"
                            selectedKeys={filters.batch ? [filters.batch] : []}
                            onSelectionChange={handleSelectChange('batch')}
                            className="w-full sm:w-36"
                            selectorIcon={<ChevronDown size={14} className="text-slate-400 shrink-0" />}
                            classNames={{
                                trigger: "bg-white border border-slate-200 shadow-sm rounded-xl h-10 min-h-10 hover:border-indigo-400 data-[hover=true]:border-indigo-400 focus-within:border-indigo-600 transition-colors px-3 pr-7 relative",
                                value: "text-xs font-semibold text-slate-700 text-left",
                                selectorIcon: "right-2.5 absolute text-slate-400 pointer-events-none"
                            }}
                            popoverProps={{
                                classNames: {
                                    content: "!bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 z-[9999] opacity-100 min-w-[200px]"
                                }
                            }}
                            listboxProps={{
                                classNames: {
                                    base: "bg-white p-1"
                                }
                            }}
                        >
                            {filterOptions.batchYears.map(year => (
                                <SelectItem key={String(year)} value={String(year)} textValue={String(year)}>
                                    <div className="flex items-center gap-2.5 py-1 px-1 w-full">
                                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 font-extrabold text-xs font-mono shrink-0">
                                            {year}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-700">
                                            Batch {year}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </Select>

                        {(searchQuery || filters.dept || filters.batch || filters.sem) && (
                            <Tooltip content="Clear Filters">
                                <Button 
                                    isIconOnly variant="flat" color="danger" size="sm" 
                                    onPress={() => { setSearchQuery(""); setFilters({ dept: "", batch: "", sem: "" }); }}
                                    className="rounded-xl h-10 w-10 min-w-10 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors shrink-0"
                                >
                                    <X size={16} />
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </div>

                <Table 
                    aria-label="Internal Students Table"
                    removeWrapper
                    classNames={{
                        th: "bg-slate-50 text-slate-600 font-bold text-xs border-b border-slate-200 py-3.5",
                        td: "py-3 border-b border-slate-100/80"
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
                                    aria-label="Internal Student Pagination"
                                    classNames={{
                                        cursor: "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20"
                                    }}
                                />
                            </div>
                        )
                    }
                    emptyContent={
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                                <Search size={28} className="text-indigo-300" />
                            </div>
                            <p className="text-lg font-semibold text-slate-800">No internal students found</p>
                            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">We couldn't find any records matching your search or filters.</p>
                            {(searchQuery || filters.dept || filters.batch || filters.sem) && (
                                <Button 
                                    onPress={() => { setSearchQuery(""); setFilters({ dept: "", batch: "", sem: "" }); }} 
                                    variant="flat" className="mt-4 font-bold" color="primary"
                                >
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    }
                >
                    <TableHeader>
                        <TableColumn width={60} align="center" className="font-extrabold text-slate-500 uppercase tracking-wider text-center">#</TableColumn>
                        <TableColumn width={220} align="start" className="font-extrabold text-slate-500 uppercase tracking-wider text-left">Reg No / Class Roll No</TableColumn>
                        <TableColumn align="start" className="font-extrabold text-slate-500 uppercase tracking-wider text-left">Full Name</TableColumn>
                        <TableColumn align="center" width={120} className="font-extrabold text-slate-500 uppercase tracking-wider text-center">Department</TableColumn>
                        <TableColumn align="center" width={120} className="font-extrabold text-slate-500 uppercase tracking-wider text-center">Program</TableColumn>
                        <TableColumn align="center" width={90} className="font-extrabold text-slate-500 uppercase tracking-wider text-center">Sem</TableColumn>
                        <TableColumn align="center" width={100} className="font-extrabold text-slate-500 uppercase tracking-wider text-center">Batch</TableColumn>
                        <TableColumn align="center" width={130} className="font-extrabold text-slate-500 uppercase tracking-wider text-center">Status</TableColumn>
                        <TableColumn align="center" width={120} className="font-extrabold text-slate-500 uppercase tracking-wider text-center">Actions</TableColumn>
                    </TableHeader>
                    <TableBody 
                        loadingContent={<div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                        isLoading={loading}
                        emptyContent={!loading && "No internal students found."}
                    >
                        {students.map((student, i) => (
                            <TableRow key={student.InternalStudentID} className="hover:bg-slate-50/60 transition-colors">
                                <TableCell className="text-center text-slate-400 font-bold text-xs">{(page - 1) * 10 + i + 1}</TableCell>
                                <TableCell className="text-left">
                                    <div className="font-bold text-indigo-700 font-mono text-sm">{student.RegisterNumber}</div>
                                    {(student.RollNumber || student.Division) && (
                                        <div className="text-[0.75rem] text-slate-500 font-semibold mt-0.5">
                                            {student.RollNumber ? <>Roll No: <span className="text-slate-900 font-extrabold">{student.RollNumber}</span></> : null}
                                            {student.RollNumber && student.Division ? ' • ' : null}
                                            {student.Division ? <>Div <span className="text-slate-900 font-extrabold">{student.Division}</span></> : null}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="text-left font-semibold text-slate-900">{student.FullName || 'N/A'}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <Chip size="sm" variant="flat" className="bg-indigo-50 text-indigo-700 font-bold border border-indigo-100">
                                            {student.Department?.DepartmentCode || '-'}
                                        </Chip>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-semibold text-xs text-slate-600">
                                    {student.Program?.ProgramName || '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-black text-xs font-mono">
                                        {student.SemesterModel?.SemesterNumber 
                                            ? `S${student.SemesterModel.SemesterNumber}` 
                                            : (student.Semester ? (String(student.Semester).toUpperCase().startsWith('S') ? String(student.Semester).toUpperCase() : `S${student.Semester}`) : '-')}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center font-bold text-xs text-slate-600">
                                    {student.BatchYear || '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex justify-center">
                                        <div className={`
                                            inline-flex items-center justify-center px-3 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-widest shadow-sm border
                                            ${
                                                (student.Status?.toUpperCase() === 'ACTIVE') ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-400/50' :
                                                (student.Status?.toUpperCase() === 'GRADUATED') ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-400/50' :
                                                (student.Status?.toUpperCase() === 'DROPPED') ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-400/50' :
                                                (student.Status?.toUpperCase() === 'INACTIVE') ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-400/50' :
                                                'bg-slate-100 text-slate-500 border-slate-200'
                                            }
                                        `}>
                                            {student.Status || 'UNKNOWN'}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <Tooltip content="Quick View" delay={500}>
                                            <Button 
                                                isIconOnly size="sm" variant="light" color="primary"
                                                onPress={() => viewStudent(student)}
                                            >
                                                <Eye size={17} className="text-slate-500" />
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content="Edit Record" delay={500}>
                                            <Button 
                                                isIconOnly size="sm" variant="light" color="primary"
                                                onPress={() => handleEdit(student)}
                                            >
                                                <Pencil size={16} className="text-slate-500" />
                                            </Button>
                                        </Tooltip>
                                        
                                        <Dropdown 
                                            placement="bottom-end"
                                            classNames={{
                                                content: "!bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 min-w-[170px] z-[9999] opacity-100"
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "!bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-1.5 z-[9999] opacity-100 min-w-[170px]"
                                                }
                                            }}
                                        >
                                            <DropdownTrigger>
                                                <Button isIconOnly size="sm" variant="light" className="hover:bg-slate-100 rounded-xl text-slate-500">
                                                    <MoreVertical size={18} className="text-slate-400" />
                                                </Button>
                                            </DropdownTrigger>
                                            <DropdownMenu 
                                                aria-label="Action Menu" 
                                                variant="flat"
                                                classNames={{
                                                    base: "bg-white p-1"
                                                }}
                                            >
                                                <DropdownItem 
                                                    key="view" 
                                                    startContent={<Eye size={15} className="text-slate-500" />}
                                                    onPress={() => viewStudent(student)}
                                                    className="rounded-xl font-semibold text-slate-700 hover:bg-slate-100/80 data-[hover=true]:bg-slate-100/80 py-2 px-3 text-xs"
                                                >
                                                    Quick View
                                                </DropdownItem>
                                                <DropdownItem 
                                                    key="edit" 
                                                    startContent={<Pencil size={15} className="text-indigo-600" />}
                                                    onPress={() => handleEdit(student)}
                                                    className="rounded-xl font-semibold text-slate-700 hover:bg-slate-100/80 data-[hover=true]:bg-slate-100/80 py-2 px-3 text-xs"
                                                >
                                                    Edit Student
                                                </DropdownItem>
                                                <DropdownItem 
                                                    key="delete" 
                                                    className="rounded-xl font-bold text-rose-600 hover:bg-rose-50 data-[hover=true]:bg-rose-50 py-2 px-3 text-xs border-t border-slate-100/80 mt-1" 
                                                    color="danger"
                                                    startContent={<Trash2 size={15} className="text-rose-500" />}
                                                    onPress={() => { setSelectedStudent(student); setIsDeleteOpen(true); }}
                                                >
                                                    Delete Record
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

            <Modal 
                isOpen={isDeleteOpen} 
                onClose={() => setIsDeleteOpen(false)} 
                size="sm" 
                backdrop="blur"
                classNames={{
                    base: "border border-slate-200 shadow-2xl rounded-2xl",
                    header: "border-b border-slate-100 py-4",
                    footer: "border-t border-slate-100 py-3"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center text-slate-800">
                        <Trash2 size={20} className="text-red-500" />
                        Confirm Deletion
                    </ModalHeader>
                    <ModalBody className="py-6">
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Are you sure you want to permanently delete the internal record for 
                            <span className="font-extrabold text-slate-900 mx-1 px-1.5 py-0.5 bg-slate-100 rounded">{selectedStudent?.RegisterNumber}</span>?
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" className="font-bold text-slate-500" onPress={() => setIsDeleteOpen(false)}>Cancel</Button>
                        <Button 
                            color="danger" 
                            variant="shadow"
                            className="font-black bg-gradient-to-r from-red-500 to-rose-600 shadow-red-200"
                            onPress={handleDelete} 
                            isLoading={isDeleting}
                        >
                            Delete Record
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <StudentImportModal 
                isOpen={isImportOpen} 
                onClose={() => setIsImportOpen(false)}
                onSuccess={handleImportSuccess}
                isInternal={true}
            />

            <AddStudentModal 
                isOpen={isAddOpen} 
                onClose={() => setIsAddOpen(false)}
                onSuccess={fetchStudents}
                isInternal={true}
            />

            <EditStudentModal 
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSuccess={fetchStudents}
                student={selectedStudent}
                isInternal={true}
            />

            <StudentQuickViewDrawer 
                isOpen={isQuickViewOpen}
                onClose={() => setIsQuickViewOpen(false)}
                student={drawerStudent}
                onEdit={handleEdit}
                onDelete={(s) => { setSelectedStudent(s); setIsDeleteOpen(true); }}
            />

            <Modal 
                isOpen={isDeleteAllOpen} 
                onClose={() => setIsDeleteAllOpen(false)} 
                size="md" 
                backdrop="blur"
                classNames={{
                    base: "border border-red-100 shadow-2xl rounded-2xl",
                    header: "border-b border-red-50 bg-red-50/30 py-4",
                    footer: "border-t border-slate-100 py-3"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex gap-2 items-center text-red-700">
                        <AlertTriangle size={20} />
                        Clear All Internal Records?
                    </ModalHeader>
                    <ModalBody className="py-6">
                        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
                            <AlertCircle size={24} className="text-red-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-red-700 leading-tight">
                                    Warning: Permanent Action
                                </p>
                                <p className="text-xs text-red-600/80 font-medium leading-relaxed">
                                    This will permanently delete ALL <span className="font-black text-red-700">{totalCount}</span> internal student records. This action cannot be reversed and will affect all current internal seating plans.
                                </p>
                            </div>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="light" className="font-bold text-slate-500" onPress={() => setIsDeleteAllOpen(false)}>Cancel</Button>
                        <Button 
                            color="danger" 
                            variant="shadow"
                            className="font-black bg-gradient-to-r from-red-600 to-rose-700 shadow-red-200"
                            onPress={handleDeleteAll} 
                            isLoading={isDeleting}
                        >
                            Delete Everything
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    );
};

export default InternalStudents;
