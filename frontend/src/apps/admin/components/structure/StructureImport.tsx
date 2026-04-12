import React, { useState, useRef } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Checkbox, Input } from '@heroui/react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, XCircle, ArrowRight, Download, ServerCrash, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { structureService } from '../../services/structureService';
import { toast } from 'react-hot-toast';
import { Spinner } from '../../../../components/GlobalLoader';

interface CSVData {
    BlockName: string;
    FloorNumber: string;
    RoomCode: string;
    Capacity: string;
    IsExamUsable: string;
}

export const StructureImport: React.FC<{ onChange?: () => void }> = ({ onChange }) => {
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<CSVData[]>([]);
    const [errors, setErrors] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [autoZone, setAutoZone] = useState(false);
    const [zoneCount, setZoneCount] = useState<number>(2);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFile(selectedFile);
        }
    };

    const handleFile = (file: File) => {
        const isCsv = file.type === "text/csv" || file.name.endsWith('.csv');
        const isExcel = file.name.endsWith('.xlsx') || file.type.includes("spreadsheetml");
        if (!isCsv && !isExcel) {
            toast.error("Please upload a CSV or Excel (.xlsx) file");
            return;
        }
        setFile(file);
        if (isCsv) {
            parseFile(file);
        } else if (isExcel) {
            parseExcel(file);
        }
    };

