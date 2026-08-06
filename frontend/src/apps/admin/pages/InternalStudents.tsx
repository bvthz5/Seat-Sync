import React, { useState, useEffect } from 'react';
import { 
    Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, 
    Chip, Pagination, Input, Tooltip, Select, SelectItem,
    Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Dropdown, DropdownTrigger, DropdownMenu, DropdownItem
} from '@heroui/react';
import { 
    Search, FileSpreadsheet, Pencil, Trash2, AlertTriangle, 
    GraduationCap, BookOpen, FileDown, Users, 
    MoreVertical, CheckCircle2, ShieldCheck, Mail, Phone,
    Eye, X, Plus, UserCircle, Key, KeyRound, Building2, RefreshCcw, RefreshCw, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InternalStudentService } from '../services/internalStudentService';
import { useDebounce } from '../../../hooks/useDebounce';
import StudentImportModal from '../components/students/StudentImportModal';
import { AddStudentModal } from '../components/students/AddStudentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import StudentQuickViewDrawer from '../components/students/StudentQuickViewDrawer';

const InternalStudents: React.FC = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [filters, setFilters] = useState({ dept: "", batch: "" });
    
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
                batch: filters.batch ? parseInt(filters.batch) : undefined
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
        <div className="max-w-[1600px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Users className="text-blue-600" size={24}/> Internal Students
                    </h1>
                    <p className="text-slate-500 font-medium text-xs mt-0.5">Manage isolated student records for internal examinations</p>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <Button 
                        color="danger" 
                        variant="shadow" 
                        startContent={<Trash2 size={18}/>} 
                        onPress={() => setIsDeleteAllOpen(true)} 
                        className="font-black rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-200"
                    >
                        Delete All
                    </Button>
                    <Button 
                        variant="shadow" 
                        startContent={<FileDown size={18}/>} 
                        className="font-black rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-slate-200"
                    >
                        Export
                    </Button>
                    <Button 
                        variant="shadow" 
                        color="warning" 
                        startContent={<KeyRound size={18}/>} 
                        onPress={handleExportPasswords}
                        className="font-black rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-orange-200"
                    >
                        Passwords
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
                        color="secondary" 
                        startContent={<RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />} 
                        onPress={handleSyncSemesters}
                        isLoading={isSyncing}
                        className="font-black rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-purple-200"
                    >
                        Sync Semesters
                    </Button>
                    <Button 
                        color="primary" 
                        variant="shadow"
                        startContent={<Plus size={18}/>} 
                        onPress={() => setIsAddOpen(true)} 
                        className="font-black rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-200"
                    >
                        Add Student
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                {/* Total Students Card */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-lg shadow-blue-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-blue-100 text-[0.65rem] font-bold uppercase tracking-widest mb-1">Total Students</p>
                        <h3 className="text-3xl font-black text-white">{stats.totalStudents}</h3>
                    </div>
                    <Users className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>

                {/* Active Students Card */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-5 rounded-2xl shadow-lg shadow-emerald-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-emerald-50 text-[0.65rem] font-bold uppercase tracking-widest mb-1">Active Students</p>
                        <h3 className="text-3xl font-black text-white">{stats.activeStudents}</h3>
                    </div>
                    <CheckCircle2 className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>

                {/* Graduated Card */}
                <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-5 rounded-2xl shadow-lg shadow-purple-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-purple-100 text-[0.65rem] font-bold uppercase tracking-widest mb-1">Graduated</p>
                        <h3 className="text-3xl font-black text-white">{stats.graduated}</h3>
                    </div>
                    <GraduationCap className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>

                {/* Dropped Card */}
                <div className="bg-gradient-to-br from-rose-600 to-pink-700 p-5 rounded-2xl shadow-lg shadow-pink-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-rose-100 text-[0.65rem] font-bold uppercase tracking-widest mb-1">Dropped Out</p>
                        <h3 className="text-3xl font-black text-white">{stats.dropped}</h3>
                    </div>
                    <AlertTriangle className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>

                {/* Total Departments Card */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-5 rounded-2xl shadow-lg shadow-orange-100 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="relative z-10">
                        <p className="text-amber-100 text-[0.65rem] font-bold uppercase tracking-widest mb-1">Departments</p>
                        <h3 className="text-3xl font-black text-white">{filterOptions.departments.length}</h3>
                    </div>
                    <Building2 className="absolute -right-2 -bottom-2 text-white/10 group-hover:scale-110 transition-transform duration-500" size={80}/>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-100/50 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/50">
                    <div className="relative w-full sm:w-80">
                        <Input
                            placeholder="Search by name, reg no..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            startContent={<Search size={16} className="text-slate-400" />}
                            isClearable
                            onClear={() => setSearchQuery("")}
                            classNames={{
                                inputWrapper: "bg-white border border-slate-200 shadow-sm rounded-xl hover:border-slate-300 focus-within:border-blue-600"
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select
                            placeholder="All Departments"
                            selectedKeys={filters.dept ? [filters.dept] : []}
                            onSelectionChange={handleSelectChange('dept')}
                            className="w-full sm:w-48"
                            classNames={{
                                trigger: "bg-white border border-slate-200 shadow-sm rounded-xl h-10"
                            }}
                        >
                            {filterOptions.departments.map(d => (
                                <SelectItem key={d.DepartmentID} value={d.DepartmentID}>
                                    {d.DepartmentCode}
                                </SelectItem>
                            ))}
                        </Select>

                        <Select
                            placeholder="All Batches"
                            selectedKeys={filters.batch ? [filters.batch] : []}
                            onSelectionChange={handleSelectChange('batch')}
                            className="w-full sm:w-36"
                            classNames={{
                                trigger: "bg-white border border-slate-200 shadow-sm rounded-xl h-10"
                            }}
                        >
                            {filterOptions.batchYears.map(year => (
                                <SelectItem key={year} value={year}>
                                    {year}
                                </SelectItem>
                            ))}
                        </Select>

                        {(searchQuery || filters.dept || filters.batch) && (
                            <Button 
                                isIconOnly variant="flat" color="danger" size="sm" 
                                onPress={() => { setSearchQuery(""); setFilters({ dept: "", batch: "" }); }}
                                className="rounded-xl"
                            >
                                <X size={16} />
                            </Button>
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
                            {(searchQuery || filters.dept || filters.batch) && (
                                <Button 
                                    onPress={() => { setSearchQuery(""); setFilters({ dept: "", batch: "" }); }} 
                                    variant="flat" className="mt-4 font-bold" color="primary"
                                >
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    }
                >
                    <TableHeader>
                        <TableColumn width={60}>#</TableColumn>
                        <TableColumn width={220}>Reg No / Class Roll No</TableColumn>
                        <TableColumn>Full Name</TableColumn>
                        <TableColumn align="center">Department</TableColumn>
                        <TableColumn align="center">Program</TableColumn>
                        <TableColumn key="sem" align="center" width={80} className="font-bold text-slate-500 uppercase tracking-wider">Sem</TableColumn>
                        <TableColumn key="batch" align="center" width={100} className="font-bold text-slate-500 uppercase tracking-wider">Batch</TableColumn>
                        <TableColumn key="status" align="center" width={120} className="font-bold text-slate-500 uppercase tracking-wider">Status</TableColumn>
                        <TableColumn key="actions" align="center" width={120} className="font-bold text-slate-500 uppercase tracking-wider">Actions</TableColumn>
                    </TableHeader>
                    <TableBody 
                        loadingContent={<div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                        isLoading={loading}
                        emptyContent={!loading && "No internal students found."}
                    >
                        {students.map((student, i) => (
                            <TableRow key={student.InternalStudentID}>
                                <TableCell className="text-slate-400 font-medium">{(page - 1) * 10 + i + 1}</TableCell>
                                <TableCell>
                                    <div className="font-bold text-indigo-700">{student.RegisterNumber}</div>
                                     {(student.RollNumber || student.Division) && (
                                         <div className="text-[0.75rem] text-slate-500 font-semibold mt-0.5">
                                             {student.RollNumber ? <>Roll No: <span className="text-slate-900 font-extrabold">{student.RollNumber}</span></> : null}
                                             {student.RollNumber && student.Division ? ' • ' : null}
                                             {student.Division ? <>Div <span className="text-slate-900 font-extrabold">{student.Division}</span></> : null}
                                         </div>
                                     )}
                                </TableCell>
                                <TableCell className="font-semibold text-slate-900">{student.FullName || 'N/A'}</TableCell>
                                <TableCell className="text-center">
                                    <Chip size="sm" variant="flat" className="bg-indigo-50 text-indigo-700 font-bold border-indigo-100 mx-auto">
                                        {student.Department?.DepartmentCode || '-'}
                                    </Chip>
                                </TableCell>
                                <TableCell className="text-slate-600 text-xs text-center">{student.Program?.ProgramName || '-'}</TableCell>
                                <TableCell className="text-slate-700 font-bold text-center">
                                    {student.SemesterModel?.SemesterNumber 
                                        ? `S${student.SemesterModel.SemesterNumber}` 
                                        : (student.Semester ? (String(student.Semester).toUpperCase().startsWith('S') ? String(student.Semester).toUpperCase() : `S${student.Semester}`) : '-')}
                                </TableCell>
                                <TableCell className="text-center font-bold text-slate-500">{student.BatchYear || '-'}</TableCell>
                                <TableCell className="text-center">
                                    <div className={`
                                        inline-flex items-center justify-center px-4 py-1 rounded-full text-[0.65rem] font-black uppercase tracking-widest shadow-sm border
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
                                </TableCell>
                                <TableCell>
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
                                        
                                        <Dropdown placement="bottom-end">
                                            <DropdownTrigger>
                                                <Button isIconOnly size="sm" variant="light">
                                                    <MoreVertical size={18} className="text-slate-400" />
                                                </Button>
                                            </DropdownTrigger>
                                            <DropdownMenu aria-label="Action Menu" variant="flat">
                                                <DropdownItem 
                                                    key="view" 
                                                    startContent={<Eye size={16}/>}
                                                    onPress={() => viewStudent(student)}
                                                >
                                                    Quick View
                                                </DropdownItem>
                                                <DropdownItem 
                                                    key="edit" 
                                                    startContent={<Pencil size={16}/>}
                                                    onPress={() => handleEdit(student)}
                                                >
                                                    Edit Student
                                                </DropdownItem>
                                                <DropdownItem 
                                                    key="delete" 
                                                    className="text-danger" 
                                                    color="danger"
                                                    startContent={<Trash2 size={16}/>}
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
