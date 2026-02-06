import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Spinner, Select, SelectItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Tooltip } from '@heroui/react';
import { Layers, Upload, Download, RefreshCw, Filter, FileSpreadsheet, AlertCircle, Info, Trash2, Edit, Trash } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { toast } from '../../../../utils/toast';

interface Program {
    ProgramID: number;
    ProgramCode: string;
    ProgramName: string;
    DurationYears: number;
    Department?: {
        DepartmentCode: string;
        DepartmentName: string;
    };
}

interface Department {
    DepartmentID: number;
    DepartmentCode: string;
    DepartmentName: string;
}

interface ProgramsProps {
    academicYearId: number | null;
}

export const Programs: React.FC<ProgramsProps> = ({ academicYearId }) => {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [filterDept, setFilterDept] = useState<string>('');
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'all', id?: number }>({ type: 'single' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchPrograms = async () => {
        try {
            setLoading(true);
            const res = await academicService.getPrograms();
            setPrograms(res.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load programs");
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await academicService.getDepartments();
            setDepartments(res.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchPrograms();
        fetchDepartments();
    }, []);

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            const result = await academicService.importPrograms(file);
            toast.success(`Imported ${result.successCount} programs successfully`);
            if (result.errorCount > 0) {
                toast.error(`${result.errorCount} errors occurred`);
            }
            fetchPrograms();
            onOpenChange(); // Close modal
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Import failed");
        } finally {
            setImporting(false);
            event.target.value = ''; // Reset file input
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await academicService.downloadProgramTemplate();
            toast.success("Template downloaded successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to download template");
        }
    };

    const handleEdit = (prog: any) => {
        // TODO: Implement edit functionality
        toast.success(`Edit functionality for ${prog.ProgramCode} - Coming soon!`);
    };

    const handleDelete = async (id: number) => {
        setDeleteTarget({ type: 'single', id });
        onDeleteOpen();
    };

    const handleDeleteAll = async () => {
        setDeleteTarget({ type: 'all' });
        onDeleteOpen();
    };

    const confirmDelete = async () => {
        try {
            if (deleteTarget.type === 'single' && deleteTarget.id) {
                await academicService.deleteProgram(deleteTarget.id);
                toast.success('Program deleted successfully');
            } else if (deleteTarget.type === 'all') {
                await academicService.deleteAllPrograms();
                toast.success('All programs deleted successfully');
            }
            fetchPrograms();
            onDeleteOpenChange();
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || 'Failed to delete program(s)';
            toast.error(message);
        }
    };

    const filteredPrograms = filterDept
        ? programs.filter(p => p.Department?.DepartmentCode === filterDept)
        : programs;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-lg">
                        <Layers size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Programs</h3>
                        <p className="text-sm text-slate-500">Manage academic programs via Excel import</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Chip size="sm" variant="flat" color="secondary">{filteredPrograms.length} / {programs.length}</Chip>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 items-center flex-wrap">
                <Button
                    color="primary"
                    className="font-semibold text-white"
                    startContent={<Upload size={18} />}
                    onPress={onOpen}
                >
                    Import Programs
                </Button>
                <Button
                    className="bg-red-600 text-white font-semibold hover:bg-red-700"
                    startContent={<Trash2 size={18} />}
                    onPress={() => handleDeleteAll()}
                    isDisabled={programs.length === 0}
                >
                    Delete All
                </Button>
                <Button
                    variant="light"
                    isIconOnly
                    onPress={fetchPrograms}
                    isLoading={loading}
                >
                    <RefreshCw size={18} />
                </Button>

                {/* Filter */}
                <div className="ml-auto w-64">
                    <Select
                        placeholder="Filter by Department"
                        selectedKeys={filterDept ? [filterDept] : []}
                        onChange={(e) => setFilterDept(e.target.value)}
                        startContent={<Filter size={16} />}
                        classNames={{
                            trigger: "h-10",
                            value: "text-sm"
                        }}
                    >
                        <SelectItem key="">All Departments</SelectItem>
                        {departments.map(dept => (
                            <SelectItem key={dept.DepartmentCode}>
                                {dept.DepartmentCode} - {dept.DepartmentName}
                            </SelectItem>
                        ))}
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <Table
                    aria-label="Programs Table"
                    classNames={{
                        wrapper: "shadow-none",
                        th: "bg-slate-50 text-slate-600 font-semibold",
                    }}
                >
                    <TableHeader>
                        <TableColumn>CODE</TableColumn>
                        <TableColumn>PROGRAM NAME</TableColumn>
                        <TableColumn>DEPARTMENT</TableColumn>
                        <TableColumn>DURATION</TableColumn>
                        <TableColumn width={120}>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={
                            loading ? <Spinner /> : "No programs found. Import programs to get started."
                        }
                        isLoading={loading}
                    >
                        {filteredPrograms.map(prog => (
                            <TableRow key={prog.ProgramID}>
                                <TableCell>
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                        {prog.ProgramCode}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-medium text-slate-900">{prog.ProgramName}</span>
                                </TableCell>
                                <TableCell>
                                    {prog.Department && (
                                        <Chip size="sm" variant="flat" color="primary">
                                            {prog.Department.DepartmentCode}
                                        </Chip>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <span className="text-slate-600">{prog.DurationYears} years</span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            onPress={() => handleEdit(prog)}
                                        >
                                            <Edit size={16} className="text-blue-600" />
                                        </Button>
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            onPress={() => handleDelete(prog.ProgramID)}
                                        >
                                            <Trash size={16} className="text-red-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Import Modal */}
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                size="2xl"
                backdrop="blur"
                classNames={{
                    wrapper: "z-[999]",
                    backdrop: "bg-slate-900/50",
                    base: "bg-white",
                    body: "bg-white",
                    header: "bg-white",
                    footer: "bg-white"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 border-b pb-4">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="text-indigo-600" size={24} />
                                    <span className="text-xl font-bold">Import Programs</span>
                                </div>
                                <p className="text-sm text-slate-500 font-normal">Upload an Excel file with program data</p>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                {/* Instructions */}
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="text-indigo-600 mt-0.5 flex-shrink-0" size={18} />
                                        <div className="text-sm text-indigo-900">
                                            <p className="font-semibold mb-1">Required Columns</p>
                                            <p className="text-indigo-700">Your Excel file must contain the following columns:</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Required Fields Table */}
                                <div className="border border-slate-200 rounded-lg overflow-hidden mb-4">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-left px-4 py-2 font-semibold text-slate-700">Column Name</th>
                                                <th className="text-left px-4 py-2 font-semibold text-slate-700">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            <tr>
                                                <td className="px-4 py-2 font-mono text-slate-900 bg-slate-50">ProgramCode</td>
                                                <td className="px-4 py-2 text-slate-600">Unique code for the program (e.g., BTECH-CS, MCA)</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-mono text-slate-900 bg-slate-50">ProgramName</td>
                                                <td className="px-4 py-2 text-slate-600">Full name of the program</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-mono text-slate-900 bg-slate-50">DepartmentCode</td>
                                                <td className="px-4 py-2 text-slate-600">Department code (must exist in Departments)</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-mono text-slate-900 bg-slate-50">DurationYears</td>
                                                <td className="px-4 py-2 text-slate-600">Program duration in years (e.g., 4, 2, 5)</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Example */}
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-slate-700 mb-2">Example:</p>
                                    <div className="bg-white border border-slate-200 rounded overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="text-left px-3 py-1.5 font-mono text-xs text-slate-600">ProgramCode</th>
                                                    <th className="text-left px-3 py-1.5 font-mono text-xs text-slate-600">ProgramName</th>
                                                    <th className="text-left px-3 py-1.5 font-mono text-xs text-slate-600">DepartmentCode</th>
                                                    <th className="text-left px-3 py-1.5 font-mono text-xs text-slate-600">DurationYears</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                <tr>
                                                    <td className="px-3 py-1.5 font-mono text-xs">BTECH-CS</td>
                                                    <td className="px-3 py-1.5 text-xs">B.Tech Computer Science</td>
                                                    <td className="px-3 py-1.5 font-mono text-xs">CS</td>
                                                    <td className="px-3 py-1.5 text-xs">4</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-3 py-1.5 font-mono text-xs">MCA</td>
                                                    <td className="px-3 py-1.5 text-xs">Master of Computer Applications</td>
                                                    <td className="px-3 py-1.5 font-mono text-xs">CA</td>
                                                    <td className="px-3 py-1.5 text-xs">2</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-3 py-1.5 font-mono text-xs">MCAI</td>
                                                    <td className="px-3 py-1.5 text-xs">Integrated MCA</td>
                                                    <td className="px-3 py-1.5 font-mono text-xs">CA</td>
                                                    <td className="px-3 py-1.5 text-xs">5</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* File Upload */}
                                <div className="mt-6">
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Select Excel File
                                    </label>
                                    <input
                                        id="prog-file-input-modal"
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleImport}
                                        className="block w-full text-sm text-slate-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-lg file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-indigo-50 file:text-indigo-700
                                            hover:file:bg-indigo-100
                                            cursor-pointer border border-slate-300 rounded-lg"
                                    />
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t pt-4">
                                <Button onPress={onClose} className="bg-red-600 text-white font-semibold hover:bg-red-700">
                                    Cancel
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteOpen}
                onOpenChange={onDeleteOpenChange}
                size="md"
                backdrop="blur"
                classNames={{
                    wrapper: "z-[999]",
                    backdrop: "z-[998] bg-black/50",
                    base: "bg-white"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 border-b pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-red-100 rounded-full">
                                        <Trash2 className="text-red-600" size={24} />
                                    </div>
                                    <span className="text-xl font-bold text-slate-900">
                                        {deleteTarget.type === 'all' ? 'Delete All Programs?' : 'Delete Program?'}
                                    </span>
                                </div>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                <div className="space-y-4">
                                    <p className="text-slate-700">
                                        {deleteTarget.type === 'all'
                                            ? `You are about to delete all ${programs.length} programs. This action cannot be undone.`
                                            : 'Are you sure you want to delete this program? This action cannot be undone.'}
                                    </p>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex gap-2">
                                            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                                            <div className="text-sm text-red-800">
                                                <p className="font-semibold mb-1">Warning</p>
                                                <p>Deleting programs may affect related students and academic records. Please ensure this is what you want to do.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="border-t pt-4">
                                <Button variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-red-600 text-white font-semibold hover:bg-red-700"
                                    onPress={confirmDelete}
                                    startContent={<Trash2 size={18} />}
                                >
                                    {deleteTarget.type === 'all' ? 'Delete All' : 'Delete'}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};
