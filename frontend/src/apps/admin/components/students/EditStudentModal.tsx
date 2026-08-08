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

interface EditStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    student: any;
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

const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];
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

/**
 * Safely extracts pure integer roll number from student object or RegisterNumber
 */
const extractCleanRollNumber = (student: any): string => {
    if (!student) return "";

    // Check direct properties first
    const directValues = [student.RollNumber, student.rollNumber, student.ClassRollNo, student.RollNo];
    for (const val of directValues) {
        if (val !== undefined && val !== null && val !== "") {
            const digits = String(val).replace(/\D/g, "");
            if (digits) {
                const parsed = parseInt(digits, 10);
                if (!isNaN(parsed)) return String(parsed);
            }
        }
    }

    // Fallback: extract trailing digits from RegisterNumber (e.g. AI&DS2021A01 -> 1)
    const regNo = student.RegisterNumber || student.registerNumber || "";
    return extractRollFromRegNo(regNo);
};

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    student,
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
        BatchYear: "",
        Semester: "",
        RollNumber: "",
        Division: "",
        Status: "ACTIVE",
    });

    useEffect(() => {
        if (isOpen) {
            setIsRollManuallyEdited(false);
            fetchMasterDataAndSetForm();
        }
    }, [isOpen, student]);

    const fetchMasterDataAndSetForm = async () => {
        try {
            const url = isInternal ? '/internal/students/filter-options' : '/students/meta/create-options';
            const response = await api.get(url);
            const fetchedDepts = response.data.departments || [];
            const fetchedProgs = response.data.programs || [];
            
            setDepartments(fetchedDepts);
            setPrograms(fetchedProgs);

            if (student) {
                let sem = "";
                if (student.SemesterModel?.SemesterNumber) {
                    sem = String(student.SemesterModel.SemesterNumber);
                } else if (student.Semester) {
                    sem = String(student.Semester).replace(/^S/i, "");
                } else if (student.SemesterID) {
                    sem = String(student.SemesterID);
                }

                // Pure integer roll number
                const cleanRoll = extractCleanRollNumber(student);

                setFormData({
                    RegisterNumber: student.RegisterNumber || "",
                    FullName: isInternal ? (student.FullName || "") : (student.User?.FullName || student.FullName || ""),
                    Email: student.User?.Email || student.Email || "",
                    DepartmentID: student.DepartmentID?.toString() || student.Department?.DepartmentID?.toString() || "",
                    ProgramID: student.ProgramID?.toString() || student.Program?.ProgramID?.toString() || "",
                    BatchYear: student.BatchYear?.toString() || "",
                    Semester: sem,
                    RollNumber: cleanRoll,
                    Division: student.Division || "",
                    Status: (student.Status || "ACTIVE").toUpperCase(),
                });
            }
        } catch (error) {
            console.error("Failed to fetch master data", error);
            toast.error("Could not load options");
        }
    };

    const validateFields = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.FullName?.trim()) {
            newErrors.FullName = "Full Name is required";
        } else if (formData.FullName.trim().length < 2) {
            newErrors.FullName = "Full Name must be at least 2 characters";
        } else if (!/^[a-zA-Z\s\-']+$/.test(formData.FullName.trim())) {
            newErrors.FullName = "Full Name can only contain letters, spaces, hyphens, and apostrophes";
        }

        if (!isInternal) {
            if (!formData.Email?.trim()) {
                newErrors.Email = "College Email is required";
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
                newErrors.Email = "Please enter a valid email address";
            } else if (!/@([a-zA-Z0-9-]+\.)*sjcetpalai\.ac\.in$/i.test(formData.Email.trim())) {
                newErrors.Email = "Email must be from @sjcetpalai.ac.in (or subdomains like @ce.sjcetpalai.ac.in)";
            }
        }

        if (!formData.RegisterNumber?.trim()) {
            newErrors.RegisterNumber = "Register Number is required";
        } else if (!/^[A-Z0-9\-_&/.]+/i.test(formData.RegisterNumber.trim())) {
            newErrors.RegisterNumber = "Register Number contains invalid characters";
        }

        if (formData.BatchYear) {
            const year = Number(formData.BatchYear);
            const currentYear = new Date().getFullYear();
            if (!Number.isInteger(year) || year < 2000 || year > currentYear + 5) {
                newErrors.BatchYear = `Batch Year must be between 2000 and ${currentYear + 5}`;
            }
        }

        if (formData.RollNumber) {
            const rollNum = Number(formData.RollNumber);
            if (!Number.isInteger(rollNum) || rollNum <= 0 || rollNum > 9999) {
                newErrors.RollNumber = "Roll Number must be a valid positive integer";
            }
        }

        if (!formData.DepartmentID) {
            newErrors.DepartmentID = "Department is required";
        }

        if (!formData.ProgramID) {
            newErrors.ProgramID = "Program is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (field: string, value: string) => {
        if (field === "RegisterNumber") {
            const newReg = value;
            setFormData((prev) => {
                let newRoll = prev.RollNumber;
                if (!isRollManuallyEdited) {
                    const extracted = extractRollFromRegNo(newReg);
                    if (extracted) newRoll = extracted;
                }
                return { ...prev, RegisterNumber: newReg, RollNumber: newRoll };
            });
        } else if (field === "RollNumber") {
            const cleanDigits = value.replace(/\D/g, "");
            setIsRollManuallyEdited(true);
            setFormData((prev) => ({ ...prev, RollNumber: cleanDigits }));
        } else {
            setFormData((prev) => ({ ...prev, [field]: value }));
        }

        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
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
            const baseUrl = isInternal ? '/internal/students' : '/students';
            const studentId = isInternal ? student.InternalStudentID : student.StudentID;
            
            const payload: any = {
                RegisterNumber: formData.RegisterNumber.trim().toUpperCase(),
                FullName: formData.FullName.trim(),
                DepartmentID: parseInt(formData.DepartmentID),
                ProgramID: parseInt(formData.ProgramID),
            };

            if (formData.Email) payload.Email = formData.Email.trim().toLowerCase();
            if (formData.BatchYear) payload.BatchYear = parseInt(formData.BatchYear);
            if (formData.Semester) payload.Semester = formData.Semester;
            payload.RollNumber = formData.RollNumber ? parseInt(formData.RollNumber, 10) : null;
            if (formData.Division) payload.Division = formData.Division.trim().toUpperCase();
            if (formData.Status) payload.Status = formData.Status;

            await api.put(`${baseUrl}/${studentId}`, payload);
            toast.success("Student record updated successfully");
            onSuccess();
            onClose();
            setErrors({});
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
                toast.error(error.response?.data?.message || "Failed to update student");
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
            size="3xl"
            classNames={{
                base: "bg-white border border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden",
                header: "p-0 border-none",
                body: "p-0 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200",
                footer: "border-t border-slate-100 py-4 px-8 bg-slate-50/60",
                closeButton: "hover:bg-white/20 active:bg-white/30 !text-white p-2.5 rounded-full transition-all right-6 top-6 z-50 shadow-sm"
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
                        {/* Decorative subtle background glows */}
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
                                            Edit Student Record
                                        </h2>
                                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-100 border border-indigo-300/30 text-[0.7rem] font-bold tracking-wide">
                                            {isInternal ? 'Internal Exam' : 'EndSem'}
                                        </span>
                                    </div>
                                    <p className="text-xs !text-blue-100/90 font-medium mt-0.5" style={{ color: '#dbeafe' }}>
                                        Modifying details for <span className="font-bold !text-white" style={{ color: '#ffffff' }}>{formData.RegisterNumber || student?.RegisterNumber || 'Student'}</span>
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
                                            placeholder="e.g. Rahul K S"
                                            value={formData.FullName}
                                            onChange={(e) => handleChange("FullName", e.target.value)}
                                            className="w-full h-full px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                    {errors.FullName && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.FullName}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        College Email {!isInternal && <span className="text-rose-500">*</span>}
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
                                            placeholder="student@sjcetpalai.ac.in"
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
                                        Batch Year
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
                                    <div className={`flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all relative ${
                                        errors.DepartmentID 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <Building2 size={16} />
                                        </div>
                                        <select
                                            id="department"
                                            value={formData.DepartmentID}
                                            onChange={(e) => handleChange("DepartmentID", e.target.value)}
                                            className="w-full h-full bg-transparent text-xs font-semibold px-3.5 pr-9 appearance-none outline-none border-none ring-0 focus:ring-0 cursor-pointer text-slate-800"
                                        >
                                            <option value="" className="text-slate-400">Select Department...</option>
                                            {departments.map(dept => (
                                                <option key={dept.DepartmentID} value={dept.DepartmentID} className="text-slate-800 font-medium">
                                                    {dept.DepartmentCode} — {dept.DepartmentName}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute right-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                    {errors.DepartmentID && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.DepartmentID}</p>}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Program <span className="text-rose-500">*</span>
                                    </label>
                                    <div className={`flex items-center w-full h-11 rounded-xl border overflow-hidden bg-slate-50/70 focus-within:bg-white focus-within:ring-2 transition-all relative ${
                                        errors.ProgramID 
                                            ? 'border-rose-400 bg-rose-50/20 focus-within:border-rose-500 focus-within:ring-rose-100' 
                                            : 'border-slate-200/90 hover:border-indigo-300 focus-within:border-indigo-600 focus-within:ring-indigo-100'
                                    }`}>
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <BookOpen size={16} />
                                        </div>
                                        <select
                                            id="program"
                                            value={formData.ProgramID}
                                            onChange={(e) => handleChange("ProgramID", e.target.value)}
                                            className="w-full h-full bg-transparent text-xs font-semibold px-3.5 pr-9 appearance-none outline-none border-none ring-0 focus:ring-0 cursor-pointer text-slate-800"
                                        >
                                            <option value="" className="text-slate-400">Select Program...</option>
                                            {programs
                                                .filter(prog => {
                                                    if (formData.ProgramID && prog.ProgramID?.toString() === formData.ProgramID.toString()) {
                                                        return true;
                                                    }
                                                    if (!formData.DepartmentID) return true;
                                                    return prog.DepartmentID?.toString() === formData.DepartmentID.toString();
                                                })
                                                .map(prog => (
                                                    <option key={prog.ProgramID} value={prog.ProgramID} className="text-slate-800 font-medium">
                                                        {prog.ProgramName}
                                                    </option>
                                                ))}
                                        </select>
                                        <ChevronDown size={15} className="absolute right-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                    {errors.ProgramID && <p className="text-rose-500 text-[0.7rem] font-semibold mt-1">{errors.ProgramID}</p>}
                                </div>
                            </div>

                            {/* Semester Pill Selection */}
                            <div className="space-y-2 pt-1">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    Current Semester
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                                    {SEMESTERS.map((semNum) => {
                                        const isSelected = formData.Semester === semNum;
                                        return (
                                            <button
                                                key={semNum}
                                                type="button"
                                                onClick={() => handleChange("Semester", isSelected ? "" : semNum)}
                                                className={`h-10 rounded-xl font-mono text-xs font-extrabold transition-all border flex items-center justify-center cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 scale-[1.02]' 
                                                        : 'bg-slate-50 text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:border-slate-300'
                                                }`}
                                            >
                                                S{semNum}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Division & Status Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Division / Section
                                    </label>
                                    <div className="flex items-center w-full h-11 rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50/70 hover:border-indigo-300 focus-within:bg-white focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                                        <div className="w-11 h-full bg-slate-100/80 border-r border-slate-200/90 flex items-center justify-center text-slate-400 shrink-0">
                                            <BookOpen size={16} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="e.g. A, B, Alpha"
                                            value={formData.Division}
                                            onChange={(e) => handleChange("Division", e.target.value)}
                                            className="w-full h-full px-3.5 text-xs font-semibold uppercase text-slate-800 placeholder:text-slate-400 bg-transparent outline-none border-none ring-0 focus:ring-0"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        Account Status
                                    </label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {STATUS_OPTIONS.map((st) => {
                                            const isActive = formData.Status === st.value;
                                            return (
                                                <button
                                                    key={st.value}
                                                    type="button"
                                                    onClick={() => handleChange("Status", st.value)}
                                                    className={`py-2.5 px-3 rounded-xl text-[0.7rem] font-extrabold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                                        isActive
                                                            ? `${st.activeStyle} shadow-md scale-[1.02]`
                                                            : 'bg-slate-50 text-slate-500 border-slate-200/90 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {st.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </ModalBody>
                <ModalFooter className="flex justify-between items-center">
                    <p className="text-xs text-slate-400 font-medium">
                        Fields marked with <span className="text-rose-500">*</span> are mandatory
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="flat"
                            onPress={onClose}
                            className="font-bold text-slate-600 hover:bg-slate-100 px-5 rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white font-black shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/30 px-7 rounded-xl text-xs tracking-wide"
                            onPress={handleSubmit}
                            isLoading={loading}
                        >
                            Save Changes
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default EditStudentModal;
