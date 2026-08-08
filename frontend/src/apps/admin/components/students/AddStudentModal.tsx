import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { 
    User, Hash, GraduationCap, Mail, Building2, BookOpen, 
    Calendar, Layers, ChevronDown 
} from 'lucide-react';
import api from "../../../../services/api";

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isInternal?: boolean;
}

interface ProgramWithDuration {
    ProgramID: number;
    ProgramCode: string;
    ProgramName: string;
    DurationYears?: number;
    TotalSemesters?: number;
    DepartmentID?: number;
}

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const STATUS_OPTIONS = [
    { label: "Active", value: "ACTIVE", activeStyle: "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-500 shadow-emerald-500/20" },
    { label: "Graduated", value: "GRADUATED", activeStyle: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500 shadow-blue-500/20" },
    { label: "Dropped", value: "DROPPED", activeStyle: "bg-gradient-to-r from-red-500 to-rose-600 text-white border-rose-500 shadow-rose-500/20" },
    { label: "Inactive", value: "INACTIVE", activeStyle: "bg-gradient-to-r from-amber-500 to-orange-600 text-white border-amber-500 shadow-amber-500/20" },
];

/**
 * Extracts pure integer roll number from trailing digits of a register number string
 */
const extractRollFromRegNo = (regNo: string): string => {
    if (!regNo) return "";
    const match = String(regNo).match(/(\d+)$/);
    if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed)) return String(parsed);
    }
    return "";
};

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    isInternal = false,
}) => {
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [programs, setPrograms] = useState<ProgramWithDuration[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isRollManuallyEdited, setIsRollManuallyEdited] = useState(false);

    const [formData, setFormData] = useState({
        RegisterNumber: "",
        FullName: "",
        Email: "",
        DepartmentID: "",
        ProgramID: "",
        BatchYear: new Date().getFullYear().toString(),
        Semester: "1",
        RollNumber: "",
        Division: "",
        Status: "ACTIVE",
    });

    useEffect(() => {
        if (isOpen) {
            setIsRollManuallyEdited(false);
            setFormData({
                RegisterNumber: "",
                FullName: "",
                Email: "",
                DepartmentID: "",
                ProgramID: "",
                BatchYear: new Date().getFullYear().toString(),
                Semester: "1",
                RollNumber: "",
                Division: "",
                Status: "ACTIVE",
            });
            setErrors({});

            const url = isInternal ? '/internal/students/filter-options' : '/students/meta/create-options';
            api.get(url).then(res => {
                const d = res.data;
                setDepartments(d.departments || []);
                setPrograms(d.programs || []);
            }).catch(err => console.error('Failed to load create options', err));
        }
    }, [isOpen, isInternal]);

    const validateFields = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Validate Full Name
        if (!formData.FullName?.trim()) {
            newErrors.FullName = "Full Name is required";
        } else if (formData.FullName.trim().length < 2) {
            newErrors.FullName = "Full Name must be at least 2 characters";
        } else if (formData.FullName.trim().length > 100) {
            newErrors.FullName = "Full Name must not exceed 100 characters";
        } else if (!/^[a-zA-Z\s\-']+$/.test(formData.FullName.trim())) {
            newErrors.FullName = "Full Name can only contain letters, spaces, hyphens, and apostrophes";
        }

        // Validate Email
        if (!formData.Email?.trim()) {
            newErrors.Email = "College Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
            newErrors.Email = "Please enter a valid email address";
        } else if (!/@([a-zA-Z0-9-]+\.)*sjcetpalai\.ac\.in$/i.test(formData.Email.trim())) {
            newErrors.Email = "Email must be from the college domain (@sjcetpalai.ac.in or subdomains)";
        }

        // Validate Register Number
        if (!formData.RegisterNumber?.trim()) {
            newErrors.RegisterNumber = "Register Number is required";
        } else if (formData.RegisterNumber.trim().length < 4) {
            newErrors.RegisterNumber = "Register Number must be at least 4 characters";
        } else if (formData.RegisterNumber.trim().length > 50) {
            newErrors.RegisterNumber = "Register Number must not exceed 50 characters";
        } else if (!/^[A-Z0-9\-_&/.]+/i.test(formData.RegisterNumber.trim())) {
            newErrors.RegisterNumber = "Register Number contains invalid characters";
        }

        // Validate Batch Year
        if (!formData.BatchYear) {
            newErrors.BatchYear = "Batch Year is required";
        } else {
            const year = Number(formData.BatchYear);
            const currentYear = new Date().getFullYear();
            if (!Number.isInteger(year)) {
                newErrors.BatchYear = "Batch Year must be a valid year";
            } else if (year < 2000) {
                newErrors.BatchYear = "Batch Year must be 2000 or later";
            } else if (year > currentYear + 5) {
                newErrors.BatchYear = `Batch Year cannot exceed ${currentYear + 5}`;
            }
        }

        // Validate Department
        if (!formData.DepartmentID) {
            newErrors.DepartmentID = "Department is required";
        }

        // Validate Program
        if (!formData.ProgramID) {
            newErrors.ProgramID = "Program is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => {
            const updated = { ...prev, [field]: value };

            // Register Number auto-sync to Roll Number
            if (field === "RegisterNumber") {
                if (!isRollManuallyEdited) {
                    const autoRoll = extractRollFromRegNo(value);
                    updated.RollNumber = autoRoll;
                }
            }

            // User explicitly typing in RollNumber
            if (field === "RollNumber") {
                const cleanDigits = value.replace(/\D/g, "");
                updated.RollNumber = cleanDigits;
                if (value.trim() !== "") {
                    setIsRollManuallyEdited(true);
                } else {
                    setIsRollManuallyEdited(false);
                    updated.RollNumber = extractRollFromRegNo(prev.RegisterNumber);
                }
            }

            // Department selection auto-filters Program
            if (field === "DepartmentID") {
                const matchingProgs = programs.filter(
                    p => !value || p.DepartmentID?.toString() === value.toString()
                );
                if (matchingProgs.length === 1) {
                    updated.ProgramID = matchingProgs[0].ProgramID.toString();
                } else if (!matchingProgs.some(p => p.ProgramID.toString() === prev.ProgramID)) {
                    updated.ProgramID = "";
                }
            }

            return updated;
        });

        if (errors[field]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[field];
                return newErrs;
            });
        }
    };

    const handleSubmit = async () => {
        if (!validateFields()) {
            toast.error("Please correct all validation errors");
            return;
        }

        setLoading(true);
        try {
            const url = isInternal ? "/internal/students" : "/students";

            let parsedRoll: number | undefined = undefined;
            if (formData.RollNumber?.trim()) {
                const digits = formData.RollNumber.trim().replace(/\D/g, "");
                if (digits) {
                    const num = parseInt(digits, 10);
                    if (!isNaN(num)) parsedRoll = num;
                }
            }

            const payload: any = {
                RegisterNumber: formData.RegisterNumber.trim().toUpperCase(),
                FullName: formData.FullName.trim(),
                Email: formData.Email.trim().toLowerCase(),
                DepartmentID: parseInt(formData.DepartmentID),
                ProgramID: parseInt(formData.ProgramID),
                BatchYear: parseInt(formData.BatchYear),
                Semester: formData.Semester ? parseInt(formData.Semester) : 1,
                RollNumber: parsedRoll,
                Division: formData.Division?.trim() || null,
                Status: formData.Status || "ACTIVE"
            };

            await api.post(url, payload);
            toast.success(isInternal ? "Internal student created successfully" : "Student created successfully - Credentials sent to college email");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            if (error.response?.data?.validationErrors) {
                const serverErrors: Record<string, string> = {};
                Object.entries(error.response.data.validationErrors).forEach(([key, value]) => {
                    serverErrors[key] = value as string;
                });
                setErrors(serverErrors);
                toast.error("Please correct validation errors");
            } else {
                toast.error(error.response?.data?.message || "Failed to add student");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            placement="center"
            backdrop="blur"
            size="2xl"
            classNames={{
                base: "bg-white border border-white/20 shadow-2xl rounded-3xl overflow-hidden max-h-[90vh]",
                header: "p-0 border-none",
                body: "p-0 overflow-y-auto",
                footer: "border-t border-slate-100 py-4 px-8 bg-slate-50/50 backdrop-blur-sm",
                closeButton: "hover:bg-white/20 active:bg-white/30 text-white p-2 rounded-full transition-colors right-5 top-5 z-50"
            }}
            motionProps={{
                variants: {
                    enter: {
                        scale: 1,
                        y: 0,
                        opacity: 1,
                        transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                    },
                    exit: {
                        scale: 0.96,
                        y: 15,
                        opacity: 0,
                        transition: { duration: 0.15, ease: "easeIn" },
                    },
                }
            }}
        >
            <ModalContent>
                <ModalHeader className="m-0 p-0 border-none">
                    <div className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-8 py-6 relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
                        <div className="absolute right-32 -top-10 w-32 h-32 bg-blue-400/20 rounded-full blur-xl pointer-events-none" />

                        <div className="flex items-center justify-between relative z-10 w-full pr-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                                    <GraduationCap size={24} className="text-blue-300" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h2 className="text-xl font-extrabold !text-white tracking-tight" style={{ color: '#ffffff' }}>
                                            Add New {isInternal ? 'Internal' : ''} Student
                                        </h2>
                                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-100 border border-indigo-300/30 text-[0.7rem] font-bold tracking-wide">
                                            {isInternal ? 'Internal Exam' : 'EndSem'}
                                        </span>
                                    </div>
                                    <p className="text-xs !text-blue-100/90 font-medium mt-0.5" style={{ color: '#dbeafe' }}>
                                        {isInternal 
                                            ? 'Create isolated student record for internal exams and seating' 
                                            : 'Credentials will be automatically generated and sent to college email'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalHeader>

                <ModalBody>
                    <div className="px-8 py-7 space-y-7">
                        {/* SECTION 1: PERSONAL INFORMATION */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                                    <User size={16} />
                                </div>
                                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Personal Information</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Full Name <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all ${
                                        errors.FullName 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <User size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            autoComplete="name"
                                            placeholder="e.g. John Doe"
                                            value={formData.FullName}
                                            onChange={(e) => handleChange("FullName", e.target.value)}
                                            className="w-full h-full px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                    {errors.FullName && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.FullName}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        College Email <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all ${
                                        errors.Email 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <Mail size={16} />
                                        </div>
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="john@ce.sjcetpalai.ac.in"
                                            value={formData.Email}
                                            onChange={(e) => handleChange("Email", e.target.value)}
                                            className="w-full h-full px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                    {errors.Email && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.Email}</p>}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: ACADEMIC & CLASS DETAILS */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                                    <Hash size={16} />
                                </div>
                                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Academic & Class Details</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <div className="space-y-1.5 sm:col-span-1">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Register Number <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all ${
                                        errors.RegisterNumber 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <Hash size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            autoComplete="off"
                                            placeholder="AI&DS2021A01"
                                            value={formData.RegisterNumber}
                                            onChange={(e) => handleChange("RegisterNumber", e.target.value)}
                                            className="w-full h-full px-3.5 text-xs font-mono font-bold uppercase text-indigo-700 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                    {errors.RegisterNumber && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.RegisterNumber}</p>}
                                </div>

                                <div className="space-y-1.5 sm:col-span-1">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Class Roll No
                                    </label>
                                    <div className={`flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all ${
                                        errors.RollNumber 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <Layers size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            placeholder="e.g. 1"
                                            value={formData.RollNumber}
                                            onChange={(e) => handleChange("RollNumber", e.target.value)}
                                            className="w-full h-full px-3.5 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                    {errors.RollNumber && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.RollNumber}</p>}
                                </div>

                                <div className="space-y-1.5 sm:col-span-1">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Batch Year <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all ${
                                        errors.BatchYear 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <Calendar size={16} />
                                        </div>
                                        <input
                                            type="number"
                                            placeholder="2026"
                                            value={formData.BatchYear}
                                            onChange={(e) => handleChange("BatchYear", e.target.value)}
                                            className="w-full h-full px-3.5 text-xs font-mono font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                    {errors.BatchYear && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.BatchYear}</p>}
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: DEPARTMENT, PROGRAM, SEMESTER & STATUS */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                                    <Building2 size={16} />
                                </div>
                                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Department, Program & Status</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Department <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`relative flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all ${
                                        errors.DepartmentID 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <Building2 size={16} />
                                        </div>
                                        <select
                                            value={formData.DepartmentID}
                                            onChange={(e) => handleChange("DepartmentID", e.target.value)}
                                            className="w-full h-full px-3.5 pr-8 text-xs font-semibold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0 cursor-pointer appearance-none"
                                        >
                                            <option value="">Select Department...</option>
                                            {departments.map(dept => (
                                                <option key={dept.DepartmentID} value={dept.DepartmentID?.toString()}>
                                                    {dept.DepartmentCode} — {dept.DepartmentName}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute right-3 text-slate-400 pointer-events-none" />
                                    </div>
                                    {errors.DepartmentID && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.DepartmentID}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Program <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`relative flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all ${
                                        errors.ProgramID 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <BookOpen size={16} />
                                        </div>
                                        <select
                                            value={formData.ProgramID}
                                            onChange={(e) => handleChange("ProgramID", e.target.value)}
                                            className="w-full h-full px-3.5 pr-8 text-xs font-semibold text-slate-800 bg-transparent outline-none border-none ring-0 focus:ring-0 cursor-pointer appearance-none"
                                        >
                                            <option value="">Select Program...</option>
                                            {programs
                                                .filter(prog => !formData.DepartmentID || prog.DepartmentID?.toString() === formData.DepartmentID.toString())
                                                .map(prog => (
                                                    <option key={prog.ProgramID} value={prog.ProgramID?.toString()}>
                                                        {prog.ProgramName}
                                                    </option>
                                                ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute right-3 text-slate-400 pointer-events-none" />
                                    </div>
                                    {errors.ProgramID && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.ProgramID}</p>}
                                </div>
                            </div>

                            {/* Semester Selection Pills */}
                            <div className="space-y-2 pt-1">
                                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                    <span>Current Semester</span>
                                    <span className="text-[0.7rem] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                        Semester {formData.Semester || 1}
                                    </span>
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                    {SEMESTER_OPTIONS.map((semNum) => {
                                        const isSelected = formData.Semester === semNum.toString();
                                        return (
                                            <button
                                                key={semNum}
                                                type="button"
                                                onClick={() => handleChange("Semester", semNum.toString())}
                                                className={`h-9 rounded-xl font-mono text-xs font-extrabold transition-all border ${
                                                    isSelected
                                                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-[1.02]'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200/90 hover:bg-slate-100 hover:border-slate-300'
                                                }`}
                                            >
                                                S{semNum}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Status Pills */}
                            <div className="space-y-2 pt-1">
                                <label className="text-xs font-bold text-slate-700">Account Status</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {STATUS_OPTIONS.map((opt) => {
                                        const isSelected = formData.Status === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => handleChange("Status", opt.value)}
                                                className={`h-10 px-3 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1.5 ${
                                                    isSelected
                                                        ? `${opt.activeStyle} shadow-md scale-[1.02]`
                                                        : 'bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-slate-400'}`} />
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>
                </ModalBody>

                <ModalFooter className="flex justify-between items-center bg-slate-50/80 px-8 py-4 border-t border-slate-100">
                    <p className="text-[0.75rem] text-slate-400 font-medium">
                        Fields marked with <span className="text-rose-500 font-bold">*</span> are required
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="flat"
                            onPress={onClose}
                            className="font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 px-5 rounded-xl h-11 text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-extrabold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 px-7 rounded-xl h-11 text-xs transition-all"
                            onPress={handleSubmit}
                            isLoading={loading}
                        >
                            Add Student
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
