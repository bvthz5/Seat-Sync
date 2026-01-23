import React, { useEffect, useState } from 'react';
import { Button, Card, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Pagination, Input, User as UserAvatar, Tooltip, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Popover, PopoverTrigger, PopoverContent, Select, SelectItem, Badge } from '@heroui/react';
import { Plus, Search, FileSpreadsheet, MoreVertical, Filter, Download, Pencil, Trash2, AlertTriangle, X, Check, Building2, GraduationCap, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import { BulkImportModal } from '../components/students/BulkImportModal';
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

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 500);
    const [filters, setFilters] = useState({
        dept: "",
        program: "",
        semester: ""
    });

    // Master Data for Filters
    const [departments, setDepartments] = useState<any[]>([]);
    const [programs, setPrograms] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);

    // Modals
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false); // New Filter Modal State

    // Temp state for filter modal
    const [tempFilters, setTempFilters] = useState(filters);

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    // Fetch Master Data
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await api.get('/students/meta/create-options');
                setDepartments(res.data.departments);
                setPrograms(res.data.programs);
                setSemesters(res.data.semesters);
            } catch (err) {
                console.error("Failed to load filters", err);
            }
        };
        fetchMeta();
    }, []);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "10",
                search: debouncedSearch,
                ...(filters.dept && { dept: filters.dept }),
                ...(filters.program && { program: filters.program }),
                ...(filters.semester && { semester: filters.semester })
            });

            const response = await api.get(`/students?${params.toString()}`);
            setStudents(response.data.students);
            setTotalPages(response.data.totalPages);
        } catch (error) {
            console.error("Failed to fetch students", error);
            toast.error("Failed to load students");
        } finally {
            setIsLoading(false);
        }
    };

    // Refetch when dependencies change
    useEffect(() => {
        fetchStudents();
    }, [page, debouncedSearch, filters]);

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
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error.response?.data?.message || "Failed to delete student");
        }
    };

    const openFilters = () => {
        setTempFilters(filters);
        setIsFilterOpen(true);
    };

    const applyFilters = () => {
        setFilters(tempFilters);
        setPage(1);
        setIsFilterOpen(false);
    };

    const clearFilters = () => {
        setFilters({ dept: "", program: "", semester: "" });
        setTempFilters({ dept: "", program: "", semester: "" });
        setPage(1);
        setIsFilterOpen(false);
    };

    const activeFiltersCount = Object.values(filters).filter(Boolean).length;

    const filteredFilterSemesters = tempFilters.program
        ? semesters.filter(s => s.ProgramID === parseInt(tempFilters.program))
        : semesters;

    const handleExport = async () => {
        try {
            const params = new URLSearchParams({
                search: debouncedSearch,
                ...(filters.dept && { dept: filters.dept }),
                ...(filters.program && { program: filters.program }),
                ...(filters.semester && { semester: filters.semester })
            });

            const response = await api.get(`/students/export?${params.toString()}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'students.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error("Export failed", error);
            toast.error("Failed to export students");
        }
    };

    return (
        <div className="flex flex-col gap-8 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-gray-100 dark:border-zinc-800 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Students</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage student records, enrollments, and academic details.</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
                        variant="light"
                        startContent={<FileSpreadsheet size={18} className="text-gray-500" />}
                        onPress={() => setIsImportOpen(true)}
                    >
                        Import from Excel
                    </Button>
                    <Button
                        className="bg-gray-900 dark:bg-white text-white dark:text-black font-medium shadow-md shadow-gray-200 dark:shadow-none"
                        startContent={<Plus size={18} />}
                        onPress={() => setIsAddOpen(true)}
                    >
                        Add Student
                    </Button>
                </div>
            </div>

            {/* Filters & Actions Bar */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white dark:bg-zinc-900/50 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                <div className="w-full sm:w-96">
                    <Input
                        classNames={{
                            base: "max-w-full sm:max-w-md h-10",
                            mainWrapper: "h-full",
                            input: "text-small",
                            inputWrapper: "h-full font-normal text-default-500 bg-gray-50 dark:bg-zinc-800 border-none group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-zinc-900 ring-1 ring-transparent group-data-[focus=true]:ring-gray-200 dark:group-data-[focus=true]:ring-zinc-700 transition-all",
                        }}
                        placeholder="Search by name, email, or register no..."
                        startContent={<Search size={18} className="text-gray-400" />}
                        value={searchQuery}
                        onValueChange={(val) => {
                            setSearchQuery(val);
                            setPage(1); // Reset page on search
                        }}
                        isClearable
                        onClear={() => setSearchQuery("")}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={activeFiltersCount > 0 ? "flat" : "light"}
                        color={activeFiltersCount > 0 ? "primary" : "default"}
                        className={`font-medium ${activeFiltersCount > 0 ? "bg-primary/10 text-primary" : "text-gray-600 dark:text-gray-400"}`}
                        startContent={<Filter size={18} />}
                        onPress={openFilters}
                    >
                        Filter
                        {activeFiltersCount > 0 && (
                            <span className="ml-2 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {activeFiltersCount}
                            </span>
                        )}
                    </Button>
                    <Modal
                        isOpen={isFilterOpen}
                        onClose={() => setIsFilterOpen(false)}
                        size="sm"
                        classNames={{
                            base: "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 shadow-2xl rounded-2xl",
                            header: "border-b border-gray-100 dark:border-zinc-800 p-6",
                            body: "p-6",
                            footer: "border-t border-gray-100 dark:border-zinc-800 p-6 bg-gray-50/50 dark:bg-zinc-900/50",
                            closeButton: "hover:bg-gray-100 dark:hover:bg-zinc-800 active:bg-gray-200 dark:active:bg-zinc-700 p-2 rounded-full transition-colors right-4 top-4"
                        }}
                    >
                        <ModalContent>
                            <ModalHeader className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Filter size={18} />
                                    </div>
                                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">Filter Students</span>
                                </div>
                                <p className="text-xs font-normal text-gray-500">Refine the student list by selecting criteria below.</p>
                            </ModalHeader>
                            <ModalBody>
                                <div className="space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Department</label>
                                        <Select
                                            placeholder="Select Department"
                                            size="md"
                                            selectedKeys={tempFilters.dept ? [tempFilters.dept] : []}
                                            onChange={(e) => setTempFilters(prev => ({ ...prev, dept: e.target.value }))}
                                            startContent={<Building2 size={18} className="text-gray-400 group-hover:text-primary transition-colors" />}
                                            classNames={{
                                                mainWrapper: "w-full",
                                                trigger: "bg-gray-50 dark:bg-zinc-900 border-none hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-none data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800 transition-colors h-12 rounded-xl",
                                                popoverContent: "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 shadow-xl w-full",
                                                value: "text-small text-gray-700 dark:text-gray-300 group-data-[has-value=true]:text-gray-900 dark:group-data-[has-value=true]:text-gray-100 font-medium pl-1",
                                                selectorIcon: "hidden"
                                            }}
                                        >
                                            {departments.map((d) => (
                                                <SelectItem key={d.DepartmentID} textValue={d.DepartmentName} classNames={{ base: "rounded-lg" }}>
                                                    {d.DepartmentName}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Program</label>
                                        <Select
                                            placeholder="Select Program"
                                            size="md"
                                            selectedKeys={tempFilters.program ? [tempFilters.program] : []}
                                            onChange={(e) => setTempFilters(prev => ({ ...prev, program: e.target.value }))}
                                            startContent={<GraduationCap size={18} className="text-gray-400 group-hover:text-primary transition-colors" />}
                                            classNames={{
                                                mainWrapper: "w-full",
                                                trigger: "bg-gray-50 dark:bg-zinc-900 border-none hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-none data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800 transition-colors h-12 rounded-xl",
                                                popoverContent: "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 shadow-xl w-full",
                                                value: "text-small text-gray-700 dark:text-gray-300 group-data-[has-value=true]:text-gray-900 dark:group-data-[has-value=true]:text-gray-100 font-medium pl-1",
                                                selectorIcon: "hidden"
                                            }}
                                        >
                                            {programs.map((p) => (
                                                <SelectItem key={p.ProgramID} textValue={p.ProgramName} classNames={{ base: "rounded-lg" }}>
                                                    {p.ProgramName}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Semester</label>
                                        <Select
                                            placeholder="Select Semester"
                                            size="md"
                                            selectedKeys={tempFilters.semester ? [tempFilters.semester] : []}
                                            onChange={(e) => setTempFilters(prev => ({ ...prev, semester: e.target.value }))}
                                            isDisabled={!tempFilters.program}
                                            startContent={<BookOpen size={18} className="text-gray-400 group-hover:text-primary transition-colors" />}
                                            classNames={{
                                                mainWrapper: "w-full",
                                                trigger: "bg-gray-50 dark:bg-zinc-900 border-none hover:bg-gray-100 dark:hover:bg-zinc-800 shadow-none data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800 transition-colors h-12 rounded-xl",
                                                popoverContent: "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 shadow-xl w-full",
                                                value: "text-small text-gray-700 dark:text-gray-300 group-data-[has-value=true]:text-gray-900 dark:group-data-[has-value=true]:text-gray-100 font-medium pl-1",
                                                selectorIcon: "hidden"
                                            }}
                                        >
                                            {filteredFilterSemesters.map((s) => (
                                                <SelectItem key={s.SemesterID} textValue={s.SemesterNumber.toString()} classNames={{ base: "rounded-lg" }}>
                                                    Semester {s.SemesterNumber}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="flex justify-between items-center">
                                <Button
                                    variant="flat"
                                    color="danger"
                                    className="bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-medium"
                                    onPress={clearFilters}
                                >
                                    Reset
                                </Button>
                                <div className="flex gap-3">
                                    <Button variant="light" onPress={() => setIsFilterOpen(false)} className="font-semibold text-gray-500">
                                        Cancel
                                    </Button>
                                    <Button
                                        className="bg-black dark:bg-white text-white dark:text-black font-bold shadow-lg shadow-black/20 dark:shadow-white/20"
                                        onPress={applyFilters}
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>
                    <Button
                        isIconOnly
                        variant="flat"
                        className="bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-gray-400"
                        onPress={handleExport}
                    >
                        <Download size={18} />
                    </Button>
                </div>
            </div>

            {/* Table Card */}
            <Card className="border border-gray-100 dark:border-zinc-800 shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
                <CardBody className="p-0">
                    <Table
                        aria-label="Students Table"
                        shadow="none"
                        classNames={{
                            wrapper: "p-0",
                            th: "bg-gray-50/50 dark:bg-zinc-800/50 text-gray-500 font-medium text-xs uppercase tracking-wider h-12 border-b border-gray-100 dark:border-zinc-800",
                            td: "py-4 border-b border-gray-50 dark:border-zinc-800/50 group-last:border-none",
                            table: "min-h-[400px]"
                        }}
                        bottomContent={
                            totalPages > 1 && (
                                <div className="flex w-full justify-center items-center px-6 py-4 border-t border-gray-100 dark:border-zinc-800">
                                    <Pagination
                                        showControls
                                        disableCursorAnimation
                                        total={totalPages}
                                        page={page}
                                        onChange={setPage}
                                        variant="light"
                                        radius="md"
                                        classNames={{
                                            wrapper: "gap-2",
                                            item: "w-8 h-8 text-small font-medium text-gray-500 rounded-lg transition-colors data-[active=true]:bg-gray-100 dark:data-[active=true]:bg-zinc-800 data-[active=true]:text-gray-900 dark:data-[active=true]:text-white data-[active=true]:font-bold hover:bg-gray-50 dark:hover:bg-zinc-800",
                                            prev: "hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg",
                                            next: "hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg",
                                        }}
                                    />
                                </div>
                            )
                        }
                    >
                        <TableHeader>
                            <TableColumn>STUDENT</TableColumn>
                            <TableColumn>REGISTER NO.</TableColumn>
                            <TableColumn>DEPARTMENT</TableColumn>
                            <TableColumn>PROGRAM</TableColumn>
                            <TableColumn>SEMESTER</TableColumn>
                            <TableColumn>BATCH</TableColumn>
                            <TableColumn>ACTIONS</TableColumn>
                        </TableHeader>
                        <TableBody
                            emptyContent={
                                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
                                    <div className="p-6 bg-gray-50 dark:bg-zinc-800/50 rounded-full mb-4">
                                        <FileSpreadsheet size={48} className="text-gray-300 dark:text-zinc-600" />
                                    </div>
                                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">No students found</p>
                                    <p className="text-sm text-gray-500 max-w-xs mt-1">Try adjusting your search or add new students to the system.</p>
                                </div>
                            }
                            items={students}
                            isLoading={isLoading}
                        >
                            {(item) => (
                                <TableRow key={item.StudentID} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                                    <TableCell>
                                        <UserAvatar
                                            name={item.User?.FullName || item.User?.Email?.split('@')[0] || "Student"}
                                            description={item.User?.Email}
                                            avatarProps={{
                                                radius: "lg",
                                                src: `https://api.dicebear.com/7.x/initials/svg?seed=${item.RegisterNumber}`,
                                                classNames: { base: "bg-primary/10 text-primary font-semibold" }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-semibold text-gray-700 dark:text-gray-300 font-mono text-sm">{item.RegisterNumber}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="sm" variant="dot" color="primary" classNames={{ content: "font-semibold text-gray-600 dark:text-gray-300" }}>
                                            {item.Department?.DepartmentCode}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-gray-600 dark:text-gray-400">{item.Program?.ProgramName}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">Sem {item.Semester?.SemesterNumber}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 text-xs font-semibold text-gray-500">
                                            {item.BatchYear}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-end items-center gap-2">
                                            <Dropdown placement="bottom-end">
                                                <DropdownTrigger>
                                                    <Button
                                                        size="sm"
                                                        color="danger"
                                                        variant="flat"
                                                        className="font-medium"
                                                    >
                                                        Action
                                                    </Button>
                                                </DropdownTrigger>
                                                <DropdownMenu
                                                    aria-label="Student Actions"
                                                    className="bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-xl p-1"
                                                    itemClasses={{
                                                        base: "rounded-lg data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800"
                                                    }}
                                                >
                                                    <DropdownItem
                                                        key="edit"
                                                        startContent={<Pencil size={16} />}
                                                        onPress={() => handleEdit(item)}
                                                    >
                                                        Edit Details
                                                    </DropdownItem>
                                                    <DropdownItem
                                                        key="delete"
                                                        className="text-red-600 dark:text-red-500"
                                                        color="danger"
                                                        startContent={<Trash2 size={16} />}
                                                        onPress={() => confirmDelete(item)}
                                                    >
                                                        Delete
                                                    </DropdownItem>
                                                </DropdownMenu>
                                            </Dropdown>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table >
                </CardBody >
            </Card >

            {/* Modals */}
            < BulkImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                onSuccess={() => {
                    fetchStudents();
                }}
            />
            < AddStudentModal
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

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                placement="center"
                backdrop="blur"
                size="sm"
                classNames={{
                    base: "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 items-center justify-center pt-8">
                                <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                                    <AlertTriangle size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delete Student?</h3>
                            </ModalHeader>
                            <ModalBody className="text-center px-8">
                                <p className="text-gray-500 dark:text-gray-400">
                                    Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedStudent?.User?.FullName}</span>?
                                    This action cannot be undone and will remove all associated data.
                                </p>
                            </ModalBody>
                            <ModalFooter className="justify-center gap-3 pb-8 pt-6">
                                <Button variant="light" onPress={onClose} className="font-medium text-gray-600">
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-red-500 hover:bg-red-600 text-white font-medium shadow-lg shadow-red-500/20"
                                    onPress={handleDelete}
                                >
                                    Delete Student
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div >
    );
};


export default Students;
