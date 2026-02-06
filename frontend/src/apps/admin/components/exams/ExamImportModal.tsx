
import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Select, SelectItem } from '@heroui/react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, Plus } from 'lucide-react';
import { ExamService } from '../../services/examService';
import { SeriesService } from '../../services/seriesService';
import { toast } from 'react-hot-toast';

interface ExamImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const ExamImportModal = ({ isOpen, onClose, onSuccess }: ExamImportModalProps) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [series, setSeries] = useState<any[]>([]);
    const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
    const [loadingSeries, setLoadingSeries] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSeries();
        }
    }, [isOpen]);

    const fetchSeries = async () => {
        setLoadingSeries(true);
        try {
            const response = await SeriesService.getAll();
            if (response.success) {
                setSeries(response.data);
                // Auto-select first series if available
                if (response.data.length > 0 && !selectedSeriesId) {
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
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
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
        if (!selectedFile) {
            toast.error('Please select a file first');
            return;
        }

        if (!selectedSeriesId) {
            toast.error('Please select an Exam Series');
            return;
        }

        setImporting(true);
        try {
            const result = await ExamService.importTimetable(
                selectedFile,
                parseInt(selectedSeriesId),
                examTitle
            );
            toast.success(`Processed: ${result.successCount} exams created`);
            if (result.errorCount > 0) {
                toast.error(`Failed: ${result.errorCount} errors (Check console)`);
                console.error("Import Errors:", result.errors);
            }
            setSelectedFile(null);
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
        setSelectedFile(null);
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
                                            <p>Upload your Excel timetable containing Date, Session, and Subject Codes. The system will automatically check for scheduling conflicts.</p>
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
                                                placeholder="Select an exam series"
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
                                    <input
                                        type="text"
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
                                        <span className="text-sm text-slate-500">Use this Excel format for importing</span>
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
                                        accept=".xlsx,.xls"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`
                                            flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all
                                            ${selectedFile
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            {selectedFile ? (
                                                <>
                                                    <FileSpreadsheet className="w-8 h-8 text-purple-600 mb-2" />
                                                    <p className="text-sm text-purple-900 font-medium">
                                                        {selectedFile.name}
                                                    </p>
                                                    <p className="text-xs text-purple-500 mt-1">
                                                        {(selectedFile.size / 1024).toFixed(2)} KB
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                                    <p className="text-sm text-slate-600 font-medium">
                                                        Click to upload or drag and drop
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Excel files only (.xlsx, .xls)
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
                                isDisabled={!selectedFile}
                                onPress={handleImport}
                                className="font-bold bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                            >
                                {importing ? 'Importing...' : 'Start Import'}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default ExamImportModal;
