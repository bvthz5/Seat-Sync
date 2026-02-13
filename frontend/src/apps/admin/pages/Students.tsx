import React, { useEffect, useState } from 'react';
import { Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Pagination, Input, Tooltip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem } from '@heroui/react';
import { Plus, Search, FileSpreadsheet, Filter, Pencil, Trash2, AlertTriangle, Building2, GraduationCap, BookOpen, Calendar, FileDown, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import StudentImportModal from '../components/students/StudentImportModal';
import { AddStudentModal } from '../components/students/AddStudentModal';
import { EditStudentModal } from '../components/students/EditStudentModal';
import { useDebounce } from '../../../hooks/useDebounce';

interface Student {
    StudentID: number;
    RegisterNumber: string;
    BatchYear: number;
    User?: { Email: string; FullName?: string };
    Department?: { DepartmentCode: string };
    Program?: { ProgramName: string };
    Semester?: { SemesterNumber: number };
    DepartmentID?: number;
    ProgramID?: number;
    SemesterID?: number;
}

const Students: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStudents, setTotalStudents] = useState(0);
    const [stats, setStats] = useState({
        activeDepartments: 0,
        activeBatches: 0,
        incompleteProfiles: 0,
        totalDatabaseCount: 0
    });

    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [filters, setFilters] = useState({ dept: "", program: "", semester: "" });
    const [tempFilters, setTempFilters] = useState({ dept: "", program: "", semester: "" });

    const [departments, setDepartments] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/students', {
                params: { page, limit: 10, search: debouncedSearch, ...filters }
            });
            setStudents(res.data.students);
            setTotalPages(res.data.totalPages);
            setTotalStudents(res.data.totalItems);
            if (res.data.stats) setStats(res.data.stats);
        } catch (error) {
            console.error("Failed to fetch students", error);
            toast.error("Failed to load students");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchStudents(); }, [page, debouncedSearch, filters]);

    const handleEdit = (student: Student) => { setSelectedStudent(student); setIsEditOpen(true); };
    const confirmDelete = (student: Student) => { setSelectedStudent(student); setIsDeleteOpen(true); };

    const handleDelete = async () => {
        if (!selectedStudent) return;
        try {
            await api.delete(`/students/${selectedStudent.StudentID}`);
            toast.success("Student deleted successfully");
            setIsDeleteOpen(false);
            fetchStudents();
        } catch (error) { toast.error("Failed to delete student"); }
    };

    const handleDeleteAll = async () => {
        try {
            await api.delete('/students/delete-all');
            toast.success("All student profiles deleted.");
            setIsDeleteAllOpen(false);
            fetchStudents();
        } catch (error: any) { toast.error(error.response?.data?.message || "Delete all failed"); }
    };

    const openFilters = () => { setTempFilters(filters); setIsFilterOpen(true); };
    const applyFilters = () => { setFilters(tempFilters); setIsFilterOpen(false); };
    const clearFilters = () => { setTempFilters({ dept: "", program: "", semester: "" }); setFilters({ dept: "", program: "", semester: "" }); };
    const handleExport = () => { toast("Export functionality coming soon!"); };

    const filteredFilterSemesters = semesters;
    const activeFiltersCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-10">

            {/* Hero Header — blue/cyan gradient (distinct from Exams indigo/violet theme) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 p-8 md:p-10">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
                <div className="absolute top-4 right-8 opacity-[0.03]">
                    <GraduationCap size={200} strokeWidth={0.5} />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                            <span className="text-cyan-300 text-xs font-semibold uppercase tracking-widest">Student Management</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                            Students Directory
                        </h1>
                        <p className="text-blue-200/60 mt-2 text-sm max-w-md">
                            Manage student enrollments, academic progress, and database records.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <Button
                            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium hover:bg-white/20 transition-all"
                            startContent={<Trash2 size={16} />}
                            onPress={() => setIsDeleteAllOpen(true)}
                            size="md"
                            radius="lg"
                        >
                            Delete All
                        </Button>
                        <Button
                            className="bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium hover:bg-white/20 transition-all"
                            startContent={<FileSpreadsheet size={16} className="text-cyan-300" />}
                            onPress={() => setIsImportOpen(true)}
                            size="md"
                            radius="lg"
                        >
                            Import Excel
                        </Button>
                        <Button
                            className="bg-white text-blue-900 font-bold shadow-lg shadow-black/20 hover:shadow-xl hover:scale-[1.02] transition-all px-6"
                            startContent={<Plus size={16} />}
                            onPress={() => setIsAddOpen(true)}
                            size="md"
                            radius="lg"
                        >
                            Add Student
                        </Button>
                    </div>
                </div>

                {/* Inline Stats */}
                <div className="relative z-10 mt-8 flex flex-wrap gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Building2 size={18} className="text-blue-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.activeDepartments}</p>
                            <p className="text-xs text-blue-300/70">Departments</p>
                        </div>
                    </div>
                    <div className="w-px bg-white/10 self-stretch"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Calendar size={18} className="text-cyan-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.activeBatches}</p>
                            <p className="text-xs text-cyan-300/70">Active Batches</p>
                        </div>
                    </div>
                    <div className="w-px bg-white/10 self-stretch"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <AlertTriangle size={18} className="text-amber-300" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.incompleteProfiles}</p>
                            <p className="text-xs text-amber-300/70">Incomplete</p>
                        </div>
                    </div>
                    <div className="w-px bg-white/10 self-stretch"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                            <Users size={18} className="text-sky-300" />
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <p className="text-2xl font-bold text-white">{totalStudents}</p>
                                <span className="text-sm text-sky-300/50 font-medium">/ {stats.totalDatabaseCount}</span>
                            </div>
                            <p className="text-xs text-sky-300/70">Total Students</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                <Input
                    id="student-search"
                    name="studentSearch"
                    autoComplete="off"
                    aria-label="Search students"
                    classNames={{
                        base: "w-full sm:max-w-md",
                        inputWrapper: "bg-gray-50 group-data-[focus=true]:bg-white border border-transparent group-data-[focus=true]:border-blue-500 transition-all rounded-lg shadow-none h-10",
                        input: "text-sm",
                    }}
                    placeholder="Search by name, Reg No, or email..."
                    startContent={<Search size={16} className="text-gray-400" />}
                    value={searchQuery}
                    onValueChange={(val) => { setSearchQuery(val); setPage(1); }}
                    isClearable
                    onClear={() => setSearchQuery("")}
                    size="sm"
                />
                <div className="flex items-center gap-2 pr-1">
                    <Button
                        variant={activeFiltersCount > 0 ? "flat" : "light"}
                        className={`font-medium text-sm ${activeFiltersCount > 0 ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-gray-500"}`}
                        startContent={<Filter size={15} />}
                        onPress={openFilters}
                        size="sm"
                    >
                        Filter {activeFiltersCount > 0 && <Chip size="sm" className="ml-1 h-5 min-w-5 px-1 text-[10px] bg-blue-500 text-white">{activeFiltersCount}</Chip>}
                    </Button>
                    <div className="h-5 w-px bg-gray-200"></div>
                    <Tooltip content="Export to Excel">
                        <Button isIconOnly variant="light" className="text-gray-400 hover:text-blue-600" onPress={handleExport} size="sm">
                            <FileDown size={17} />
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <Table
                    aria-label="Students Table"
                    shadow="none"
                    classNames={{
                        wrapper: "p-0",
                        th: "bg-gray-50/60 text-gray-500 font-semibold text-[11px] uppercase tracking-wider h-11 border-b border-gray-100 px-5",
                        td: "py-3.5 border-b border-gray-50 group-last:border-none px-5",
                        table: "min-h-[400px]"
                    }}
                    bottomContent={
                        totalPages > 1 && (
                            <div className="flex w-full justify-center px-4 py-3.5 border-t border-gray-100">
                                <Pagination
                                    total={totalPages}
                                    page={page}
                                    onChange={setPage}
                                    color="default"
                                    variant="light"
                                    showControls
                                    classNames={{
                                        cursor: "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20"
                                    }}
                                />
                            </div>
                        )
                    }
                >
                    <TableHeader>
                        <TableColumn>STUDENT DETAILS</TableColumn>
                        <TableColumn>ACADEMIC INFO</TableColumn>
                        <TableColumn>BATCH</TableColumn>
                        <TableColumn align="end">ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={
                            <div className="flex flex-col items-center justify-center p-16 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                                    <GraduationCap size={26} className="text-blue-300" />
                                </div>
                                <p className="text-base font-semibold text-gray-700">No students found</p>
                                <p className="text-sm text-gray-400 mt-1">Try adjusting filters or import a new batch.</p>
                            </div>
                        }
                        items={students}
                        isLoading={isLoading}
                    >
                        {(item) => (
                            <TableRow key={item.StudentID} className="hover:bg-blue-50/30 transition-colors group">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
                                            {(item.User?.FullName || "U")[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-sm">{item.User?.FullName || "Unknown"}</p>
                                            <span className="font-mono text-[11px] text-blue-600/80 bg-blue-50 px-1.5 py-0.5 rounded">{item.RegisterNumber}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-gray-600 px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">{item.Department?.DepartmentCode}</span>
                                            <span className="text-sm text-gray-700 font-medium">{item.Program?.ProgramName}</span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                            <BookOpen size={11} /> Semester {item.Semester?.SemesterNumber}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Chip size="sm" variant="flat" className="bg-sky-50 text-sky-700 font-semibold border border-sky-100">
                                        Batch {item.BatchYear}
                                    </Chip>
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <Tooltip content="Edit Details">
                                            <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(item)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                                                <Pencil size={15} />
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content="Delete Student" color="danger">
                                            <Button isIconOnly size="sm" variant="light" onPress={() => confirmDelete(item)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                                                <Trash2 size={15} />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modals */}
            <AddStudentModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSuccess={() => fetchStudents()} />
            {selectedStudent && (
                <EditStudentModal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} onSuccess={() => fetchStudents()} student={selectedStudent} />
            )}

            {/* Filter Modal */}
            <Modal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} size="sm" backdrop="blur"
                classNames={{ base: "bg-white border border-gray-200 shadow-2xl rounded-2xl", backdrop: "bg-black/40 backdrop-blur-sm", header: "border-b border-gray-100 py-5 px-6", body: "p-6", footer: "border-t border-gray-100 py-4 px-6" }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Filter size={16} className="text-blue-600" /></div>
                                    <div>
                                        <span className="text-lg font-bold text-gray-900">Filters</span>
                                        <p className="text-xs text-gray-400 font-normal">Narrow down results</p>
                                    </div>
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <Select name="departmentFilter" aria-label="Department Filter" placeholder="All Departments" selectedKeys={tempFilters.dept ? [tempFilters.dept] : []} onChange={(e) => setTempFilters(p => ({ ...p, dept: e.target.value }))} variant="bordered" classNames={{ trigger: "rounded-xl border-gray-200" }}>
                                        {departments.map(d => <SelectItem key={d.DepartmentID}>{d.DepartmentName}</SelectItem>)}
                                    </Select>
                                    <Select name="programFilter" aria-label="Program Filter" placeholder="All Programs" selectedKeys={tempFilters.program ? [tempFilters.program] : []} onChange={(e) => setTempFilters(p => ({ ...p, program: e.target.value }))} variant="bordered" classNames={{ trigger: "rounded-xl border-gray-200" }}>
                                        {programs.map(p => <SelectItem key={p.ProgramID}>{p.ProgramName}</SelectItem>)}
                                    </Select>
                                    <Select name="semesterFilter" aria-label="Semester Filter" placeholder="All Semesters" isDisabled={!tempFilters.program} selectedKeys={tempFilters.semester ? [tempFilters.semester] : []} onChange={(e) => setTempFilters(p => ({ ...p, semester: e.target.value }))} variant="bordered" classNames={{ trigger: "rounded-xl border-gray-200" }}>
                                        {filteredFilterSemesters.map(s => <SelectItem key={s.SemesterID}>{`Semester ${s.SemesterNumber}`}</SelectItem>)}
                                    </Select>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={clearFilters} className="text-red-500 font-medium">Clear</Button>
                                <Button className="bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20 px-6 rounded-xl" onPress={applyFilters}>Apply</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Delete Student Modal */}
            <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} size="sm" backdrop="blur"
                classNames={{ base: "bg-white border border-gray-200 shadow-2xl rounded-2xl", backdrop: "bg-black/30 backdrop-blur-sm", header: "hidden", body: "p-0", footer: "hidden" }}>
                <ModalContent>
                    {(onClose) => (
                        <ModalBody>
                            <div className="p-8 text-center space-y-5">
                                <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
                                    <AlertTriangle size={28} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Delete Student?</h3>
                                    <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                        Are you sure you want to delete <strong className="text-gray-800">{selectedStudent?.User?.FullName}</strong>? This action cannot be undone.
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="bordered" className="flex-1 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50" onPress={onClose} size="lg" radius="lg">Cancel</Button>
                                    <Button className="flex-1 bg-red-500 text-white font-semibold shadow-lg shadow-red-500/20 hover:bg-red-600" onPress={handleDelete} size="lg" radius="lg" startContent={<Trash2 size={16} />}>Delete</Button>
                                </div>
                            </div>
                        </ModalBody>
                    )}
                </ModalContent>
            </Modal>

            {/* Delete All Modal */}
            <Modal isOpen={isDeleteAllOpen} onClose={() => setIsDeleteAllOpen(false)} size="md" backdrop="blur"
                classNames={{ base: "bg-white border border-gray-200 shadow-2xl rounded-2xl", backdrop: "bg-black/30 backdrop-blur-sm", header: "border-b border-gray-100 py-5 px-6", body: "p-6", footer: "border-t border-gray-100 py-4 px-6" }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><AlertTriangle size={20} className="text-red-600" /></div>
                                    <div>
                                        <span className="text-lg font-bold text-gray-900">Delete All Students</span>
                                        <p className="text-xs text-gray-500 font-normal">Destructive bulk action</p>
                                    </div>
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <p className="text-gray-600 text-sm">You are about to delete <span className="font-bold text-gray-900">ALL</span> student academic records.</p>
                                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-3">
                                        <div className="flex gap-2 text-sm text-red-800 font-semibold"><AlertTriangle size={16} className="mt-0.5 shrink-0" />What will be deleted:</div>
                                        <ul className="list-disc pl-9 space-y-1 text-sm text-red-700/80">
                                            <li>Academic profiles (Batch, Dept, etc.)</li>
                                            <li>Enrollment records</li>
                                        </ul>
                                    </div>
                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
                                        <Building2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
                                        <p className="text-sm text-blue-900/80"><span className="font-bold text-blue-900">Note:</span> User login accounts will NOT be deleted.</p>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="bordered" onPress={onClose} className="font-medium text-gray-600 border-gray-300">Cancel</Button>
                                <Button className="font-semibold shadow-lg shadow-red-500/20 bg-red-600 text-white" onPress={handleDeleteAll} startContent={<Trash2 size={16} />}>Yes, Delete All</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <StudentImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onSuccess={fetchStudents} />
        </div>
    );
};

export default Students;
