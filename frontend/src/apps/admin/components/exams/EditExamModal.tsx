import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { ExamService } from '../../services/examService';
import { SubjectService } from '../../services/subjectService';
import { academicService } from '../../services/academicService';
import { toast } from 'react-hot-toast';
import { Pencil, Search, CalendarDays, Clock, BookOpen, Building2, ChevronDown } from 'lucide-react';

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
        Session: 'FN',
        Duration: '180',
        SubjectID: '',
        DepartmentID: ''
    });

    useEffect(() => {
        if (isOpen && exam) {
            const rawDuration = Number(exam.Duration);
            // Sanitize duration to valid range (e.g. 180 min default if absurd value like 1260)
            const validDuration = (rawDuration > 0 && rawDuration <= 300) ? String(rawDuration) : '180';
            const initialDeptID = exam?.DepartmentID ?? exam?.Department?.DepartmentID ?? exam?.Subject?.DepartmentID ?? exam?.Subject?.Department?.DepartmentID ?? '';
            const initialSubjectID = exam?.SubjectID ?? exam?.Subject?.SubjectID ?? '';

            setFormData({
                ExamName: exam.ExamName || exam.Subject?.SubjectName || '',
                ExamDate: exam.ExamDate ? exam.ExamDate.split('T')[0] : '',
                Session: exam.Session || 'FN',
                Duration: validDuration,
                SubjectID: String(initialSubjectID),
                DepartmentID: String(initialDeptID)
            });

            if (exam.Subject?.SubjectCode || exam.Subject?.SubjectName) {
                const code = exam.Subject.SubjectCode || '';
                const name = exam.Subject.SubjectName || '';
                setSubjectSearch(code && name ? `${code} - ${name}` : code || name);
            } else if (exam.ExamName) {
                setSubjectSearch(exam.ExamName);
            } else {
                setSubjectSearch('');
            }
        }
    }, [isOpen, exam]);

    // Resolve SubjectID and DepartmentID for internal exams once subjects and departments are loaded
    useEffect(() => {
        if (isOpen && exam && subjects.length > 0 && !formData.SubjectID) {
            const codeToMatch = exam.Subject?.SubjectCode || (subjectSearch.includes(' - ') ? subjectSearch.split(' - ')[0] : subjectSearch);
            if (codeToMatch) {
                const matchedSubject = subjects.find(s => 
                    s.SubjectCode?.toLowerCase() === codeToMatch.toLowerCase() ||
                    s.SubjectName?.toLowerCase() === codeToMatch.toLowerCase()
                );
                if (matchedSubject) {
                    setFormData(prev => ({
                        ...prev,
                        SubjectID: String(matchedSubject.SubjectID)
                    }));
                }
            }
        }
    }, [isOpen, exam, subjects, formData.SubjectID, subjectSearch]);

    useEffect(() => {
        if (isOpen && exam && departments.length > 0) {
            const directDeptID = exam?.DepartmentID ?? exam?.Department?.DepartmentID ?? exam?.Subject?.DepartmentID ?? exam?.Subject?.Department?.DepartmentID;
            if (directDeptID && departments.some(d => String(d.DepartmentID) === String(directDeptID))) {
                setFormData(prev => ({ ...prev, DepartmentID: String(directDeptID) }));
                return;
            }

            const deptCodeCandidates = [
                exam?.Department?.DepartmentCode,
                exam?.Subject?.Department?.DepartmentCode,
                exam?.departmentCode,
                exam?.branch,
                exam?.Subject?.SubjectCode,
                exam?.Subject?.SubjectName
            ].filter(Boolean);

            for (const cand of deptCodeCandidates) {
                const strCand = String(cand).split(',')[0].trim().toLowerCase();
                const matchedDept = departments.find(d => 
                    d.DepartmentCode?.toLowerCase() === strCand ||
                    d.DepartmentName?.toLowerCase() === strCand ||
                    (d.DepartmentCode && d.DepartmentCode.length >= 2 && strCand.startsWith(d.DepartmentCode.toLowerCase()))
                );
                if (matchedDept) {
                    setFormData(prev => ({
                        ...prev,
                        DepartmentID: String(matchedDept.DepartmentID)
                    }));
                    break;
                }
            }
        }
    }, [isOpen, exam, departments]);

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
            } catch {
                setSubjects([]);
            }
        })();
    }, [isOpen]);

    const handleSearchChange = (val: string) => {
        setSubjectSearch(val);
        if (!val.trim()) {
            setFilteredSubjects([]);
            return;
        }
        const lower = val.toLowerCase();
        const matches = subjects.filter(s =>
            (s.SubjectCode && s.SubjectCode.toLowerCase().includes(lower)) ||
            (s.SubjectName && s.SubjectName.toLowerCase().includes(lower))
        );
        setFilteredSubjects(matches.slice(0, 8));
    };

    const handleFocus = () => {
        if (subjects.length > 0) {
            if (!subjectSearch.trim()) {
                setFilteredSubjects(subjects.slice(0, 8));
            } else {
                handleSearchChange(subjectSearch);
            }
        }
    };

    const selectSubject = (sub: any) => {
        setFormData(prev => ({
            ...prev,
            SubjectID: String(sub.SubjectID),
            ExamName: sub.SubjectName,
            DepartmentID: sub.DepartmentID ? String(sub.DepartmentID) : (sub.Department?.DepartmentID ? String(sub.Department.DepartmentID) : prev.DepartmentID)
        }));
        setSubjectSearch(`${sub.SubjectCode} - ${sub.SubjectName}`);
        setFilteredSubjects([]);
    };

    const handleChange = (field: string, val: string) => {
        setFormData(prev => ({ ...prev, [field]: val }));
    };

    const handleSubmit = async () => {
        if (!formData.ExamDate || !formData.Duration) {
            toast.error("Please fill in all required fields (Date and Duration)");
            return;
        }

        let resolvedSubjectID = formData.SubjectID;
        if (!resolvedSubjectID && subjectSearch) {
            const cleanSearch = subjectSearch.includes(' - ') ? subjectSearch.split(' - ')[0].trim() : subjectSearch.trim();
            const matched = subjects.find(s => 
                s.SubjectCode?.toLowerCase() === cleanSearch.toLowerCase() ||
                s.SubjectName?.toLowerCase() === cleanSearch.toLowerCase()
            );
            if (matched) {
                resolvedSubjectID = String(matched.SubjectID);
            }
        }

        setLoading(true);
        try {
            const payload: any = {
                ...formData,
                Duration: parseInt(formData.Duration),
                SubjectID: resolvedSubjectID ? parseInt(resolvedSubjectID) : undefined,
                DepartmentID: formData.DepartmentID ? parseInt(formData.DepartmentID) : undefined
            };

            const targetId = exam.ExamID || exam.id;
            await ExamService.update(targetId, payload);
            toast.success("Exam updated successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || "Failed to update exam");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            backdrop="blur"
            classNames={{
                base: 'bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200/80',
                header: 'border-b border-slate-100 py-5 px-8 bg-white',
                body: 'p-8 bg-white',
                footer: 'border-t border-slate-100 py-4 px-8 bg-slate-50/50 flex justify-end gap-3',
                closeButton: 'top-5 right-5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all',
            }}
        >
            <ModalContent>
                <ModalHeader className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                        <Pencil size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                            Edit Exam Details
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            Update paper selection, department, date, and session
                        </p>
                    </div>
                </ModalHeader>

                <ModalBody className="p-8 space-y-6 bg-white">
                    {/* Subject & Department Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Searchable Subject */}
                        <div className="space-y-1.5 relative">
                            <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                                Subject Code & Name
                            </label>
                            <div className="flex items-center w-full h-11 rounded-xl border border-slate-200/90 bg-slate-50/70 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                    <Search size={16} />
                                </div>
                                <input
                                    id="edit-subject-search"
                                    type="text"
                                    placeholder="Search subject..."
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
                                    id="department-select-edit"
                                    value={formData.DepartmentID}
                                    onChange={(e) => handleChange('DepartmentID', e.target.value)}
                                    className="w-full h-full px-3.5 pr-8 text-xs font-bold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0 cursor-pointer appearance-none"
                                >
                                    <option value="">Select Department...</option>
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

                    {/* Date & Duration Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Exam Date */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                                Exam Date
                            </label>
                            <div className="flex items-center w-full h-11 rounded-xl border border-slate-200/90 bg-slate-50/70 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden">
                                <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                    <CalendarDays size={16} />
                                </div>
                                <input
                                    id="edit-exam-date"
                                    type="date"
                                    value={formData.ExamDate}
                                    onChange={(e) => handleChange('ExamDate', e.target.value)}
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
                                            onClick={() => handleChange('Duration', String(mins))}
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
                                    id="edit-exam-duration"
                                    type="number"
                                    placeholder="180"
                                    value={formData.Duration}
                                    onChange={(e) => handleChange('Duration', e.target.value)}
                                    className="w-full h-full px-3.5 text-xs font-bold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Session Selector (Segmented Control) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                            Exam Session
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => handleChange('Session', 'FN')}
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
                                onClick={() => handleChange('Session', 'AN')}
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
                </ModalBody>

                <ModalFooter>
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
                        Save Changes
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default EditExamModal;
