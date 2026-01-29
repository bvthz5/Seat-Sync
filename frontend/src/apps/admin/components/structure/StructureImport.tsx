import React, { useState, useRef } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from '@heroui/react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, XCircle, ArrowRight, Download } from 'lucide-react';
import Papa from 'papaparse';
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            handleFile(selectedFile);
        }
    };

    const handleFile = (file: File) => {
        if (file.type !== "text/csv") {
            toast.error("Please upload a CSV file");
            return;
        }
        setFile(file);
        parseFile(file);
    };

    const parseFile = (file: File) => {
        setIsValidating(true);
        setErrors([]);
        Papa.parse<CSVData>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const data = results.data;
                setPreviewData(data);
                validateData(data);
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
        const requiredHeaders = ['BlockName', 'FloorNumber', 'RoomCode', 'Capacity', 'IsExamUsable'];

        if (data.length === 0) {
            newErrors.push("File is empty");
            setErrors(newErrors);
            return;
        }

        // Check headers (Papa parse ensures keys exist if header: true, but check first row for safety)
        const firstRow = data[0];
        const missing = requiredHeaders.filter(h => !(h in firstRow));
        if (missing.length > 0) {
            newErrors.push(`Missing columns: ${missing.join(', ')}`);
        }

        // Row validation
        data.forEach((row, index) => {
            const rowNum = index + 2;
            if (!row.BlockName) newErrors.push(`Row ${rowNum}: Missing BlockName`);
            if (!row.FloorNumber || isNaN(Number(row.FloorNumber))) newErrors.push(`Row ${rowNum}: Invalid FloorNumber`);
            if (!row.RoomCode) newErrors.push(`Row ${rowNum}: Missing RoomCode`);
            if (!row.Capacity || isNaN(Number(row.Capacity))) newErrors.push(`Row ${rowNum}: Invalid Capacity`);
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
            const result = await structureService.importStructure(file);
            toast.success(`Import successful! Added ${result.blocksCreated} Blocks, ${result.floorsCreated} Floors, ${result.roomsCreated} Rooms.`);
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
        const csvContent = "BlockName,FloorNumber,RoomCode,Capacity,IsExamUsable\nScience Block,1,LH-101,60,TRUE\nScience Block,1,LH-102,60,TRUE\nAdmin Block,2,Conf-A,20,FALSE";
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
                Import CSV
            </Button>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="4xl" backdrop="blur" scrollBehavior="inside">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 px-8 py-6 border-b border-slate-100">
                                <h2 className="text-2xl font-bold text-slate-800">Import College Structure</h2>
                                <p className="text-sm text-slate-500 font-normal">Bulk upload Blocks, Floors, and Rooms using a single CSV file.</p>
                            </ModalHeader>
                            <ModalBody className="px-8 py-8 gap-6">
                                {/* Upload Area */}
                                {!file ? (
                                    <div
                                        className="border-2 border-dashed border-slate-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                                            <UploadCloud size={32} className="text-blue-500" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-700">Click to upload or drag and drop</h3>
                                        <p className="text-slate-500 max-w-sm mt-2">Supports .csv files only. Max 5MB.</p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".csv"
                                            onChange={handleFileSelect}
                                        />
                                        <Button size="sm" variant="light" color="primary" className="mt-6 font-bold" onClick={(e) => { e.stopPropagation(); getSampleCSV(); }} startContent={<Download size={16} />}>
                                            Download Template
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 text-sm">{file.name}</p>
                                                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB • {previewData.length} records</p>
                                                </div>
                                            </div>
                                            <Button size="sm" color="danger" variant="light" onPress={() => { setFile(null); setPreviewData([]); setErrors([]); }}>Remove</Button>
                                        </div>

                                        {/* Validation Status */}
                                        {errors.length > 0 ? (
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                                <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                                                    <AlertTriangle size={18} />
                                                    Validation Errors ({errors.length})
                                                </div>
                                                <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                                                    {errors.map((err, i) => <li key={i}>{err}</li>)}
                                                </ul>
                                            </div>
                                        ) : isValidating ? (
                                            <div className="text-center py-4 text-slate-500">Validating...</div>
                                        ) : (
                                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-800 font-bold">
                                                <CheckCircle size={20} className="text-green-600" />
                                                Ready for Import
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
                            <ModalFooter className="px-8 py-6 border-t border-slate-100">
                                <Button variant="light" onPress={onClose} className="font-semibold text-slate-500">Cancel</Button>
                                <Button
                                    color="primary"
                                    isDisabled={!file || errors.length > 0 || loading}
                                    isLoading={loading}
                                    onPress={() => handleUpload(onClose)}
                                    className="font-bold shadow-lg shadow-blue-500/20 text-white"
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
