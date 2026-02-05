import React, { useEffect, useState } from 'react';
import { Button, Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Pagination, Input, User as UserAvatar, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Popover, PopoverTrigger, PopoverContent, Select, SelectItem, Badge } from '@heroui/react';
import { Plus, Search, FileSpreadsheet, MoreVertical, Filter, Download, Pencil, Trash2, AlertTriangle, X, Check, Building2, GraduationCap, BookOpen, Calendar, Mail, FileDown } from 'lucide-react';
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
    // --- State Management ---
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

    // --- Data Fetching ---
    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/students', {
                params: { page, limit: 10, search: debouncedSearch, ...filters }
            });
            setStudents(res.data.students);
            setTotalPages(res.data.totalPages);
            setTotalStudents(res.data.total);

            // Dummy Stats for now (replace with API call if available)
            setStats(prev => ({ ...prev, totalDatabaseCount: res.data.total }));

        } catch (error) {
            console.error("Failed to fetch students", error);
            toast.error("Failed to load students");
        } finally {
            setIsLoading(false);
        }
    };

    // Initial Load & Dependencies
    useEffect(() => {
        fetchStudents();
        // Load filter data (mock or api)
        // api.get('/departments').then(res => setDepartments(res.data)).catch(console.error);
        // api.get('/programs').then(res => setPrograms(res.data)).catch(console.error);
        // api.get('/semesters').then(res => setSemesters(res.data)).catch(console.error);
    }, [page, debouncedSearch, filters]);


    // --- Handlers ---
    const handleEdit = (student: Student) => {
        setSelectedStudent(student);
        setIsEditOpen(true);
    };

    const confirmDelete = (student: Student) => {
        setSelectedStudent(student);
        setIsDeleteOpen(true);
    };

    const handleDelete = async () => {
        if (!selectedStudent) return;
        try {
            await api.delete(`/students/${selectedStudent.StudentID}`);
            toast.success("Student deleted successfully");
            setIsDeleteOpen(false);
            fetchStudents();
        } catch (error) {
            toast.error("Failed to delete student");
        }
    };

    const handleDeleteAll = async () => {
        try {
            await api.delete('/students/delete-all');
            toast.success("All student profiles deleted.");
            setIsDeleteAllOpen(false);
            fetchStudents();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Delete all failed");
        }
    };

    const openFilters = () => {
        setTempFilters(filters);
        setIsFilterOpen(true);
    };

    const applyFilters = () => {
        setFilters(tempFilters);
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setTempFilters({ dept: "", program: "", semester: "" });
        setFilters({ dept: "", program: "", semester: "" });
    };

    const handleExport = () => {
        toast("Export functionality coming soon!");
    };

    const filteredFilterSemesters = semesters; // Logic to filter semesters based on program can go here

    const activeFiltersCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="flex flex-col gap-8 max-w-[1600px] mx-auto min-h-screen pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-gray-200/50">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Students Directory
                    </h1>
                    <p className="text-gray-500 font-medium max-w-lg">
                        Manage student enrollments, academic progress, and database records.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        className="bg-white border border-red-200 text-red-600 font-medium shadow-sm hover:bg-red-50 transition-all"
                        variant="flat"
                        color="danger"
                        startContent={<Trash2 size={18} />}
                        onPress={() => setIsDeleteAllOpen(true)}
                    >
                        Delete All
                    </Button>
                    <Button
                        className="bg-white border border-gray-200 text-gray-700 font-medium shadow-sm hover:shadow transition-all"
                        variant="light"
                        startContent={<FileSpreadsheet size={18} className="text-emerald-600" />}
                        onPress={() => setIsImportOpen(true)}
                    >
                        Import Excel
                    </Button>
                    <Button
                        className="bg-gray-900 text-white font-medium shadow-lg shadow-gray-900/20 hover:scale-[1.02] transition-transform"
                        startContent={<Plus size={18} />}
                        onPress={() => setIsAddOpen(true)}
                    >
                        Add Student
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                    { title: "Departments", value: stats.activeDepartments, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
                    { title: "Active Batches", value: stats.activeBatches, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
                    { title: "Incomplete", value: stats.incompleteProfiles, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
                    { title: "Total Students", value: totalStudents, sub: `/ ${stats.totalDatabaseCount}`, icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-50" }
                ].map((stat, idx) => (
                    <Card key={idx} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <CardBody className="flex flex-row items-center gap-4 p-5">
                            <div className={`p-3.5 rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{stat.title}</p>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                                    {stat.sub && <span className="text-sm font-medium text-gray-400">{stat.sub}</span>}
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                ))}
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                <Input
                    classNames={{
                        base: "w-full sm:w-96",
                        inputWrapper: "bg-transparent shadow-none hover:bg-gray-50 focus-within:!bg-gray-50 border-0 ring-0 data-[hover=true]:bg-gray-50",
                        input: "text-base",
                    }}
                    placeholder="Search by name, Reg No, or email..."
                    startContent={<Search size={18} className="text-gray-400 mr-2" />}
                    value={searchQuery}
                    onValueChange={(val) => { setSearchQuery(val); setPage(1); }}
                    isClearable
                    onClear={() => setSearchQuery("")}
                />

                <div className="flex items-center gap-2 pr-2">
                    {/* Filter Button */}
                    <Button
                        variant={activeFiltersCount > 0 ? "flat" : "light"}
                        color={activeFiltersCount > 0 ? "primary" : "default"}
                        className={`font-medium min-w-[100px] ${activeFiltersCount > 0 ? "bg-primary/10 text-primary" : "text-gray-600"}`}
                        startContent={<Filter size={18} />}
                        onPress={openFilters}
                    >
                        Filter {activeFiltersCount > 0 && <Badge content={activeFiltersCount} color="primary" size="sm" shape="circle" className="border-none shadow-sm ml-1" />}
                    </Button>
                    <div className="h-6 w-px bg-gray-200 mx-1"></div>
                    <Tooltip content="Export to Excel">
                        <Button isIconOnly variant="light" className="text-gray-500 hover:text-green-600" onPress={handleExport}>
                            <FileDown size={20} />
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Table */}
            <Card className="border border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                <Table
                    aria-label="Students Table"
                    shadow="none"
                    classNames={{
                        wrapper: "p-0",
                        th: "bg-gray-50/70 text-gray-500 font-medium text-xs uppercase tracking-wider h-12 border-b border-gray-100 pl-6",
                        td: "py-4 border-b border-gray-50 group-last:border-none pl-6",
                        table: "min-h-[400px]"
                    }}
                    bottomContent={
                        totalPages > 1 && (
                            <div className="flex w-full justify-center px-4 py-4 border-t border-gray-100 bg-white">
                                <Pagination
                                    total={totalPages}
                                    page={page}
                                    onChange={setPage}
                                    color="default"
                                    variant="light"
                                    showControls
                                    classNames={{
                                        cursor: "bg-gray-900 text-white font-bold"
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
                            <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                                <FileSpreadsheet size={48} className="text-gray-300 mb-4 opacity-50" />
                                <p className="text-lg font-semibold text-gray-700">No students found</p>
                                <p className="text-sm text-gray-500 mt-1">Try adjusting filters or import a new batch.</p>
                            </div>
                        }
                        items={students}
                        isLoading={isLoading}
                    >
                        {(item) => (
                            <TableRow key={item.StudentID} className="hover:bg-gray-50/50 transition-colors group">
                                <TableCell>
                                    <UserAvatar
                                        name={item.User?.FullName || "Unknown"}
                                        description={<span className="font-mono text-xs text-blue-600/80 bg-blue-50 px-1.5 py-0.5 rounded">{item.RegisterNumber}</span>}
                                        avatarProps={{
                                            radius: "lg",
                                            src: `https://api.dicebear.com/7.x/initials/svg?seed=${item.RegisterNumber}`,
                                            classNames: { base: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold ring-2 ring-white shadow-sm" }
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-700 px-2 py-0.5 bg-gray-100 rounded border border-gray-200">{item.Department?.DepartmentCode}</span>
                                            <span className="text-sm text-gray-600">{item.Program?.ProgramName}</span>
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                                            <BookOpen size={12} /> Semester {item.Semester?.SemesterNumber}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Chip size="sm" variant="flat" className="bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">
                                        Batch {item.BatchYear}
                                    </Chip>
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Tooltip content="Edit Details">
                                            <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(item)}>
                                                <Pencil size={18} className="text-gray-400 hover:text-blue-600" />
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content="Delete Student" color="danger">
                                            <Button isIconOnly size="sm" variant="light" onPress={() => confirmDelete(item)}>
                                                <Trash2 size={18} className="text-gray-400 hover:text-red-600" />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>


            <AddStudentModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                onSuccess={() => fetchStudents()}
            />

            {
                selectedStudent && (
                    <EditStudentModal
                        isOpen={isEditOpen}
                        onClose={() => setIsEditOpen(false)}
                        onSuccess={() => fetchStudents()}
                        student={selectedStudent}
                    />
                )
            }

            {/* Filter Modal */}
            <Modal isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} size="sm" backdrop="blur" classNames={{ base: "bg-white rounded-2xl shadow-2xl", backdrop: "bg-black/50" }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 border-b border-gray-100 pb-4">
                                <span className="text-lg font-bold text-gray-900">Filters</span>
                            </ModalHeader>
                            <ModalBody className="pt-6">
                                <div className="space-y-4">
                                    <Select placeholder="All Departments" selectedKeys={tempFilters.dept ? [tempFilters.dept] : []} onChange={(e) => setTempFilters(p => ({ ...p, dept: e.target.value }))} classNames={{ selectorIcon: "hidden" }}>
                                        {departments.map(d => <SelectItem key={d.DepartmentID}>{d.DepartmentName}</SelectItem>)}
                                    </Select>
                                    <Select placeholder="All Programs" selectedKeys={tempFilters.program ? [tempFilters.program] : []} onChange={(e) => setTempFilters(p => ({ ...p, program: e.target.value }))} classNames={{ selectorIcon: "hidden" }}>
                                        {programs.map(p => <SelectItem key={p.ProgramID}>{p.ProgramName}</SelectItem>)}
                                    </Select>
                                    <Select placeholder="All Semesters" isDisabled={!tempFilters.program} selectedKeys={tempFilters.semester ? [tempFilters.semester] : []} onChange={(e) => setTempFilters(p => ({ ...p, semester: e.target.value }))} classNames={{ selectorIcon: "hidden" }}>
                                        {filteredFilterSemesters.map(s => <SelectItem key={s.SemesterID}>{`Semester ${s.SemesterNumber}`}</SelectItem>)}
                                    </Select>
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t border-gray-100 pt-4">
                                <Button variant="light" onPress={clearFilters} color="danger">Clear</Button>
                                <Button className="bg-gray-900 text-white" onPress={applyFilters}>Apply</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                size="sm"
                backdrop="blur"
                classNames={{
                    base: "bg-white rounded-2xl shadow-xl border border-gray-100",
                    header: "border-b border-gray-100 py-4",
                    body: "py-6",
                    footer: "border-t border-gray-100 py-4"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <span className="text-xl font-bold text-gray-900">Delete Student</span>
                                <span className="text-sm font-normal text-gray-500">This action cannot be undone.</span>
                            </ModalHeader>
                            <ModalBody>
                                <p className="text-gray-700">
                                    Are you sure you want to delete the student profile for <span className="font-bold text-gray-900">{selectedStudent?.User?.FullName}</span>?
                                </p>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose} className="font-medium text-gray-600">Cancel</Button>
                                <Button color="danger" onPress={handleDelete} className="font-medium shadow-lg shadow-red-500/20">Delete Student</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Delete All Modal */}
            <Modal
                isOpen={isDeleteAllOpen}
                onClose={() => setIsDeleteAllOpen(false)}
                size="md"
                backdrop="blur"
                classNames={{
                    base: "bg-white rounded-2xl shadow-xl border border-gray-100",
                    header: "border-b border-gray-100 py-4",
                    body: "py-6",
                    footer: "border-t border-gray-100 py-4"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex gap-3 items-center">
                                <div className="p-2 bg-red-50 rounded-xl text-red-600">
                                    <AlertTriangle size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold text-gray-900">Delete All Students</span>
                                    <span className="text-sm font-normal text-gray-500">Bulk action</span>
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <p className="text-gray-600">
                                        You are about to delete <span className="font-bold text-gray-900">ALL</span> student academic records from the database.
                                    </p>

                                    <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-3">
                                        <div className="flex gap-2 text-sm text-red-800 font-medium">
                                            <AlertTriangle size={16} className="mt-0.5" />
                                            What will be deleted:
                                        </div>
                                        <ul className="list-disc pl-9 space-y-1 text-sm text-red-700/80">
                                            <li>Academic profiles (Batch, Dept, etc.)</li>
                                            <li>Enrollment records</li>
                                        </ul>
                                    </div>

                                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3">
                                        <div className="text-blue-600 mt-0.5"><Building2 size={18} /></div>
                                        <div className="text-sm text-blue-900/80">
                                            <span className="font-bold text-blue-900">Note:</span> User login accounts will NOT be deleted. To remove accounts, please use the Data Cleanup page.
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose} className="font-medium text-gray-600">Cancel</Button>
                                <Button className="font-medium shadow-lg shadow-red-500/20 bg-red-600 text-white" onPress={handleDeleteAll}>
                                    Yes, Delete All Profiles
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Import Modal */}
            <StudentImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={fetchStudents}
            />
        </div>
    );
};

export default Students;
