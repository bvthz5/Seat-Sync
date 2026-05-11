import React, { useState, useRef } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Progress } from '@heroui/react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, XCircle, Download, ServerCrash, Trash2, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { internalStructureService } from '../../services/internalStructureService';
import { toast } from '../../../../utils/toast';

interface CSVData {
    BlockName: string;
    FloorNumber: string;
    RoomCode: string;
    Capacity: string;
}

export const InternalStructureImport: React.FC<{ onChange?: () => void }> = ({ onChange }) => {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<CSVData[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStats, setImportStats] = useState({ blocks: 0, floors: 0, rooms: 0 });
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
        if (isCsv) parseFile(file); else parseExcel(file);
    };

    const processRawData = (data: any[]): any[] => {
        if (!data || data.length === 0) return [];
        const headers = Object.keys(data[0]);
        let roomCol = headers.find(h => h.toLowerCase().includes('room') || h.toLowerCase() === 'code');
        let capCol = headers.find(h => h.toLowerCase().includes('capacit') || h.toLowerCase() === 'seats' || h.toLowerCase() === 'cap');
        let floorCol = headers.find(h => h.toLowerCase().includes('floor') || h.toLowerCase() === 'level');

        return data.map(row => {
            let roomVal = roomCol ? row[roomCol] : (row['RoomCode'] || row['Code']);
            let capVal = capCol ? row[capCol] : (row['Capacity'] || row['Cap']);
            let floorVal = floorCol ? row[floorCol] : (row['FloorNumber'] || row['Floor']);

            if (!roomVal) return null;

            // Build result with required fields
            const result: any = {
                BlockName: '', // Backend deduces from RoomCode
                FloorNumber: floorVal ? String(floorVal).trim() : '',
                RoomCode: String(roomVal).trim(),
                Capacity: capVal ? String(capVal).trim() : '0'
            };

            // Preserve all other columns (A, B, C, D, E, F for bench counts)
            for (const header of headers) {
                if (!['BlockName', 'FloorNumber', 'RoomCode', 'Capacity', 'room', 'code', 'capacity', 'cap', 'floor', 'level'].some(h => header.toLowerCase() === h)) {
                    result[header] = row[header] !== undefined ? String(row[header]).trim() : '';
                }
            }

            return result;
        }).filter(Boolean);
    };

    const parseExcel = async (file: File) => {
        setIsValidating(true);
        setErrors([]);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true, cellNF: true, cellText: false });
            const ws = wb.Sheets[wb.SheetNames[0]];
            // sheet_to_json handles merged cells by default (value is in the top-left cell)
            const data = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
            const processed = processRawData(data);
            setPreviewData(processed);
            validateData(processed);
        } catch (err: any) { toast.error("Failed to parse Excel: " + err.message); }
        finally { setIsValidating(false); }
    };

    const parseFile = (file: File) => {
        setIsValidating(true);
        setErrors([]);
        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const processed = processRawData(results.data);
                setPreviewData(processed);
                validateData(processed);
                setIsValidating(false);
            },
            error: (err: any) => {
                toast.error("Failed to parse CSV: " + err.message);
                setIsValidating(false);
            }
        });
    };

    const validateData = (data: CSVData[]) => {
        const newErrors: string[] = [];
        if (data.length === 0) newErrors.push("File is empty or failed to read.");
        data.forEach((row, index) => {
            if (!row.RoomCode) newErrors.push(`Row ${index + 2}: Missing Room Code`);
            if (isNaN(Number(row.Capacity))) newErrors.push(`Row ${index + 2}: Invalid Capacity`);
        });
        setErrors(newErrors.slice(0, 10));
    };

    const handleUpload = async (onClose: () => void) => {
        if (!file || errors.length > 0) return;
        setLoading(true);
        setProgress(5);
        setImportStats({ blocks: 0, floors: 0, rooms: 0 });

        try {
            const chunkSize = 20;
            const chunks: CSVData[][] = [];
            for (let i = 0; i < previewData.length; i += chunkSize) {
                chunks.push(previewData.slice(i, i + chunkSize));
            }

            let b = 0, f = 0, r = 0;
            for (let i = 0; i < chunks.length; i++) {
                const res = await internalStructureService.importStructure(chunks[i]);
                b += res.blocksCreated;
                f += res.floorsCreated;
                r += res.roomsCreated;
                setImportStats({ blocks: b, floors: f, rooms: r });
                setProgress(Math.round(((i + 1) / chunks.length) * 100));
            }

            toast.success(`Import complete! Created ${b} Blocks, ${f} Floors, ${r} Rooms.`);
            if (onChange) onChange();
            setTimeout(onClose, 1000);
            setFile(null);
            setPreviewData([]);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Import failed");
        } finally {
            setLoading(false);
        }
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

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl" backdrop="blur" scrollBehavior="inside" classNames={{ base: 'rounded-[32px]' }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-2 px-10 py-8 border-b border-slate-100 bg-slate-50/30">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-xl shadow-violet-200">
                                        <UploadCloud size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Import Infrastructure</h2>
                                        <p className="text-sm text-slate-500 font-medium tracking-tight italic">Automated Block, Floor, and Room Mapping Engine</p>
                                    </div>
                                </div>
                            </ModalHeader>
                            <ModalBody className="px-10 py-8 gap-8">
                                {!file ? (
                                    <div
                                        className="border-2 border-dashed border-violet-200 bg-violet-50/20 rounded-[40px] p-20 flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/50 transition-all duration-500 group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-24 h-24 bg-white shadow-xl shadow-violet-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 ring-8 ring-violet-50">
                                            <UploadCloud size={36} className="text-violet-600" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900">Select Excel or CSV</h3>
                                        <p className="text-slate-500 mt-2 text-sm font-medium">Drag & drop your college structure template here</p>
                                        <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileSelect} />
                                        <Button size="lg" variant="solid" className="mt-10 font-bold bg-violet-600 text-white px-10 shadow-lg shadow-violet-200" onPress={() => fileInputRef.current?.click()}>
                                            Browse Files
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center">
                                                    <FileText size={24} className="text-violet-600" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 tracking-tight">{file.name}</p>
                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB • {previewData.length} Records Detected</p>
                                                </div>
                                            </div>
                                            {!loading && (
                                                <Button isIconOnly size="sm" color="danger" variant="light" onPress={() => { setFile(null); setPreviewData([]); setErrors([]); }}>
                                                    <Trash2 size={18} />
                                                </Button>
                                            )}
                                        </div>

                                        {loading && (
                                            <div className="space-y-4 py-4">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-900">Importing Data...</h4>
                                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Processing {importStats.rooms} / {previewData.length} Rooms</p>
                                                    </div>
                                                    <span className="text-2xl font-black text-violet-600">{progress}%</span>
                                                </div>
                                                <Progress 
                                                    value={progress} 
                                                    color="secondary" 
                                                    className="h-3 rounded-full"
                                                    classNames={{ indicator: "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-md" }}
                                                />
                                                <div className="grid grid-cols-3 gap-4 pt-4">
                                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Blocks</p>
                                                        <p className="text-xl font-black text-slate-900">{importStats.blocks}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Floors</p>
                                                        <p className="text-xl font-black text-slate-900">{importStats.floors}</p>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rooms</p>
                                                        <p className="text-xl font-black text-slate-900">{importStats.rooms}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!loading && (
                                            <>
                                                {errors.length > 0 ? (
                                                    <div className="bg-red-50 border border-red-100 rounded-3xl p-6">
                                                        <div className="flex items-center gap-3 text-red-700 font-black mb-3">
                                                            <AlertTriangle size={22} /> VALIDATION WARNING
                                                        </div>
                                                        <ul className="text-sm text-red-600/80 font-medium space-y-1 ml-1">
                                                            {errors.map((err, i) => <li key={i}>• {err}</li>)}
                                                        </ul>
                                                    </div>
                                                ) : (
                                                    <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-center gap-5">
                                                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 shrink-0">
                                                            <CheckCircle size={24} className="text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-emerald-900 uppercase tracking-tight">Normalization Engine Verified</p>
                                                            <p className="text-sm text-emerald-600/80 font-medium">All room codes and capacities are in the correct format for automatic mapping.</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="max-h-[300px] overflow-auto rounded-[32px] border border-slate-100 shadow-sm bg-white">
                                                    <Table aria-label="Preview" removeWrapper isHeaderSticky classNames={{ th: "bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest py-4", td: "text-slate-700 text-sm py-4 border-b border-slate-50 font-medium" }}>
                                                        <TableHeader>
                                                            <TableColumn><span className="text-[10px] uppercase">Extracted Identity</span></TableColumn>
                                                            <TableColumn><span className="text-[10px] uppercase">Capacity</span></TableColumn>
                                                            <TableColumn><span className="text-[10px] uppercase">Status</span></TableColumn>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {previewData.slice(0, 100).map((row, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-black text-slate-900 text-xs">{row.RoomCode}</TableCell>
                                                                    <TableCell><span className="bg-slate-100 px-2 py-1 rounded-md text-[10px] font-black text-slate-500">{row.Capacity} Seats</span></TableCell>
                                                                    <TableCell><Chip size="sm" variant="flat" color="success" className="font-black text-[10px] tracking-widest bg-emerald-50 text-emerald-600">VALID</Chip></TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter className="px-10 py-8 border-t border-slate-100 bg-slate-50/30">
                                <Button variant="flat" size="lg" className="font-bold px-8" onPress={onClose} isDisabled={loading}>Cancel</Button>
                                <Button
                                    isDisabled={!file || errors.length > 0 || loading}
                                    onPress={() => handleUpload(onClose)}
                                    size="lg"
                                    className="font-black bg-violet-600 text-white px-10 shadow-xl shadow-violet-200"
                                    startContent={loading ? <Loader2 className="animate-spin" size={20} /> : null}
                                >
                                    {loading ? 'Processing...' : 'Run Infrastructure Engine'}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};
