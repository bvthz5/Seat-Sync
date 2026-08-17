import React, { useState, useRef } from 'react';
import {
    Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    useDisclosure, Chip, Table, TableHeader, TableColumn, TableBody,
    TableRow, TableCell, Progress, Tooltip
} from '@heroui/react';
import {
    UploadCloud, FileText, CheckCircle, AlertTriangle, AlertCircle,
    XCircle, Trash2, Loader2, CheckCircle2, Info
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { internalStructureService } from '../../services/internalStructureService';
import { toast } from '../../../../utils/toast';

interface ReconciledItem {
    rawIndex?: number;
    rawRoomCode: string;
    roomCode: string;
    normalizedRoomKey: string;
    blockName: string;
    floorNumber: number;
    roomType: string;
    seatMode: string;
    seatsPerBench: number;
    sourceCapacity: number | null;
    calculatedCapacity: number;
    generatedCapacity?: number;
    rowLayout: number[];
    rowDetails: { label: string; benches: number }[];
    totalBenches: number;
    status: 'VALID' | 'CAPACITY_MISMATCH' | 'MISSING_SOURCE_CAPACITY' | 'INVALID_SOURCE_ROW';
    message: string;
    isUsable: boolean;
}

interface ReconciliationSummary {
    totalRows: number;
    validCount: number;
    mismatchCount: number;
    missingCapacityCount: number;
    invalidRowCount: number;
    items: ReconciledItem[];
}

export const InternalStructureImport: React.FC<{ onChange?: () => void }> = ({ onChange }) => {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [file, setFile] = useState<File | null>(null);
    const [rawImportData, setRawImportData] = useState<any[]>([]);
    const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStats, setImportStats] = useState({ blocks: 0, floors: 0, rooms: 0, updated: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) handleFile(selectedFile);
    };

    const handleFile = (file: File) => {
        const isCsv = file.type === "text/csv" || file.name.endsWith('.csv');
        const isExcel = file.name.endsWith('.xlsx') || file.type.includes("spreadsheetml") || file.name.endsWith('.xls');
        if (!isCsv && !isExcel) {
            toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
            return;
        }
        setFile(file);
        if (isCsv) parseCsvFile(file); else parseExcelFile(file);
    };

    const runReconciliation = async (extractedRows: any[]) => {
        setIsValidating(true);
        try {
            setRawImportData(extractedRows);
            const res = await internalStructureService.previewStructure(extractedRows);
            setSummary(res);
        } catch (err: any) {
            toast.error("Reconciliation failed: " + (err.response?.data?.message || err.message));
            setSummary(null);
        } finally {
            setIsValidating(false);
        }
    };

    const parseExcelFile = async (file: File) => {
        setIsValidating(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellNF: true, cellText: false });

            // Priority: If Sheet2 exists with data, or Sheet1, read all sheets or preferred sheet
            let sheetToUse = wb.SheetNames[0];
            if (wb.SheetNames.includes('Sheet2')) {
                sheetToUse = 'Sheet2';
            }

            const ws = wb.Sheets[sheetToUse];
            // Read as 2D array with header: 1 to preserve multi-tier or headerless row layouts
            const raw2D = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: "" });

            // If header: 1 was empty or invalid, fallback to sheet_to_json default
            const rawData = raw2D.length > 0 ? raw2D : XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

            await runReconciliation(rawData);
        } catch (err: any) {
            toast.error("Failed to parse Excel: " + err.message);
            setIsValidating(false);
        }
    };

    const parseCsvFile = (file: File) => {
        setIsValidating(true);
        Papa.parse<any>(file, {
            header: false,
            skipEmptyLines: true,
            complete: async (results) => {
                await runReconciliation(results.data);
            },
            error: (err: any) => {
                toast.error("Failed to parse CSV: " + err.message);
                setIsValidating(false);
            }
        });
    };

    const handleUpload = async (onClose: () => void) => {
        if (!file || !summary || rawImportData.length === 0) return;
        setLoading(true);
        setProgress(10);
        setImportStats({ blocks: 0, floors: 0, rooms: 0, updated: 0 });

        try {
            const res = await internalStructureService.importStructure(rawImportData);
            setImportStats({
                blocks: res.blocksCreated,
                floors: res.floorsCreated,
                rooms: res.roomsCreated,
                updated: res.roomsUpdated
            });
            setProgress(100);

            const msg = `Import complete! Created ${res.blocksCreated} Blocks, ${res.floorsCreated} Floors, ${res.roomsCreated} Rooms (${res.roomsUpdated} Updated).`;
            toast.success(msg);

            if (onChange) onChange();
            setTimeout(onClose, 1200);
            setFile(null);
            setRawImportData([]);
            setSummary(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Import failed");
        } finally {
            setLoading(false);
        }
    };

    const resetState = () => {
        setFile(null);
        setRawImportData([]);
        setSummary(null);
        setProgress(0);
    };

    return (
        <>
            <Button
                onPress={onOpen}
                variant="flat"
                color="secondary"
                startContent={<UploadCloud size={18} />}
                className="font-bold border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 h-10 shadow-sm"
            >
                Import Data
            </Button>

            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                size="5xl"
                backdrop="blur"
                scrollBehavior="inside"
                classNames={{ base: 'rounded-[32px]' }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-2 px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-xl shadow-violet-200">
                                        <UploadCloud size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
                                            Import Infrastructure
                                        </h2>
                                        <p className="text-sm text-slate-500 font-medium tracking-tight">
                                            Dynamic Row Layout & Multi-Tier Capacity Reconciliation Engine
                                        </p>
                                    </div>
                                </div>
                            </ModalHeader>

                            <ModalBody className="px-8 py-6 gap-6">
                                {!file ? (
                                    <div
                                        className="border-2 border-dashed border-violet-200 bg-violet-50/20 rounded-[32px] p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/50 transition-all duration-300 group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-20 h-20 bg-white shadow-xl shadow-violet-100 rounded-full flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ring-8 ring-violet-50">
                                            <UploadCloud size={32} className="text-violet-600" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900">Select Classrooms Workbook / CSV</h3>
                                        <p className="text-slate-500 mt-2 text-sm font-medium">
                                            Supports Class rooms.xlsx with dynamic rows A-F and Dual capacity calculations
                                        </p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".csv, .xlsx, .xls"
                                            onChange={handleFileSelect}
                                        />
                                        <Button
                                            size="lg"
                                            variant="solid"
                                            className="mt-8 font-bold bg-violet-600 text-white px-8 shadow-lg shadow-violet-200"
                                            onPress={() => fileInputRef.current?.click()}
                                        >
                                            Browse Files
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* File Metadata Header */}
                                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                                                    <FileText size={20} className="text-violet-600" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm tracking-tight">{file.name}</p>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                        {(file.size / 1024).toFixed(1)} KB • {summary?.totalRows || 0} Total Records Detected
                                                    </p>
                                                </div>
                                            </div>
                                            {!loading && (
                                                <Button isIconOnly size="sm" color="danger" variant="light" onPress={resetState}>
                                                    <Trash2 size={16} />
                                                </Button>
                                            )}
                                        </div>

                                        {isValidating && (
                                            <div className="p-8 text-center space-y-3">
                                                <Loader2 className="w-8 h-8 text-violet-600 animate-spin mx-auto" />
                                                <p className="text-sm font-bold text-slate-700">Reconciling row layouts and calculating physical seating...</p>
                                            </div>
                                        )}

                                        {/* Progress Bar while importing */}
                                        {loading && (
                                            <div className="space-y-4 py-2">
                                                <div className="flex justify-between items-end mb-1">
                                                    <div>
                                                        <h4 className="text-base font-black text-slate-900">Importing Infrastructure...</h4>
                                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                            Creating blocks, floors, rooms, and generating seats
                                                        </p>
                                                    </div>
                                                    <span className="text-xl font-black text-violet-600">{progress}%</span>
                                                </div>
                                                <Progress
                                                    value={progress}
                                                    color="secondary"
                                                    className="h-2 rounded-full"
                                                    classNames={{ indicator: "bg-gradient-to-r from-violet-600 to-indigo-600" }}
                                                />
                                            </div>
                                        )}

                                        {/* Reconciliation Summary Cards */}
                                        {summary && !loading && !isValidating && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-4 gap-3">
                                                    <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-2xl">
                                                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px] uppercase tracking-wider mb-1">
                                                            <CheckCircle size={14} /> Valid Matches
                                                        </div>
                                                        <p className="text-2xl font-black text-emerald-950">{summary.validCount}</p>
                                                    </div>
                                                    <div className="bg-amber-50/70 border border-amber-100 p-3.5 rounded-2xl">
                                                        <div className="flex items-center gap-1.5 text-amber-700 font-bold text-[11px] uppercase tracking-wider mb-1">
                                                            <AlertTriangle size={14} /> Capacity Mismatches
                                                        </div>
                                                        <p className="text-2xl font-black text-amber-950">{summary.mismatchCount}</p>
                                                    </div>
                                                    <div className="bg-sky-50/70 border border-sky-100 p-3.5 rounded-2xl">
                                                        <div className="flex items-center gap-1.5 text-sky-700 font-bold text-[11px] uppercase tracking-wider mb-1">
                                                            <Info size={14} /> Missing Declared
                                                        </div>
                                                        <p className="text-2xl font-black text-sky-950">{summary.missingCapacityCount}</p>
                                                    </div>
                                                    <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                                                        <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px] uppercase tracking-wider mb-1">
                                                            <XCircle size={14} /> Invalid Rows
                                                        </div>
                                                        <p className="text-2xl font-black text-slate-800">{summary.invalidRowCount}</p>
                                                    </div>
                                                </div>

                                                {/* Preview Table */}
                                                <div className="max-h-[340px] overflow-auto rounded-2xl border border-slate-100 shadow-sm bg-white">
                                                    <Table
                                                        aria-label="Reconciliation Preview Table"
                                                        removeWrapper
                                                        isHeaderSticky
                                                        classNames={{
                                                            th: "bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest py-3",
                                                            td: "text-slate-700 text-xs py-3 border-b border-slate-50 font-medium"
                                                        }}
                                                    >
                                                        <TableHeader>
                                                            <TableColumn>Room Code</TableColumn>
                                                            <TableColumn>Block / Floor</TableColumn>
                                                            <TableColumn>Row Layout</TableColumn>
                                                            <TableColumn>Declared Cap</TableColumn>
                                                            <TableColumn>Calculated Cap</TableColumn>
                                                            <TableColumn>Reconciliation Status</TableColumn>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {summary.items.map((row, i) => (
                                                                <TableRow key={i} className={row.status === 'INVALID_SOURCE_ROW' ? 'bg-red-50/40' : ''}>
                                                                    <TableCell className="font-black text-slate-900">
                                                                        {row.roomCode || (
                                                                            <span className="text-red-500 italic text-[11px]">[No Room Name]</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {row.isUsable ? (
                                                                            <span className="text-slate-600 font-semibold">{row.blockName} / FL{row.floorNumber}</span>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic text-[11px]">—</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {row.rowDetails && row.rowDetails.length > 0 ? (
                                                                                row.rowDetails.filter(rd => rd.benches > 0).map((rd, idx) => (
                                                                                    <span
                                                                                        key={idx}
                                                                                        className="px-1.5 py-0.5 bg-violet-50 border border-violet-100 text-violet-700 font-bold rounded text-[10px]"
                                                                                    >
                                                                                        {rd.label}:{rd.benches}
                                                                                    </span>
                                                                                ))
                                                                            ) : (
                                                                                <span className="text-slate-400 text-[11px] italic">No active rows</span>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {row.sourceCapacity !== null ? (
                                                                            <span className="font-bold text-slate-700">{row.sourceCapacity}</span>
                                                                        ) : (
                                                                            <span className="text-slate-400 italic text-[11px]">Blank</span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className="font-black text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                                                                            {row.calculatedCapacity} Seats
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Tooltip content={row.message} delay={0} closeDelay={0}>
                                                                            {row.status === 'VALID' ? (
                                                                                <Chip size="sm" variant="flat" color="success" className="font-black text-[10px] tracking-wider">
                                                                                    VALID
                                                                                </Chip>
                                                                            ) : row.status === 'CAPACITY_MISMATCH' ? (
                                                                                <Chip size="sm" variant="flat" color="warning" className="font-black text-[10px] tracking-wider cursor-help">
                                                                                    MISMATCH
                                                                                </Chip>
                                                                            ) : row.status === 'MISSING_SOURCE_CAPACITY' ? (
                                                                                <Chip size="sm" variant="flat" color="primary" className="font-black text-[10px] tracking-wider cursor-help">
                                                                                    MISSING CAP
                                                                                </Chip>
                                                                            ) : (
                                                                                <Chip size="sm" variant="flat" color="danger" className="font-black text-[10px] tracking-wider cursor-help">
                                                                                    INVALID ROW
                                                                                </Chip>
                                                                            )}
                                                                        </Tooltip>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </ModalBody>

                            <ModalFooter className="px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                                <Button variant="flat" size="md" className="font-bold px-6" onPress={onClose} isDisabled={loading}>
                                    Cancel
                                </Button>
                                <Button
                                    isDisabled={!file || !summary || summary.validCount + summary.mismatchCount + summary.missingCapacityCount === 0 || loading || isValidating}
                                    onPress={() => handleUpload(onClose)}
                                    size="md"
                                    className="font-black bg-violet-600 text-white px-8 shadow-xl shadow-violet-200"
                                    startContent={loading ? <Loader2 className="animate-spin" size={18} /> : null}
                                >
                                    {loading ? 'Importing Infrastructure...' : 'Run Infrastructure Engine'}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};
