import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Select, SelectItem } from '@heroui/react';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { ExamService } from '../../services/examService';

interface BranchOption {
    examId: number;
    departmentId: number;
    departmentCode: string;
    departmentName: string;
}

interface EligibleStudentsImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    examName: string;
    branches: BranchOption[];
    onSuccess: () => void;
}

const EligibleStudentsImportModal: React.FC<EligibleStudentsImportModalProps> = ({
    isOpen,
    onClose,
    examName,
    branches,
    onSuccess
}) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{
        createdStudents: number;
        registrationsCreated: number;
        registrationsSkipped: number;
        errorCount: number;
        errors: Array<{ row: number; reason: string }>;
    } | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setFile(null);
            setSelectedExamId('');
            setIsUploading(false);
            setResult(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } else if (!selectedExamId && branches.length > 0) {
            setSelectedExamId(String(branches[0].examId));
        }
    }, [isOpen, branches, selectedExamId]);

    const selectedBranch = useMemo(
        () => branches.find(branch => String(branch.examId) === selectedExamId) || branches[0] || null,
        [branches, selectedExamId]
    );

    const handleUpload = async () => {
        if (!file || !selectedBranch) {
            toast.error('Select a branch and file first');
            return;
        }

        setIsUploading(true);
        try {
            const response = await ExamService.importEligibleStudents(selectedBranch.examId, file);
            setResult(response);
            toast.success('Eligible students imported');
            onSuccess();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to import eligible students');
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                            Import Eligible Students
                        </h2>
                        <p className="text-gray-500 text-sm mt-1">{examName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 space-y-5 overflow-y-auto">
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-900">
                        Upload a file containing full student details. Only branches for this exam are available here.
                    </div>

                    <Select
                        label="Branch"
                        placeholder="Select branch"
                        selectedKeys={selectedBranch ? [String(selectedBranch.examId)] : []}
                        onChange={(e) => setSelectedExamId(e.target.value)}
                        className="mt-2"
                    >
                        {branches.map(branch => (
                            <SelectItem key={branch.examId} textValue={`${branch.departmentCode} - ${branch.departmentName}`}>
                                {branch.departmentCode} - {branch.departmentName}
                            </SelectItem>
                        ))}
                    </Select>

                    <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={(e) => {
                                const nextFile = e.target.files?.[0] || null;
                                setFile(nextFile);
                            }}
                        />
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-gray-100 text-gray-500">
                            <Upload className="w-7 h-7" />
                        </div>
                        <h3 className="text-gray-900 font-semibold">
                            {file ? file.name : 'Click to upload student file'}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                            Expected columns: Name, Register Number, Email, Program, Semester, Batch, Department
                        </p>
                    </div>

                    {result && (
                        <div className={`p-4 rounded-xl border ${result.errorCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex items-start gap-3">
                                {result.errorCount > 0 ? (
                                    <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                                ) : (
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                )}
                                <div className="text-sm space-y-1">
                                    <p className="font-semibold text-slate-900">Import finished</p>
                                    <p>Created students: {result.createdStudents}</p>
                                    <p>Registrations created: {result.registrationsCreated}</p>
                                    <p>Registrations skipped: {result.registrationsSkipped}</p>
                                    <p>Errors: {result.errorCount}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <Button variant="flat" onPress={onClose}>
                        Close
                    </Button>
                    <Button color="primary" onPress={handleUpload} isLoading={isUploading} isDisabled={!file || !selectedBranch}>
                        Import Eligible Students
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EligibleStudentsImportModal;
