import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Spinner } from '@heroui/react';
import { Building2, Upload, Download, RefreshCw } from 'lucide-react';
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
            toast.success("Template downloaded");
        } catch (error) {
            toast.error("Failed to download template");
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
                    onPress={() => document.getElementById('dept-file-input')?.click()}
                    isLoading={importing}
                >
                    Import Departments
                </Button>
                <input
                    id="dept-file-input"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImport}
                    className="hidden"
                />
                <Button
                    variant="bordered"
                    startContent={<Download size={18} />}
                    onPress={handleDownloadTemplate}
                    className="font-medium"
                >
                    Download Template
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
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
