import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Select, SelectItem } from "@heroui/react";
import { ExamService } from '../../services/examService';
import { SubjectService } from '../../services/subjectService';
import { academicService } from '../../services/academicService';
import { toast } from 'react-hot-toast';
import { Pencil, Search } from 'lucide-react';

interface EditExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    exam: any;
}

const EditExamModal = ({ isOpen, onClose, onSuccess, exam }: EditExamModalProps) => {
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        ExamName: '',
        ExamDate: '',
        Session: '',
        Duration: '',
        SubjectID: '',
        DepartmentID: ''
    });

    useEffect(() => {
        if (isOpen && exam) {
            setFormData({
                ExamName: exam.ExamName,
                ExamDate: exam.ExamDate ? exam.ExamDate.split('T')[0] : '',
                Session: exam.Session,
                Duration: String(exam.Duration),
                SubjectID: exam.SubjectID ? String(exam.SubjectID) : '',
                DepartmentID: String(exam?.Subject?.Department?.DepartmentID || '')
            });
            if (exam.Subject) {
                setSubjectSearch(`${exam.Subject.SubjectCode} - ${exam.Subject.SubjectName}`);
            } else {
                setSubjectSearch('');
            }
        }
    }, [isOpen, exam]);

    // Resolve SubjectID and DepartmentID for internal exams once subjects and departments are loaded
    useEffect(() => {
        if (isOpen && exam && subjects.length > 0 && !formData.SubjectID) {
            const matchedSubject = subjects.find(s => s.SubjectCode === exam.Subject?.SubjectCode);
            if (matchedSubject) {
                setFormData(prev => ({
                    ...prev,
                    SubjectID: String(matchedSubject.SubjectID)
                }));
            }
        }
    }, [isOpen, exam, subjects, formData.SubjectID]);

    useEffect(() => {
        if (isOpen && exam && departments.length > 0 && !formData.DepartmentID) {
            const deptCode = exam.Subject?.Department?.DepartmentCode;
            if (deptCode) {
                const firstDeptCode = deptCode.split(',')[0].trim();
                const matchedDept = departments.find(d => d.DepartmentCode === firstDeptCode);
                if (matchedDept) {
                    setFormData(prev => ({
                        ...prev,
                        DepartmentID: String(matchedDept.DepartmentID)
                    }));
                }
            }
        }
    }, [isOpen, exam, departments, formData.DepartmentID]);

    useEffect(() => {
        if (!isOpen) return;
        (async () => {
            try {
                const response = await academicService.getDepartments();
                const items = Array.isArray((response as any)?.data)
                    ? (response as any).data
                    : Array.isArray(response)
                        ? response
                        : [];
                setDepartments(items);
            } catch {
                setDepartments([]);
            }
            try {
                const data = await SubjectService.getAll();
                setSubjects(data);
            } catch (error) {
                console.error("Failed to load subjects", error);
            }
        })();
    }, [isOpen]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSearchChange = (val: string) => {
        setSubjectSearch(val);
        if (subjects.length > 0) {
            if (val) {
                setFilteredSubjects(subjects.filter(s =>
                    s.SubjectName.toLowerCase().includes(val.toLowerCase()) ||
                    s.SubjectCode.toLowerCase().includes(val.toLowerCase())
                ));
            } else {
                setFilteredSubjects(subjects.slice(0, 20));
            }
        } else {
            setFilteredSubjects([]);
        }
    };

    const handleFocus = () => {
        if (subjects.length > 0) {
            if (!subjectSearch) {
                setFilteredSubjects(subjects.slice(0, 20));
            } else {
                const searchVal = subjectSearch.includes(' - ') ? subjectSearch.split(' - ')[0] : subjectSearch;
                setFilteredSubjects(subjects.filter(s =>
                    s.SubjectName.toLowerCase().includes(searchVal.toLowerCase()) ||
                    s.SubjectCode.toLowerCase().includes(searchVal.toLowerCase())
                ).slice(0, 20));
            }
        }
    };

    const selectSubject = (sub: any) => {
        setFormData(prev => ({
            ...prev,
            SubjectID: sub.SubjectID.toString(),
            DepartmentID: sub.DepartmentID ? sub.DepartmentID.toString() : prev.DepartmentID,
            ExamName: sub.SubjectName
        }));
        setSubjectSearch(`${sub.SubjectCode} - ${sub.SubjectName}`);
        setFilteredSubjects([]);
    };

    const handleSubmit = async () => {
        if (!formData.ExamDate || !formData.Duration || !formData.SubjectID) {
            toast.error("Please fill in all required fields (Subject, Date, and Duration)");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                Duration: parseInt(formData.Duration),
                SubjectID: parseInt(formData.SubjectID),
                DepartmentID: formData.DepartmentID ? parseInt(formData.DepartmentID) : undefined
            };

            await ExamService.update(exam.ExamID, payload);
            toast.success("Exam updated successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to update exam");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            backdrop="blur"
            scrollBehavior="inside"
            classNames={{
                body: "p-0 bg-[#F8FAFC]",
                backdrop: "bg-gray-900/40 backdrop-blur-sm",
                base: "border border-gray-200 bg-white shadow-2xl rounded-2xl overflow-hidden",
                header: "border-b border-gray-100 py-6 px-8 bg-white",
                footer: "hidden",
                closeButton: "top-6 right-6 hover:bg-gray-100 text-gray-500",
            }}
        >
            <ModalContent>
                <ModalHeader>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Exam</h2>
                        <p className="text-sm text-gray-500 font-normal mt-1">Update exam details and schedule</p>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="p-6 bg-white">
                        <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Pencil size={18} className="text-blue-600" /> Exam Details
                        </h3>

                        <div className="space-y-6 w-full">

                            {/* Subject (Searchable) */}
                            <div className="relative">
                                <span className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Subject Name or Code</span>
                                <Input
                                    id="edit-subject-search"
                                    name="subjectSearch"
                                    autoComplete="off"
                                    aria-label="Subject"
                                    placeholder="e.g. CS101 - Intro to Comp Sci"
                                    value={subjectSearch}
                                    onValueChange={handleSearchChange}
                                    onFocus={(e: any) => {
                                        e.target.select();
                                        handleFocus();
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => {
                                            setFilteredSubjects([]);
                                        }, 250);
                                    }}
                                    size="lg"
                                    variant="flat"
                                    radius="sm"
                                    endContent={<Search className="text-gray-400" size={20} />}
                                    classNames={{
                                        inputWrapper: "!bg-gray-50 !border-none !shadow-none hover:!bg-gray-100 group-data-[focus=true]:!bg-white group-data-[focus=true]:!shadow-sm !ring-transparent group-data-[focus=true]:!ring-gray-200",
                                        input: "font-medium text-gray-800 !border-0 !outline-none placeholder:text-gray-400"
                                    }}
                                />
                                {filteredSubjects.length > 0 && (
                                    <div className="absolute z-50 w-full bg-white border border-gray-100 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
                                        {filteredSubjects.map(sub => (
                                            <div
                                                key={sub.SubjectID}
                                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                onClick={() => selectSubject(sub)}
                                            >
                                                <p className="text-sm font-medium text-gray-800">{sub.SubjectName}</p>
                                                <p className="text-xs text-blue-500">{sub.SubjectCode}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Department</div>
                                <Select
                                    id="department-select-edit"
                                    name="DepartmentID"
                                    disableAnimation
                                    aria-label="Department"
                                    placeholder="Select department"
                                    selectedKeys={formData.DepartmentID && departments.some(d => String(d.DepartmentID) === formData.DepartmentID) ? [formData.DepartmentID] : []}
                                    onSelectionChange={(k) => handleChange('DepartmentID', (Array.from(k)[0] as string) || '')}
                                    variant="bordered"
                                    classNames={{
                                        trigger: "bg-white border-gray-200 h-11 rounded-lg",
                                        value: "text-slate-800 font-semibold group-data-[has-value=false]:text-slate-500",
                                        popoverContent: "bg-white border border-slate-200 text-slate-800 shadow-xl font-medium"
                                    }}
                                >
                                    {departments.map((d: any) => (
                                        <SelectItem key={String(d.DepartmentID)} textValue={`${d.DepartmentCode} - ${d.DepartmentName}`}>
                                            {d.DepartmentCode} - {d.DepartmentName}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>

                            {/* Exam Name */}
                            <div>
                                <div className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Exam Name</div>
                                <Input aria-label="e.g. End Semester Exam" id="edit-exam-name"
                                    name="ExamName"
                                    autoComplete="off"
                                    placeholder="e.g. End Semester Exam"
                                    value={formData.ExamName}
                                    onValueChange={(val) => handleChange('ExamName', val)}
                                    variant="flat"
                                    radius="sm"
                                    size="lg"
                                    isRequired
                                    classNames={{
                                        inputWrapper: "!bg-gray-50 !border-none !shadow-none hover:!bg-gray-100 group-data-[focus=true]:!bg-white group-data-[focus=true]:!shadow-sm !ring-transparent group-data-[focus=true]:!ring-gray-200",
                                        input: "font-medium text-gray-800 !border-0 !outline-none placeholder:text-gray-400"
                                    }}
                                />
                            </div>

                            {/* Date & Session */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <div className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Date</div>
                                    <Input
                                        id="edit-exam-date"
                                        type="date"
                                        name="ExamDate"
                                        autoComplete="off"
                                        aria-label="Exam Date"
                                        value={formData.ExamDate}
                                        onValueChange={(val) => handleChange('ExamDate', val)}
                                        variant="flat"
                                        radius="sm"
                                        size="lg"
                                        isRequired
                                        classNames={{
                                            inputWrapper: "!bg-gray-50 !border-none !shadow-none hover:!bg-gray-100 group-data-[focus=true]:!bg-white group-data-[focus=true]:!shadow-sm !ring-transparent group-data-[focus=true]:!ring-gray-200",
                                            input: "font-medium text-gray-800 !border-0 !outline-none"
                                        }}
                                    />
                                </div>
                                <div>
                                    <span className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-3">Session</span>
                                    <div className="flex gap-6 h-[48px] items-center">
                                        <div 
                                            className="flex items-center gap-2 cursor-pointer group"
                                            onClick={() => handleChange('Session', 'FN')}
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.Session === 'FN' ? 'border-blue-600 bg-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                                                {formData.Session === 'FN' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                            </div>
                                            <input id="session-fn" type="radio" className="hidden" name="Session" value="FN" checked={formData.Session === 'FN'} onChange={() => handleChange('Session', 'FN')} />
                                            <div className="text-sm">
                                                <span className="font-bold text-gray-700 block">Forenoon</span>
                                                <span className="text-xs text-gray-400 font-medium">(FN)</span>
                                            </div>
                                        </div>

                                        <div 
                                            className="flex items-center gap-2 cursor-pointer group"
                                            onClick={() => handleChange('Session', 'AN')}
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.Session === 'AN' ? 'border-blue-600 bg-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                                                {formData.Session === 'AN' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                            </div>
                                            <input id="session-an" type="radio" className="hidden" name="Session" value="AN" checked={formData.Session === 'AN'} onChange={() => handleChange('Session', 'AN')} />
                                            <div className="text-sm">
                                                <span className="font-bold text-gray-700 block">Afternoon</span>
                                                <span className="text-xs text-gray-400 font-medium">(AN)</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <div className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Duration (Minutes)</div>
                                <Input
                                    id="edit-exam-duration"
                                    type="number"
                                    name="Duration"
                                    autoComplete="off"
                                    aria-label="Duration"
                                    placeholder="180"
                                    value={formData.Duration}
                                    onValueChange={(val) => handleChange('Duration', val)}
                                    variant="flat"
                                    radius="sm"
                                    size="lg"
                                    isRequired
                                    classNames={{
                                        inputWrapper: "!bg-gray-50 !border-none !shadow-none hover:!bg-gray-100 group-data-[focus=true]:!bg-white group-data-[focus=true]:!shadow-sm !ring-transparent group-data-[focus=true]:!ring-gray-200",
                                        input: "font-medium text-gray-800 placeholder:text-gray-400 !border-0 !outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    }}
                                />
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-100 my-4"></div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="bordered" className="border-gray-300 text-gray-700 font-medium px-6" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-blue-600 text-white font-semibold shadow-md px-6 hover:bg-blue-700"
                                    onPress={handleSubmit}
                                    isLoading={loading}
                                >
                                    Save Changes
                                </Button>
                            </div>

                        </div>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default EditExamModal;