const processRawData = (data: any[]): CSVData[] => {
        if (!data || data.length === 0) return [];
        const firstRow = data[0];
        const headers = Object.keys(firstRow);

        let roomCol = headers.find(h => h.toLowerCase().includes('room') || h.toLowerCase() === 'code');
        let capCol = headers.find(h => h.toLowerCase().includes('capacit') || h.toLowerCase() === 'seats' || h.toLowerCase() === 'cap');
        let blockCol = headers.find(h => h.toLowerCase().includes('block') || h.toLowerCase() === 'building');
        let floorCol = headers.find(h => h.toLowerCase().includes('floor') || h.toLowerCase() === 'level');

        return data.map(row => {
            let roomVal = roomCol ? row[roomCol] : (row['RoomCode'] || row['RoomName'] || row['Code']);
            let capVal = capCol ? row[capCol] : (row['Capacity'] || row['Cap']);
            let blockVal = blockCol ? row[blockCol] : (row['BlockName'] || row['Block']);
            let floorVal = floorCol ? row[floorCol] : (row['FloorNumber'] || row['Floor']);

            // Best effort extraction from RoomName (e.g. "A 101" -> Block A, Floor 1)
            if (!blockVal && roomVal && typeof roomVal === 'string') {
                const parts = roomVal.match(/([a-zA-Z]+)/);
                if (parts && parts[1]) blockVal = parts[1].toUpperCase();
            }
            if (!floorVal && roomVal && typeof roomVal === 'string') {
                const nums = roomVal.match(/(\d+)/);
                if (nums && nums[1]) floorVal = Math.floor(parseInt(nums[1]) / 100).toString();
            }

            if (!roomVal && !capVal) return null;

            let finalBlock = blockVal ? String(blockVal).trim().toUpperCase() : 'MAIN';
            let finalRoom = roomVal ? String(roomVal).trim() : 'UNKNOWN';

            // Clean up block name if it contains the room number (e.g., 'MTB 105' -> 'MTB')
            const roomNumsMatch = finalRoom.match(/(\d+)/);
            if (roomNumsMatch && roomNumsMatch[1]) {
                const numStr = roomNumsMatch[1];
                if (finalBlock.includes(numStr)) {
                    finalBlock = finalBlock.replace(numStr, '').replace(/[^A-Z0-9]/g, '').trim();
                }
            }
            if(!finalBlock) finalBlock = 'MAIN';

            // Format to "BLOCK - NUMBER" consistently 
            if (finalRoom !== 'UNKNOWN') {
                if (roomNumsMatch && roomNumsMatch[1]) {
                    finalRoom = `${finalBlock} - ${roomNumsMatch[1]}`;
                }
            }

            return {
                BlockName: finalBlock,
                FloorNumber: floorVal ? String(floorVal).trim().replace(/^0+/, '') || '0' : '0',
                RoomCode: finalRoom,
                Capacity: capVal ? String(capVal).trim() : '0',
                IsExamUsable: 'True' // Default true for import
            };
        }).filter(Boolean) as CSVData[];
    };

    const parseExcel = async (file: File) => {
        setIsValidating(true);
        setErrors([]);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            // defval null prevents stripping empty columns safely 
            const data = XLSX.utils.sheet_to_json<any>(ws, { defval: null });
            const processed = processRawData(data);
            setPreviewData(processed);
            validateData(processed);
        } catch (err: any) {
            toast.error("Failed to parse Excel: " + err.message);
        } finally {
            setIsValidating(false);
        }
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

        if (data.length === 0) {
            newErrors.push("File is empty or failed to read.");
            setErrors(newErrors);
            return;
        }

        // Row validation using loosely mapped data
        data.forEach((row, index) => {
            const rowNum = index + 2;
            if (!row.RoomCode || row.RoomCode === 'UNKNOWN') newErrors.push(`Row ${rowNum}: Missing Room/RoomCode`);
            if (!row.Capacity || isNaN(Number(row.Capacity))) newErrors.push(`Row ${rowNum}: Invalid/Missing Capacity`);
        });

        if (newErrors.length > 10) {
            const displayed = newErrors.slice(0, 10);
            displayed.push(`... and ${newErrors.length - 10} more errors`);
            setErrors(displayed);
        } else {
            setErrors(newErrors);
        }
    };

    const handleUpload = async (onClose: () => void) => {
        if (!file || errors.length > 0) return;

        setLoading(true);
        try {
            const result = await structureService.importStructure(file, { autoZone, zoneCount });
            let msg = `Import successful! Added ${result.blocksCreated} Blocks, ${result.floorsCreated} Floors, ${result.roomsCreated} Rooms.`;
            if (result.roomsUpdated) msg += ` Updated ${result.roomsUpdated} Rooms.`;
            toast.success(msg);
            if (onChange) onChange();
            onClose();
            setFile(null);
            setPreviewData([]);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Import failed");
        } finally {
            setLoading(false);
        }
    };

    const getSampleCSV = () => {
        const csvContent = "RoomName,Capacity,A,B,C\nMTB 301,60,10,10,10\nMTB 302,40,6,7,7\nAdmin 101,20,5,5,0";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "structure_template.csv";
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <>
            <Button
                onPress={onOpen}
                variant="flat"
                color="primary"
                startContent={<UploadCloud size={20} />}
                className="font-bold border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            >
                Import Data
            </Button>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl" backdrop="blur" scrollBehavior="inside">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-2 px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                        <UploadCloud size={24} className="text-blue-500" />
                                    </div>
                                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">Import College Structure</h2>
                                </div>
                                <p className="text-sm text-slate-500 font-medium ml-13">Bulk upload Blocks, Floors, and Rooms using a single CSV or XLSX file.</p>
                            </ModalHeader>
                            <ModalBody className="px-8 py-8 gap-6">
                                {/* Upload Area */}
                                {!file ? (
                                    <div
                                        className="relative group border-2 border-dashed border-blue-200 bg-gradient-to-b from-blue-50/50 to-white rounded-3xl p-16 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:from-blue-50 hover:to-blue-50/20 transition-all duration-500 overflow-hidden"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="absolute inset-0 bg-blue-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        <div className="w-24 h-24 bg-white shadow-sm ring-1 ring-slate-900/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-xl transition-all duration-500 ease-out">
                                            <UploadCloud size={40} className="text-blue-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-800 tracking-tight">Drop your spreadsheet here</h3>
                                        <p className="text-slate-500 max-w-sm mt-3 text-base leading-relaxed font-medium">
                                            Upload your College Structure in <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">.csv</span> or <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">.xlsx</span> format.
                                        </p>
                                        <label htmlFor="file-upload" className="sr-only">Upload spreadsheet</label>
                                        <input id="file-upload" name="file-upload" type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".csv, .xlsx"
                                            onChange={handleFileSelect}
                                        />
                                        <Button 
                                            size="sm" 
                                            variant="flat" 
                                            className="mt-10 font-bold bg-white shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-700 z-10 rounded-xl" 
                                            onClick={(e) => { e.stopPropagation(); getSampleCSV(); }} 
                                            startContent={<Download size={16} className="text-blue-500" />}
                                        >
                                            Download Template
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />
                                            <div className="flex items-center gap-4 pl-3">
                                                <div className="w-12 h-12 bg-blue-50/80 text-blue-600 rounded-xl flex items-center justify-center ring-1 ring-blue-100">
                                                    <FileText size={24} />      
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="font-bold text-slate-800 text-[15px]">{file.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                                                            {(file.size / 1024).toFixed(1)} KB
                                                        </span>
                                                        <span className="text-xs font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">
                                                            {previewData.length} records
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button isIconOnly size="sm" color="danger" variant="light" className="hover:bg-red-50/50 mr-1" onPress={() => { setFile(null); setPreviewData([]); setErrors([]); }}>
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>

                                        {/* Validation Status */}
                                        {errors.length > 0 ? (
                                            <div className="bg-red-50/80 border border-red-200/80 rounded-2xl p-5 shadow-sm">
                                                <div className="flex items-center gap-3 text-red-700 font-bold mb-3 text-base">
                                                    <ServerCrash size={20} className="text-red-500" /> 
                                                    Validation Failed ({errors.length})
                                                </div>
                                                <ul className="list-disc list-inside text-sm text-red-600/90 space-y-1.5 font-medium ml-1">
                                                    {errors.map((err, i) => <li key={i}>{err}</li>)}
                                                </ul>
                                            </div>
                                        ) : isValidating ? (
                                            <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-2xl border border-slate-100">
                                                <Spinner size={40} />
                                                <p className="mt-4 text-sm font-semibold text-slate-500 animate-pulse">Analyzing spreadsheet structure...</p>
                                            </div>
                                        ) : (
                                            <div className="bg-gradient-to-r from-emerald-50/80 to-emerald-50/30 border border-emerald-200/80 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-base">
                                                        <CheckCircle size={20} className="text-emerald-600" />
                                                        Ready for Import
                                                    </div>
                                                    <p className="text-sm text-emerald-600/80 font-medium ml-7 mt-0.5">Structure mapped successfully.</p>
                                                </div>
                                                
                                                {/* Auto-Zone Controls */}
                                                <div className="flex items-center gap-4 border-l border-green-200 pl-4">
                                                    <Checkbox isSelected={autoZone} onValueChange={setAutoZone} color="primary" className="text-sm font-semibold">
                                                        Auto-Zone Rooms
                                                    </Checkbox>
                                                    {autoZone && (
                                                        <Input
                                                            type="number"
                                                            size="sm"
                                                            value={zoneCount.toString()}
                                                            onValueChange={(val) => setZoneCount(Number(val) || 2)}
                                                            className="w-24"
                                                            min={1}
                                                            max={10}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Preview Table */}
                                        <div className="max-h-[300px] overflow-y-auto rounded-xl border border-slate-200 shadow-sm relative custom-scrollbar">
                                            <Table
                                                aria-label="Preview"
                                                removeWrapper
                                                isHeaderSticky
                                                classNames={{ th: "bg-slate-50 text-slate-600 font-bold", td: "text-slate-700 font-medium" }}
                                            >
                                                <TableHeader>
                                                    <TableColumn>BLOCK</TableColumn>
                                                    <TableColumn>FLOOR</TableColumn>
                                                    <TableColumn>CODE</TableColumn>
                                                    <TableColumn>CAP</TableColumn>
                                                    <TableColumn>EXAM</TableColumn>
                                                </TableHeader>
                                                <TableBody loadingContent={<div className="flex justify-center py-4"><Spinner size={40} /></div>}>
                                                    {previewData.slice(0, 100).map((row, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{row.BlockName}</TableCell>
                                                            <TableCell>{row.FloorNumber}</TableCell>
                                                            <TableCell>{row.RoomCode}</TableCell>
                                                            <TableCell>{row.Capacity}</TableCell>
                                                            <TableCell>
                                                                <Chip size="sm" color={row.IsExamUsable?.toLowerCase() === 'true' ? "success" : "default"} variant="flat">
                                                                    {row.IsExamUsable}
                                                                </Chip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            {previewData.length > 100 && (
                                                <div className="p-2 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                                                    Showing first 100 rows only
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter className="px-8 py-6 border-t border-slate-100 bg-slate-50/50">
                                <Button 
                                    variant="flat" 
                                    onPress={onClose} 
                                    className="font-semibold bg-slate-200/50 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    isDisabled={!file || errors.length > 0 || loading}
                                    isLoading={loading}
                                    onPress={() => handleUpload(onClose)}       
                                    className={!file || errors.length > 0 ? "font-bold bg-slate-200/50 text-slate-400" : "font-bold shadow-lg shadow-emerald-500/30 bg-emerald-500 hover:bg-emerald-600 text-white transition-all"}
                                >
                                    Confirm Import
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </>
    );
};





