
import { useState, useEffect, useRef } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Select, SelectItem } from '@heroui/react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, Plus } from 'lucide-react';
import { ExamService } from '../../services/examService';
import { SeriesService } from '../../services/seriesService';
import { toast } from 'react-hot-toast';

interface ExamImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    preSelectedSeriesId?: string;
}

const ExamImportModal = ({ isOpen, onClose, onSuccess, preSelectedSeriesId }: ExamImportModalProps) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [importing, setImporting] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [series, setSeries] = useState<any[]>([]);
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [loadingSeries, setLoadingSeries] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchSeries();
            if (preSelectedSeriesId) {
                setSelectedSeriesId(preSelectedSeriesId);
            }
        }
    }, [isOpen, preSelectedSeriesId]);

    const fetchSeries = async () => {
        setLoadingSeries(true);
        try {
            const response = await SeriesService.getAll();
            if (response.success) {
                setSeries(response.data);
                // Auto-select first series if available AND no pre-selection
                if (response.data.length > 0 && !selectedSeriesId && !preSelectedSeriesId) {
                    setSelectedSeriesId(String(response.data[0].ExamSeriesID));
                }
            }
        } catch (error) {
            console.error("Failed to fetch series:", error);
            toast.error("Failed to load exam series");
        } finally {
            setLoadingSeries(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);
        const validFiles: File[] = [];
        let hasPdf = false;
        let hasWordRtf = false;

        for (const file of files) {
            const fileName = file.name.toLowerCase();
            const accepted =
                fileName.endsWith('.xlsx') ||
                fileName.endsWith('.xls') ||
                fileName.endsWith('.csv') ||
                fileName.endsWith('.pdf') ||
                fileName.endsWith('.doc') ||
                fileName.endsWith('.docx') ||
                fileName.endsWith('.rtf');

            if (!accepted) continue;
            if (fileName.endsWith('.pdf')) hasPdf = true;
            if (fileName.endsWith('.doc') || fileName.endsWith('.docx') || fileName.endsWith('.rtf')) hasWordRtf = true;
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            toast.error('Only .xlsx, .xls, .csv, .pdf, .doc, .docx, and .rtf files are supported');
            return;
        }

        if (validFiles.length !== files.length) {
            toast.error(`${files.length - validFiles.length} unsupported file(s) were skipped`);
        }

        if (hasPdf) {
            toast('PDF import is best-effort. Please verify the result after import.', { icon: 'ℹ️' });
        }
        if (hasWordRtf) {
            toast('Word/RTF import is best-effort. Please verify the result after import.', { icon: 'ℹ️' });
        }

        setSelectedFiles(validFiles);
    };

    const handleDownloadTemplate = async () => {
        try {
            await ExamService.downloadTemplate();
            toast.success('Template downloaded successfully');
        } catch (error) {
            console.error(error);
            toast.error('Failed to download template');
        }
    };

    const handleImport = async () => {
        if (selectedFiles.length === 0) {
            toast.error('Please select at least one file');
            return;
        }

        if (!selectedSeriesId) {
            toast.error('Please select an Exam Series');
            return;
        }

        setImporting(true);
        try {
            let totalCreated = 0;
            let totalUpdated = 0;
            let totalRowErrors = 0;
            let fileFailures = 0;
            const fileFailureMessages: string[] = [];
            const rowIssueMessages: string[] = [];

            for (const file of selectedFiles) {
                try {
                    const result = await ExamService.importTimetable(
                        file,
                        parseInt(selectedSeriesId),
                        examTitle
                    );

                    totalCreated += result.successCount || 0;
                    totalUpdated += result.updatedCount || 0;
                    totalRowErrors += result.errorCount || 0;
                    if (Array.isArray(result.errors) && result.errors.length > 0) {
                        rowIssueMessages.push(`${file.name}: ${result.errors[0]}`);
                    }
                } catch (error: any) {
                    fileFailures++;
                    console.error(`Import failed for ${file.name}:`, error);
                    const serverMessage =
                        error?.response?.data?.message ||
                        error?.response?.data?.error ||
                        error?.message ||
                        'Unknown import error';
                    fileFailureMessages.push(`${file.name}: ${serverMessage}`);
                }
            }

            if (totalCreated > 0 || totalUpdated > 0) {
                toast.success(`Complete: ${totalCreated} created, ${totalUpdated} updated`);
            } else {
                toast('No changes made', { icon: 'ℹ️' });
            }
            if (totalRowErrors > 0 || fileFailures > 0) {
                toast.error(`Completed with issues: ${totalRowErrors} row errors, ${fileFailures} file failures`);
                if (fileFailureMessages.length > 0) {
                    toast.error(fileFailureMessages[0] as string);
                } else if (rowIssueMessages.length > 0) {
                    toast.error(rowIssueMessages[0] as string);
                }
            }

            setSelectedFiles([]);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            const errorMsg = error.response?.data?.message || 'Failed to import timetable';
            const errors = error.response?.data?.errors;
            if (errors && Array.isArray(errors)) {
                toast.error(`${errorMsg}: ${errors[0]}`);
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setSelectedFiles([]);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={handleClose}
            size="2xl"
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
                                <div className="p-2 bg-purple-100 rounded-full">
                                    <FileSpreadsheet className="text-purple-600" size={24} />
                                </div>
                                <span className="text-xl font-bold text-slate-900">
                                    Import Exam Timetable
                                </span>
                            </div>
                        </ModalHeader>
                        <ModalBody className="py-6">
                            <div className="space-y-6">
                                {/* Info Section */}
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <div className="flex gap-2">
                                        <CheckCircle2 className="text-purple-600 flex-shrink-0" size={20} />
                                        <div className="text-sm text-purple-800">
                                            <p className="font-semibold mb-1">Upload Timetable</p>
                                            <p>Upload timetable files (.xlsx/.xls/.csv/.pdf/.doc/.docx/.rtf). The system will automatically check for scheduling conflicts.</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Exam Series Selection */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <label className="block text-sm font-medium text-slate-700">
                                            Target Exam Series <span className="text-red-500">*</span>
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <Select
                                                id="import-series-select"
                                                name="seriesSelect"
                                                placeholder="Select an exam series"
                                                label="Target Exam Series"
                                                selectedKeys={selectedSeriesId ? [selectedSeriesId] : []}
                                                onChange={(e) => setSelectedSeriesId(e.target.value)}
                                                variant="bordered"
                                                isDisabled={loadingSeries}
                                                className="w-full"
                                            >
                                                {series.map((s) => (
                                                    <SelectItem key={String(s.ExamSeriesID)} textValue={s.SeriesName}>
                                                        {s.SeriesName} ({s.AcademicYear?.YearName || 'Unknown Year'})
                                                    </SelectItem>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        All imported exams will be grouped under this series.
                                    </p>
                                </div>

                                {/* Exam Series Title Input */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Exam Name Prefix (Optional)
                                    </label>
                                    <input id="examTitle"
                                        name="examTitle"
                                        type="text"
                                        autoComplete="off"
                                        placeholder="e.g., S1 Supplementary"
                                        value={examTitle}
                                        onChange={(e) => setExamTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-slate-400"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Used if specific exam names are missing in Excel.
                                    </p>
                                </div>

                                {/* Template Download */}
                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-slate-50">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-900">Download Template</span>
                                        <span className="text-sm text-slate-500">Recommended: use this Excel format for highest import accuracy</span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="flat"
                                        color="primary"
                                        startContent={<Download size={16} />}
                                        onPress={handleDownloadTemplate}
                                        className="font-medium text-blue-600 bg-blue-50 hover:bg-blue-100"
                                    >
                                        Download XLSX
                                    </Button>
                                </div>

                                {/* File Upload */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        name="fileUpload"
                                        accept=".xlsx,.xls,.csv,.pdf,.doc,.docx,.rtf"
                                        multiple
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="file-upload"
                                        ref={fileInputRef}
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`
                                            flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all
                                            ${selectedFiles.length > 0
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {selectedFiles.length > 0 ? (
                                                <>
                                                    <FileSpreadsheet className="w-8 h-8 text-purple-600 mb-2" />
                                                    <p className="text-sm text-purple-900 font-medium">
                                                        {selectedFiles.length} file(s) selected
                                                    </p>
                                                    <p className="text-xs text-purple-500 mt-1">
                                                        {selectedFiles.slice(0, 2).map(f => f.name).join(', ')}
                                                        {selectedFiles.length > 2 ? ` +${selectedFiles.length - 2} more` : ''}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                                    <p className="text-sm text-slate-600 font-medium">
                                                        Click to upload or drag and drop
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        .xlsx, .xls, .csv, .pdf, .doc, .docx, .rtf
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter className="border-t pt-4">
                            <Button variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button
                                color="primary"
                                isLoading={importing}
                                isDisabled={selectedFiles.length === 0}
                                onPress={handleImport}
                                className="font-bold bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                            >
                                {importing ? 'Importing...' : `Start Import${selectedFiles.length > 1 ? ` (${selectedFiles.length})` : ''}`}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default ExamImportModal;
