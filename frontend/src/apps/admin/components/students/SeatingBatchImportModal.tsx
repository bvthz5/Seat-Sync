import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@heroui/react';
import api from '../../../../services/api';

interface SeatingBatchImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ParsedRow {
    registerNumber: string;
    name: string;
    department: string;
    program: string;
    batch?: string;
    status?: 'pending' | 'error' | 'ok';
    errorMessage?: string;
}

const SeatingBatchImportModal: React.FC<SeatingBatchImportModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [leftFile, setLeftFile] = useState<File | null>(null);
    const [rightFile, setRightFile] = useState<File | null>(null);
    const [leftParsedData, setLeftParsedData] = useState<ParsedRow[]>([]);
    const [rightParsedData, setRightParsedData] = useState<ParsedRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'left' | 'right'>('left');

    const [importResult, setImportResult] = useState<{
        success: boolean;
        totalAssigned: number;
        autoCreatedCount: number;
        notFoundCount: number;
        notFound: string[];
        active: boolean
    } | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, side: 'left' | 'right') => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (side === 'left') {
                setLeftFile(selectedFile);
            } else {
                setRightFile(selectedFile);
            }
            setImportResult(null);
            await parseExcel(selectedFile, side);
        }
    };

    const parseExcel = async (file: File, side: 'left' | 'right') => {
        setIsParsing(true);
        try {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });

            const processedData: ParsedRow[] = rawData.map((row, _index) => {
                const normalizedRow: Record<string, string> = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toLowerCase().replace(/[\s_\-\.]+/g, '')] = String(row[key]);
                });

                const regNo = (
                    normalizedRow['registernumber'] ||
                    normalizedRow['regno'] ||
                    normalizedRow['regnumber'] ||
                    normalizedRow['rollnumber'] ||
                    normalizedRow['rollno'] ||
                    normalizedRow['registerationno'] ||
                    normalizedRow['registrationno'] ||
                    normalizedRow['studentid'] ||
                    ''
                ).trim();

                const name = (
                    normalizedRow['name'] ||
                    normalizedRow['studentname'] ||
                    normalizedRow['fullname'] ||
                    ''
                ).trim();

                const department = (
                    normalizedRow['department'] ||
                    normalizedRow['dept'] ||
                    normalizedRow['departmentcode'] ||
                    normalizedRow['deptcode'] ||
                    ''
                ).trim();

                const program = (
                    normalizedRow['program'] ||
                    normalizedRow['programname'] ||
                    normalizedRow['course'] ||
                    ''
                ).trim();

                let status: 'pending' | 'error' | 'ok' = 'ok';
                let errorMessage = '';

                if (!regNo) {
                    status = 'error';
                    errorMessage = 'Missing Register Number';
                }
                if (!name) {
                    status = 'error';
                    errorMessage = 'Missing Name';
                }
                if (!department) {
                    status = 'error';
                    errorMessage = 'Missing Department';
                }
                if (!program) {
                    status = 'error';
                    errorMessage = 'Missing Program';
                }

                return {
                    registerNumber: regNo,
                    name: name || 'Unknown',
                    department: department || '-',
                    program: program || '-',
                    status,
                    errorMessage
                };
            }).filter(r => r.registerNumber || r.name);

            if (side === 'left') {
                setLeftParsedData(processedData);
            } else {
                setRightParsedData(processedData);
            }

        } catch (error) {
            console.error("Excel parse error:", error);
            toast.error("Failed to read Excel file. Please ensure it's a valid .xlsx or .xls file.");
            if (side === 'left') {
                setLeftFile(null);
            } else {
                setRightFile(null);
            }
        } finally {
            setIsParsing(false);
        }
    };

    const handleImport = async () => {
        if (!leftFile && !rightFile) {
            toast.error('Please upload at least one file (left or right side).');
            return;
        }

        const leftValid = leftParsedData.filter(r => r.status !== 'error').map(r => ({
            registerNumber: r.registerNumber,
            name: r.name,
            department: r.department,
            program: r.program,
            side: 'L'
        }));

        const rightValid = rightParsedData.filter(r => r.status !== 'error').map(r => ({
            registerNumber: r.registerNumber,
            name: r.name,
            department: r.department,
            program: r.program,
            side: 'R'
        }));

        const allRows = [...leftValid, ...rightValid];

        if (allRows.length === 0) {
            toast.error("No valid data found in the files.");
            return;
        }

        setIsImporting(true);
        try {
            const response = await api.post('/students/import-seating', {
                rows: allRows
            });

            setImportResult({
                active: true,
                success: true,
                totalAssigned: response.data.totalImported,
                autoCreatedCount: response.data.autoCreatedCount || 0,
                notFoundCount: response.data.notFoundCount || 0,
                notFound: response.data.notFound || []
            });

            if (response.data.autoCreatedCount > 0) {
                toast.success(`${response.data.autoCreatedCount} new students auto-registered from Excel.`, { duration: 4000 });
            }
            toast.success(`Successfully imported ${response.data.totalImported} students with seating assignments!`);
            onSuccess();
            if (response.data.notFoundCount === 0) {
                setTimeout(() => onClose(), 2500);
            }

        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || "Failed to import seating data.";
            toast.error(errorMessage, { duration: 7000 });
        } finally {
            setIsImporting(false);
        }
    };

    const leftHasErrors = leftParsedData.some(r => r.status === 'error');
    const leftValidCount = leftParsedData.filter(r => r.status !== 'error').length;
    const rightHasErrors = rightParsedData.some(r => r.status === 'error');
    const rightValidCount = rightParsedData.filter(r => r.status !== 'error').length;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="bg-[#1a1b1e] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#141517] shrink-0">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                                Seating Batch Import
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Import student data for left and right side seating assignments
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        {/* Formatting Guide */}
                        <div className="bg-indigo-900/20 border border-indigo-800/50 rounded-xl p-4 flex gap-4 text-sm text-indigo-200">
                            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="mb-2 font-medium">Each Excel file should contain 4 columns:</p>
                                <div className="flex gap-3 flex-wrap">
                                    <code className="bg-indigo-950 px-2 py-1 rounded text-indigo-300 border border-indigo-800 text-xs">RegisterNumber</code>
                                    <code className="bg-indigo-950 px-2 py-1 rounded text-indigo-300 border border-indigo-800 text-xs">Name</code>
                                    <code className="bg-indigo-950 px-2 py-1 rounded text-indigo-300 border border-indigo-800 text-xs">Department</code>
                                    <code className="bg-indigo-950 px-2 py-1 rounded text-indigo-300 border border-indigo-800 text-xs">Program</code>
                                </div>
                                <p className="text-xs text-indigo-300 mt-2">Upload separate files for left and right side students.</p>
                            </div>
                        </div>

                        {/* Tabs for Left/Right Upload */}
                        {!importResult?.active && (
                            <div className="space-y-4">
                                <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg w-fit">
                                    <button
                                        onClick={() => setActiveTab('left')}
                                        className={`px-4 py-2 rounded transition-all text-sm font-medium ${
                                            activeTab === 'left'
                                                ? 'bg-blue-600 text-white'
                                                : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        Left Side Students
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('right')}
                                        className={`px-4 py-2 rounded transition-all text-sm font-medium ${
                                            activeTab === 'right'
                                                ? 'bg-green-600 text-white'
                                                : 'text-gray-400 hover:text-gray-200'
                                        }`}
                                    >
                                        Right Side Students
                                    </button>
                                </div>

                                {/* Left Side Tab Content */}
                                {activeTab === 'left' && (
                                    <div className="space-y-4">
                                        {/* File Upload Area */}
                                        {!leftFile && (
                                            <div
                                                className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all group cursor-pointer border-gray-700 hover:border-blue-500 hover:bg-blue-500/5"
                                                onClick={() => document.getElementById('seating-left-file-upload')?.click()}
                                            >
                                                <input
                                                    type="file"
                                                    id="seating-left-file-upload"
                                                    className="hidden"
                                                    accept=".xlsx, .xls"
                                                    onChange={(e) => handleFileChange(e, 'left')}
                                                />
                                                <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 text-gray-400 group-hover:text-blue-400 group-hover:bg-blue-500/20">
                                                    <Upload className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-white font-bold text-lg">Click to Upload Left Side Excel</h3>
                                                <p className="text-gray-500 text-sm mt-1">Only .xlsx or .xls files supported</p>
                                            </div>
                                        )}

                                        {/* Preview Area */}
                                        {leftFile && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                            <FileSpreadsheet className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white font-medium">{leftFile.name}</h3>
                                                            <p className="text-gray-400 text-sm">
                                                                {leftValidCount} valid rows · {(leftFile.size / 1024).toFixed(1)} KB
                                                                {leftHasErrors && <span className="text-red-400 ml-2">· Has errors</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        color="default"
                                                        onPress={() => {
                                                            setLeftFile(null);
                                                            setLeftParsedData([]);
                                                        }}
                                                        className="bg-gray-800 text-gray-300"
                                                    >
                                                        Change File
                                                    </Button>
                                                </div>

                                                {/* Data Preview Table */}
                                                {leftParsedData.length > 0 && (
                                                    <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#141517]">
                                                        <div className="bg-gray-800/50 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between">
                                                            <span>Data Preview (First 10 rows) - Left Side</span>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm text-left text-gray-300">
                                                                <thead className="bg-gray-800/30 text-xs text-gray-400 uppercase">
                                                                    <tr>
                                                                        <th className="px-4 py-3 font-medium">Register No</th>
                                                                        <th className="px-4 py-3 font-medium">Name</th>
                                                                        <th className="px-4 py-3 font-medium">Department</th>
                                                                        <th className="px-4 py-3 font-medium">Program</th>
                                                                        <th className="px-4 py-3 font-medium text-right">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-800">
                                                                    {leftParsedData.slice(0, 10).map((row, idx) => (
                                                                        <tr key={idx} className={row.status === 'error' ? 'bg-red-900/10' : ''}>
                                                                            <td className="px-4 py-3 font-mono text-indigo-300">{row.registerNumber || '-'}</td>
                                                                            <td className="px-4 py-3">{row.name}</td>
                                                                            <td className="px-4 py-3">
                                                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">
                                                                                    {row.department}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">
                                                                                    {row.program}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                {row.status === 'error' ? (
                                                                                    <span className="text-red-400 flex items-center justify-end gap-1 text-xs">
                                                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                                                        {row.errorMessage}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-green-400 flex items-center justify-end gap-1 text-xs">
                                                                                        <CheckCircle className="w-3.5 h-3.5" /> Ready
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {leftParsedData.length > 10 && (
                                                            <div className="p-3 text-center text-xs text-gray-500 border-t border-gray-800 bg-gray-800/10">
                                                                ... and {leftParsedData.length - 10} more rows
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Right Side Tab Content */}
                                {activeTab === 'right' && (
                                    <div className="space-y-4">
                                        {/* File Upload Area */}
                                        {!rightFile && (
                                            <div
                                                className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all group cursor-pointer border-gray-700 hover:border-green-500 hover:bg-green-500/5"
                                                onClick={() => document.getElementById('seating-right-file-upload')?.click()}
                                            >
                                                <input
                                                    type="file"
                                                    id="seating-right-file-upload"
                                                    className="hidden"
                                                    accept=".xlsx, .xls"
                                                    onChange={(e) => handleFileChange(e, 'right')}
                                                />
                                                <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 text-gray-400 group-hover:text-green-400 group-hover:bg-green-500/20">
                                                    <Upload className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-white font-bold text-lg">Click to Upload Right Side Excel</h3>
                                                <p className="text-gray-500 text-sm mt-1">Only .xlsx or .xls files supported</p>
                                            </div>
                                        )}

                                        {/* Preview Area */}
                                        {rightFile && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                                                            <FileSpreadsheet className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-white font-medium">{rightFile.name}</h3>
                                                            <p className="text-gray-400 text-sm">
                                                                {rightValidCount} valid rows · {(rightFile.size / 1024).toFixed(1)} KB
                                                                {rightHasErrors && <span className="text-red-400 ml-2">· Has errors</span>}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        color="default"
                                                        onPress={() => {
                                                            setRightFile(null);
                                                            setRightParsedData([]);
                                                        }}
                                                        className="bg-gray-800 text-gray-300"
                                                    >
                                                        Change File
                                                    </Button>
                                                </div>

                                                {/* Data Preview Table */}
                                                {rightParsedData.length > 0 && (
                                                    <div className="border border-gray-800 rounded-xl overflow-hidden bg-[#141517]">
                                                        <div className="bg-gray-800/50 px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between">
                                                            <span>Data Preview (First 10 rows) - Right Side</span>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm text-left text-gray-300">
                                                                <thead className="bg-gray-800/30 text-xs text-gray-400 uppercase">
                                                                    <tr>
                                                                        <th className="px-4 py-3 font-medium">Register No</th>
                                                                        <th className="px-4 py-3 font-medium">Name</th>
                                                                        <th className="px-4 py-3 font-medium">Department</th>
                                                                        <th className="px-4 py-3 font-medium">Program</th>
                                                                        <th className="px-4 py-3 font-medium text-right">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-800">
                                                                    {rightParsedData.slice(0, 10).map((row, idx) => (
                                                                        <tr key={idx} className={row.status === 'error' ? 'bg-red-900/10' : ''}>
                                                                            <td className="px-4 py-3 font-mono text-indigo-300">{row.registerNumber || '-'}</td>
                                                                            <td className="px-4 py-3">{row.name}</td>
                                                                            <td className="px-4 py-3">
                                                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-500/20 text-blue-400">
                                                                                    {row.department}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-500/20 text-green-400">
                                                                                    {row.program}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                {row.status === 'error' ? (
                                                                                    <span className="text-red-400 flex items-center justify-end gap-1 text-xs">
                                                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                                                        {row.errorMessage}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-green-400 flex items-center justify-end gap-1 text-xs">
                                                                                        <CheckCircle className="w-3.5 h-3.5" /> Ready
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {rightParsedData.length > 10 && (
                                                            <div className="p-3 text-center text-xs text-gray-500 border-t border-gray-800 bg-gray-800/10">
                                                                ... and {rightParsedData.length - 10} more rows
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Results */}
                        {importResult?.active && (
                            <div className="space-y-4">
                                <div className={`p-4 rounded-xl flex items-start gap-4 ${importResult.notFoundCount > 0
                                    ? 'bg-orange-900/20 border border-orange-500/30'
                                    : 'bg-green-900/20 border border-green-500/30'
                                    }`}>
                                    {importResult.notFoundCount > 0 ? (
                                        <AlertTriangle className="w-6 h-6 text-orange-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
                                    )}
                                    <div>
                                        <h4 className={`text-lg font-bold mb-1 ${importResult.notFoundCount > 0 ? 'text-orange-400' : 'text-green-400'
                                            }`}>
                                            {importResult.notFoundCount > 0 ? 'Import Partially Successful' : 'Import Complete'}
                                        </h4>
                                        <p className="text-gray-300">
                                            Successfully assigned <span className="font-bold text-white">{importResult.totalAssigned}</span> students to seats.
                                        </p>

                                        {importResult.autoCreatedCount > 0 && (
                                            <p className="text-sm text-blue-300 mt-1">
                                                <span className="font-bold text-white">{importResult.autoCreatedCount}</span> new students were auto-registered from the Excel file.
                                            </p>
                                        )}

                                        {importResult.notFoundCount > 0 && (
                                            <div className="mt-4">
                                                <p className="text-sm text-orange-300 font-medium mb-2">
                                                    {importResult.notFoundCount} Register Numbers were not found in the system:
                                                </p>
                                                <div className="bg-black/20 rounded-lg p-3 max-h-32 overflow-y-auto border border-orange-500/20">
                                                    <div className="flex flex-wrap gap-2">
                                                        {importResult.notFound.map((reg, idx) => (
                                                            <span key={idx} className="px-2 py-1 bg-orange-500/10 text-orange-300 text-xs font-mono rounded border border-orange-500/20">
                                                                {reg}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-800 bg-[#141517] flex justify-between items-center gap-3 shrink-0">
                        <div className="text-sm text-gray-400">
                            {leftValidCount > 0 && <span>Left: {leftValidCount} ✓</span>}
                            {leftValidCount > 0 && rightValidCount > 0 && <span className="mx-2">·</span>}
                            {rightValidCount > 0 && <span>Right: {rightValidCount} ✓</span>}
                        </div>
                        <div className="flex justify-end gap-3">
                            {importResult?.active ? (
                                <Button onPress={onClose} className="bg-gray-800 text-white hover:bg-gray-700">
                                    Close
                                </Button>
                            ) : (
                                <>
                                    <Button variant="light" onPress={onClose} className="text-gray-400">
                                        Cancel
                                    </Button>
                                    <Button
                                        onPress={handleImport}
                                        isLoading={isImporting || isParsing}
                                        isDisabled={leftValidCount === 0 && rightValidCount === 0}
                                        className={`bg-indigo-600 text-white font-medium ${(leftValidCount === 0 && rightValidCount === 0) ? 'opacity-50' : 'hover:bg-indigo-500'}`}
                                    >
                                        Confirm & Import Seating
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SeatingBatchImportModal;
