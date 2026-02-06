import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Tooltip } from '@heroui/react';
import { Building2, Upload, Download, RefreshCw, FileSpreadsheet, AlertCircle, Info, Trash2, Edit, Trash } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { toast } from '../../../../utils/toast';

interface Department {
    DepartmentID: number;
    DepartmentCode: string;
    DepartmentName: string;
}

interface DepartmentsProps {
    academicYearId: number | null;
}

export const Departments: React.FC<DepartmentsProps> = ({ academicYearId }) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onOpenChange: onDeleteOpenChange } = useDisclosure();
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'all', id?: number }>({ type: 'single' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const res = await academicService.getDepartments();
            setDepartments(res.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setImporting(true);
            const result = await academicService.importDepartments(file);
            toast.success(`Imported ${result.successCount} departments successfully`);
            if (result.errorCount > 0) {
                toast.error(`${result.errorCount} errors occurred`);
            }
            fetchDepartments();
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
            await academicService.downloadDepartmentTemplate();
            toast.success("Template downloaded successfully");
        } catch (error) {
            console.error(error);
            toast.error("Failed to download template");
        }
    };

    const handleEdit = (dept: Department) => {
        // TODO: Implement edit functionality
        toast.success(`Edit functionality for ${dept.DepartmentCode} - Coming soon!`);
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
                await academicService.deleteDepartment(deleteTarget.id);
                toast.success('Department deleted successfully');
            } else if (deleteTarget.type === 'all') {
                await academicService.deleteAllDepartments();
                toast.success('All departments deleted successfully');
            }
            fetchDepartments();
            onDeleteOpenChange();
        } catch (error: any) {
            console.error(error);
            const message = error.response?.data?.message || 'Failed to delete department(s)';
            toast.error(message);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2.5 rounded-lg">
                        <Building2 size={20} className="text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Departments</h3>
                        <p className="text-sm text-slate-500">Manage academic departments via Excel import</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Chip size="sm" variant="flat" color="primary">{departments.length} Total</Chip>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <Button
                    color="primary"
                    className="font-semibold text-white"
                    startContent={<Upload size={18} />}
                    onPress={onOpen}
                >
                    Import Departments
                </Button>
                <Button
                    className="bg-red-600 text-white font-semibold hover:bg-red-700"
                    startContent={<Trash2 size={18} />}
                    onPress={() => handleDeleteAll()}
                    isDisabled={departments.length === 0}
                >
                    Delete All
                </Button>
                <Button
                    variant="light"
                    isIconOnly
                    onPress={fetchDepartments}
                    isLoading={loading}
                >
                    <RefreshCw size={18} />
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <Table
                    aria-label="Departments Table"
                    classNames={{
                        wrapper: "shadow-none",
                        th: "bg-slate-50 text-slate-600 font-semibold",
                    }}
                >
                    <TableHeader>
                        <TableColumn>CODE</TableColumn>
                        <TableColumn>DEPARTMENT NAME</TableColumn>
                        <TableColumn width={120}>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody
                        emptyContent={
                            loading ? <Spinner /> : "No departments found. Import departments to get started."
                        }
                        isLoading={loading}
                    >
                        {departments.map(dept => (
                            <TableRow key={dept.DepartmentID}>
                                <TableCell>
                                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                        {dept.DepartmentCode}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="font-medium text-slate-900">{dept.DepartmentName}</span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            onPress={() => handleEdit(dept)}
                                        >
                                            <Edit size={16} className="text-blue-600" />
                                        </Button>
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            onPress={() => handleDelete(dept.DepartmentID)}
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
                                    <FileSpreadsheet className="text-blue-600" size={24} />
                                    <span className="text-xl font-bold">Import Departments</span>
                                </div>
                                <p className="text-sm text-slate-500 font-normal">Upload an Excel file with department data</p>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                {/* Instructions */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={18} />
                                        <div className="text-sm text-blue-900">
                                            <p className="font-semibold mb-1">Required Columns</p>
                                            <p className="text-blue-700">Your Excel file must contain the following columns:</p>
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
                                                <td className="px-4 py-2 font-mono text-slate-900 bg-slate-50">DepartmentCode</td>
                                                <td className="px-4 py-2 text-slate-600">Unique code for the department (e.g., CS, ME, EC)</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-2 font-mono text-slate-900 bg-slate-50">DepartmentName</td>
                                                <td className="px-4 py-2 text-slate-600">Full name of the department</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Example */}
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <p className="text-sm font-semibold text-slate-700 mb-2">Example:</p>
                                    <div className="bg-white border border-slate-200 rounded overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-100">
                                                <tr>
                                                    <th className="text-left px-3 py-1.5 font-mono text-xs text-slate-600">DepartmentCode</th>
                                                    <th className="text-left px-3 py-1.5 font-mono text-xs text-slate-600">DepartmentName</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                <tr>
                                                    <td className="px-3 py-1.5 font-mono text-xs">CS</td>
                                                    <td className="px-3 py-1.5 text-xs">Computer Science and Engineering</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-3 py-1.5 font-mono text-xs">ME</td>
                                                    <td className="px-3 py-1.5 text-xs">Mechanical Engineering</td>
                                                </tr>
                                                <tr>
                                                    <td className="px-3 py-1.5 font-mono text-xs">EC</td>
                                                    <td className="px-3 py-1.5 text-xs">Electronics and Communication</td>
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
                                        id="dept-file-input-modal"
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleImport}
                                        className="block w-full text-sm text-slate-500
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-lg file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            hover:file:bg-blue-100
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
                                        {deleteTarget.type === 'all' ? 'Delete All Departments?' : 'Delete Department?'}
                                    </span>
                                </div>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                <div className="space-y-4">
                                    <p className="text-slate-700">
                                        {deleteTarget.type === 'all'
                                            ? `You are about to delete all ${departments.length} departments. This action cannot be undone.`
                                            : 'Are you sure you want to delete this department? This action cannot be undone.'}
                                    </p>
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <div className="flex gap-2">
                                            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
                                            <div className="text-sm text-red-800">
                                                <p className="font-semibold mb-1">Warning</p>
                                                <p>Deleting departments may affect related programs and students. Please ensure this is what you want to do.</p>
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
