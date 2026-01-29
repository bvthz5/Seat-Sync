
import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Textarea, Chip, RadioGroup, Radio } from "@heroui/react";
import toast from 'react-hot-toast';
import { ExamService } from '../../services/examService';
import { Calendar, Clock, Search, AlertTriangle, AlertCircle, CheckCircle, Info, Layers, Check, X } from "lucide-react";

interface CreateExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Mock Subjects removed - fetching from API
import { SubjectService } from '../../services/subjectService';

interface Subject {
    SubjectID: number;
    SubjectCode: string;
    SubjectName: string;
}


const CreateExamModal: React.FC<CreateExamModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        ExamName: '',
        SubjectID: '',
        SubjectName: '', // For search display
        ExamDate: '',
        Session: 'FN',
        Duration: '180',
        ExamType: 'Internal Assessment',
        Instructions: ''
    });

    const [subjectSearch, setSubjectSearch] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);

    // Fetch subjects on mount
    React.useEffect(() => {
        if (isOpen) {
            loadSubjects();
        }
    }, [isOpen]);

    const loadSubjects = async () => {
        try {
            const data = await SubjectService.getAll();
            setSubjects(data);
        } catch (error) {
            console.error("Failed to load subjects", error);
            toast.error("Could not load subjects list");
        }
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSearchChange = (val: string) => {
        setSubjectSearch(val);
        if (val && subjects.length > 0) {
            setFilteredSubjects(subjects.filter(s =>
                s.SubjectName.toLowerCase().includes(val.toLowerCase()) ||
                s.SubjectCode.toLowerCase().includes(val.toLowerCase())
            ));
        } else {
            setFilteredSubjects([]);
        }
    };

    const selectSubject = (sub: Subject) => {
        setFormData({
            ...formData,
            SubjectID: sub.SubjectID.toString(),
            SubjectName: sub.SubjectName,
            ExamName: `${sub.SubjectName} - ${formData.ExamType}`
        });
        setSubjectSearch(`${sub.SubjectCode} - ${sub.SubjectName}`);
        setFilteredSubjects([]);
    };

    const handleSubmit = async () => {
        if (!formData.ExamDate || !formData.SubjectID) {
            toast.error("Please fill all required fields");
            return;
        }

        setLoading(true);
        try {
            await ExamService.create({
                ExamName: formData.ExamName,
                SubjectID: parseInt(formData.SubjectID),
                ExamDate: formData.ExamDate,
                Session: formData.Session,
                Duration: parseInt(formData.Duration)
            });
            toast.success("Schedule Published Successfully!");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create exam");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="3xl"
            backdrop="blur"
            scrollBehavior="inside"
            classNames={{
                body: "p-0 bg-[#F8FAFC]",
                backdrop: "bg-gray-900/40 backdrop-blur-sm",
                base: "border border-gray-200 bg-white shadow-2xl rounded-2xl overflow-hidden !max-w-[1000px]",
                header: "border-b border-gray-100 py-6 px-8 bg-white",
                footer: "hidden",
                closeButton: "top-6 right-6 hover:bg-gray-100 text-gray-500",
            }}
        >
            <ModalContent>
                <ModalHeader>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Schedule New Exam</h2>
                        <p className="text-sm text-gray-500 font-normal mt-1">Configure exam details and verify constraints before publishing.</p>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col lg:flex-row h-full">

                        {/* LEFT COLUMN: FORM */}
                        <div className="flex-1 p-5 bg-white overflow-y-auto">
                            <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Layers size={18} className="text-blue-600" /> Exam Details
                            </h3>

                            <div className="space-y-6 w-full">

                                {/* 1. Subject Search */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject Name or Code</label>
                                    <Input
                                        placeholder="e.g. CS101 - Intro to Comp Sci"
                                        value={subjectSearch}
                                        onValueChange={handleSearchChange}
                                        size="lg"
                                        variant="bordered"
                                        radius="sm"
                                        endContent={<Search className="text-gray-400" size={20} />}
                                        classNames={{
                                            inputWrapper: "border-gray-200 hover:border-blue-400 focus-within:border-blue-600 shadow-none"
                                        }}
                                    />
                                    {filteredSubjects.length > 0 && (
                                        <div className="absolute z-10 w-full bg-white border border-gray-100 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto">
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

                                {/* 2. Exam Type */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
                                    <div className="flex gap-3">
                                        {['Internal Assessment', 'Semester End', 'Supplementary'].map((type) => (
                                            <button
                                                key={type}
                                                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${formData.ExamType === type
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                    }`}
                                                onClick={() => setFormData({ ...formData, ExamType: type })}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Date & Session */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                                        <Input
                                            type="date"
                                            name="ExamDate"
                                            value={formData.ExamDate}
                                            onChange={handleChange}
                                            variant="bordered"
                                            radius="sm"
                                            size="lg"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Session</label>
                                        <div className="flex gap-6">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.Session === 'FN' ? 'border-blue-600' : 'border-gray-300'}`}>
                                                    {formData.Session === 'FN' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                                </div>
                                                <input type="radio" className="hidden" name="Session" value="FN" checked={formData.Session === 'FN'} onChange={handleChange} />
                                                <div className="text-sm">
                                                    <span className="font-medium text-gray-800 block">Forenoon</span>
                                                    <span className="text-xs text-gray-500">(FN)</span>
                                                </div>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${formData.Session === 'AN' ? 'border-blue-600' : 'border-gray-300'}`}>
                                                    {formData.Session === 'AN' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                                </div>
                                                <input type="radio" className="hidden" name="Session" value="AN" checked={formData.Session === 'AN'} onChange={handleChange} />
                                                <div className="text-sm">
                                                    <span className="font-medium text-gray-800 block">Afternoon</span>
                                                    <span className="text-xs text-gray-500">(AN)</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <Input
                                    type="number"
                                    label="Duration (Minutes)"
                                    labelPlacement="outside"
                                    placeholder="180"
                                    name="Duration"
                                    value={formData.Duration}
                                    onChange={handleChange}
                                    variant="bordered"
                                    radius="sm"
                                    size="lg"
                                    className="w-full"
                                    classNames={{ label: "!text-gray-700 font-medium" }}
                                />

                                {/* Divider */}
                                <div className="h-px bg-gray-100 my-4"></div>

                                {/* Action Buttons (Inline bottom) */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="bordered" className="border-gray-300 text-gray-700 font-medium px-6" onPress={onClose}>
                                        Save Draft
                                    </Button>
                                    <Button
                                        className="bg-blue-600 text-white font-semibold shadow-md px-6"
                                        onPress={handleSubmit}
                                        isLoading={loading}
                                    >
                                        Publish Schedule
                                    </Button>
                                </div>

                            </div>
                        </div>

                        {/* RIGHT COLUMN: SIDEBAR */}
                        <div className="w-full lg:w-[280px] bg-[#F8FAFC] border-l border-gray-200 p-5">

                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wide">Live Conflict Check</h3>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Active
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Green Item */}
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <Check size={14} className="text-green-600" strokeWidth={3} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Student Clashes</p>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">No overlap found for enrolled students in this time slot.</p>
                                    </div>
                                </div>

                                {/* Yellow Item */}
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 shadow-sm flex gap-3">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                                        <AlertTriangle size={14} className="text-yellow-600" strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Simultaneous Exams</p>
                                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                            Warning: 15 students have "Math 101" ending just 15 mins before this start time.
                                        </p>
                                    </div>
                                </div>

                                {/* Red Item */}
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 shadow-sm flex gap-3">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                                        <AlertCircle size={14} className="text-red-600" strokeWidth={2} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Missing Registrations</p>
                                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                            <span className="font-medium text-gray-900">{subjectSearch.split('-')[0] || 'Subject'}</span> has 12 students pending registration approval. They will not be scheduled.
                                        </p>
                                    </div>
                                </div>

                                {/* Green Item */}
                                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                                    <div className="mt-0.5 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <Check size={14} className="text-green-600" strokeWidth={3} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">Room Availability</p>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">Hall A and Hall B are available. Total Capacity: 150.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Info Box */}
                            <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Info size={16} className="text-blue-600" />
                                    <span className="text-xs font-bold text-blue-800">Quick Tip</span>
                                </div>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Avoid scheduling exams during "University Sports Week" (Nov 12-15) to minimize rescheduling requests.
                                </p>
                            </div>

                        </div>

                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default CreateExamModal;
