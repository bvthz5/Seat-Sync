import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Chip, Spinner, Select, SelectItem } from '@heroui/react';
import { Layers, Upload, Download, RefreshCw, Filter } from 'lucide-react';
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
            toast.success("Template downloaded");
        } catch (error) {
            toast.error("Failed to download template");
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
                    color="secondary"
                    className="font-semibold text-white"
                    startContent={<Upload size={18} />}
                    onPress={() => document.getElementById('prog-file-input')?.click()}
                    isLoading={importing}
                >
                    Import Programs
                </Button>
                <input
                    id="prog-file-input"
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
                        <SelectItem key="" value="">All Departments</SelectItem>
                        {departments.map(dept => (
                            <SelectItem key={dept.DepartmentCode} value={dept.DepartmentCode}>
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
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
