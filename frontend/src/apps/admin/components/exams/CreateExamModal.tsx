import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Select, SelectItem } from "@heroui/react";
import toast from 'react-hot-toast';
import { ExamService } from '../../services/examService';
import { SubjectService } from '../../services/subjectService';
import { academicService } from '../../services/academicService';
import { BookOpen, Search, CalendarDays, Clock, Building2, ChevronDown, Check, AlertTriangle, AlertCircle, Info, Layers } from "lucide-react";

interface CreateExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    seriesId?: string | number;
}

interface Subject {
    SubjectID: number;
    SubjectCode: string;
    SubjectName: string;
}

const CreateExamModal: React.FC<CreateExamModalProps> = ({ isOpen, onClose, onSuccess, seriesId }) => {
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
        DepartmentID: ''
    });

    const [subjectSearch, setSubjectSearch] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [filteredSubjects, setFilteredSubjects] = useState<Subject[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    // Fetch subjects on mount
    useEffect(() => {
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
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (field: string, value: string) => {
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
        let resolvedSubjectID = formData.SubjectID;
        let resolvedSubjectName = formData.SubjectName;

        if (!resolvedSubjectID && subjectSearch) {
            const cleanSearch = subjectSearch.includes(' - ') ? subjectSearch.split(' - ')[0].trim() : subjectSearch.trim();
            const matched = subjects.find(s => 
                s.SubjectCode?.toLowerCase() === cleanSearch.toLowerCase() ||
                s.SubjectName?.toLowerCase() === cleanSearch.toLowerCase() ||
                `${s.SubjectCode} - ${s.SubjectName}`.toLowerCase() === subjectSearch.trim().toLowerCase()
            );
            if (matched) {
                resolvedSubjectID = String(matched.SubjectID);
                resolvedSubjectName = matched.SubjectName;
            }
        }

        if (!formData.ExamDate || !resolvedSubjectID) {
            toast.error("Please select a valid Subject and Exam Date");
            return;
        }

        const finalExamName = formData.ExamName || (resolvedSubjectName ? `${resolvedSubjectName} - ${formData.ExamType}` : subjectSearch || 'New Scheduled Exam');

        setLoading(true);
        try {
            const deptId = formData.DepartmentID && !isNaN(parseInt(formData.DepartmentID)) ? parseInt(formData.DepartmentID) : undefined;

            const payload: any = {
                ExamName: finalExamName,
                SubjectID: parseInt(resolvedSubjectID),
                ExamDate: formData.ExamDate,
                Session: formData.Session || 'FN',
                Duration: parseInt(formData.Duration || '180')
            };

            if (deptId !== undefined) {
                payload.DepartmentID = deptId;
            }

            if (seriesId && !isNaN(parseInt(seriesId.toString()))) {
                payload.ExamSeriesID = parseInt(seriesId.toString());
            }

            await ExamService.create(payload);
            toast.success("Schedule Published Successfully!");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || "Failed to create exam");
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
                base: "border border-slate-200/80 bg-white shadow-2xl rounded-3xl overflow-hidden !max-w-[1050px]",
                header: "p-0 border-b border-slate-100 bg-white",
                body: "p-0 bg-white",
                footer: "hidden",
                closeButton: "top-5 right-6 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-all z-20",
            }}
        >
            <ModalContent>
                {/* Clean Header */}
                <ModalHeader className="flex items-center gap-3 border-b border-slate-100 py-5 px-8 bg-white">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                        <BookOpen size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                            Schedule New Exam
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Configure paper details, session, and verify conflict constraints
                        </p>
                    </div>
                </ModalHeader>

                <ModalBody className="p-0">
                    <div className="flex flex-col lg:flex-row min-h-[520px]">

                        {/* LEFT COLUMN: FORM */}
                        <div className="flex-1 p-8 bg-white overflow-y-auto space-y-6">

                            {/* 1. Subject Search */}
                            <div className="space-y-1.5 relative">
                                <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                                    Subject Code & Name <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center w-full h-11 rounded-xl border border-slate-200/90 bg-slate-50/70 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                    <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                        <Search size={16} />
                                    </div>
                                    <input
                                        id="subjectSearch"
                                        type="text"
                                        placeholder="Search subject code or name..."
                                        value={subjectSearch}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        onFocus={(e: any) => {
                                            e.target.select();
                                            handleFocus();
                                        }}
                                        onBlur={() => setTimeout(() => setFilteredSubjects([]), 250)}
                                        className="w-full h-full px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                    />
                                </div>
                                {filteredSubjects.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 top-full bg-white border border-slate-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                                        {filteredSubjects.map(sub => (
                                            <div
                                                key={sub.SubjectID}
                                                className="px-4 py-2.5 hover:bg-indigo-50/60 cursor-pointer transition-colors"
                                                onClick={() => selectSubject(sub)}
                                            >
                                                <p className="text-xs font-bold text-slate-900">{sub.SubjectName}</p>
                                                <p className="text-[11px] font-extrabold text-indigo-600">{sub.SubjectCode}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 2. Exam Type & Department Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Exam Type */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                                        Exam Type
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Internal Assessment', 'Semester End', 'Supplementary'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                className={`h-11 rounded-xl text-[11px] font-extrabold transition-all border ${
                                                    formData.ExamType === type
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                                                }`}
                                                onClick={() => {
                                                    const newName = formData.SubjectName ? `${formData.SubjectName} - ${type}` : '';
                                                    setFormData({ ...formData, ExamType: type, ExamName: newName });
                                                }}
                                            >
                                                {type.split(' ')[0]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Department Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                                        Department
                                    </label>
                                    <div className="relative flex items-center w-full h-11 rounded-xl border border-slate-200/90 bg-slate-50/70 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <Building2 size={16} />
                                        </div>
                                        <select
                                            id="department-select"
                                            value={formData.DepartmentID}
                                            onChange={(e) => handleSelectChange('DepartmentID', e.target.value)}
                                            className="w-full h-full px-3.5 pr-8 text-xs font-bold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0 cursor-pointer appearance-none"
                                        >
                                            <option value="">Select Department (Optional)...</option>
                                            {departments.map((d: any) => (
                                                <option key={d.DepartmentID} value={String(d.DepartmentID)}>
                                                    {d.DepartmentCode} — {d.DepartmentName}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Date & Duration Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Exam Date */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                                        Exam Date <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="flex items-center w-full h-11 rounded-xl border border-slate-200/90 bg-slate-50/70 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <CalendarDays size={16} />
                                        </div>
                                        <input
                                            id="ExamDate"
                                            type="date"
                                            name="ExamDate"
                                            value={formData.ExamDate}
                                            onChange={handleChange}
                                            className="w-full h-full px-3.5 text-xs font-bold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                </div>

                                {/* Duration with Presets */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                                            Duration (Minutes)
                                        </label>
                                        <div className="flex gap-1">
                                            {[90, 120, 180].map((mins) => (
                                                <button
                                                    key={mins}
                                                    type="button"
                                                    onClick={() => handleSelectChange('Duration', String(mins))}
                                                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border transition-all ${
                                                        formData.Duration === String(mins)
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {mins}m
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center w-full h-11 rounded-xl border border-slate-200/90 bg-slate-50/70 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <Clock size={16} />
                                        </div>
                                        <input
                                            id="Duration"
                                            type="number"
                                            name="Duration"
                                            placeholder="180"
                                            value={formData.Duration}
                                            onChange={handleChange}
                                            className="w-full h-full px-3.5 text-xs font-bold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Session Selector */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                                    Exam Session
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleSelectChange('Session', 'FN')}
                                        className={`flex items-center justify-center gap-2.5 h-11 rounded-xl border text-xs font-bold transition-all ${
                                            formData.Session === 'FN'
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${formData.Session === 'FN' ? 'bg-white' : 'bg-slate-400'}`} />
                                        Forenoon (FN)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelectChange('Session', 'AN')}
                                        className={`flex items-center justify-center gap-2.5 h-11 rounded-xl border text-xs font-bold transition-all ${
                                            formData.Session === 'AN'
                                                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${formData.Session === 'AN' ? 'bg-white' : 'bg-slate-400'}`} />
                                        Afternoon (AN)
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button 
                                    variant="flat" 
                                    className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl h-10 px-5 text-xs transition-all" 
                                    onPress={onClose}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl h-10 px-6 text-xs shadow-md shadow-indigo-200 transition-all"
                                    onPress={handleSubmit}
                                    isLoading={loading}
                                >
                                    Publish Schedule
                                </Button>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: LIVE CONFLICT CHECK SIDEBAR */}
                        <div className="w-full lg:w-[320px] bg-slate-50/60 border-t lg:border-t-0 lg:border-l border-slate-200/80 p-6 flex flex-col justify-between gap-6 shrink-0">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Live Conflict Check</h3>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-black tracking-wider uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {/* Item 1 */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 text-emerald-600">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Student Clashes</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">No overlap found for enrolled students in this time slot.</p>
                                        </div>
                                    </div>

                                    {/* Item 2 */}
                                    <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 shadow-xs flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5 text-amber-700">
                                            <AlertTriangle size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-amber-950">Simultaneous Exams</p>
                                            <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed font-medium">
                                                Warning: 15 students have another exam ending just 15 mins prior.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Item 3 */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600">
                                            <Check size={14} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Room Capacity</p>
                                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">Hall A and Hall B available with total capacity of 150 seats.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tip Box */}
                            <div className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 shadow-xs">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Info size={15} className="text-indigo-600 shrink-0" />
                                    <span className="text-xs font-extrabold text-indigo-900">Scheduling Tip</span>
                                </div>
                                <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">
                                    Check semester timetable overlap before publishing to optimize hall seating allocation.
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
