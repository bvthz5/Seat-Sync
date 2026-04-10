
import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { User, Hash, GraduationCap, Mail } from 'lucide-react';
import api from "../../../../services/api";

interface EditStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    student: any;
}

interface ProgramWithDuration {
    ProgramID: number;
    ProgramCode: string;
    ProgramName: string;
    DurationYears?: number;
    TotalSemesters?: number;
    DepartmentID?: number;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    student
}) => {
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [programs, setPrograms] = useState<ProgramWithDuration[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateFields = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.FullName?.trim()) {
            newErrors.FullName = "Full Name is required";
        } else if (formData.FullName.trim().length < 2) {
            newErrors.FullName = "Full Name must be at least 2 characters";
        } else if (formData.FullName.trim().length > 100) {
            newErrors.FullName = "Full Name must not exceed 100 characters";
        } else if (!/^[a-zA-Z\s\-']+$/.test(formData.FullName.trim())) {
            newErrors.FullName = "Full Name can only contain letters, spaces, hyphens, and apostrophes";
        }

        if (!formData.Email?.trim()) {
            newErrors.Email = "College Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
            newErrors.Email = "Please enter a valid email address";
        } else if (!formData.Email.toLowerCase().endsWith("@sjcetpalai.ac.in")) {
            newErrors.Email = "Email must be from the college domain (sjcetpalai.ac.in)";
        }

        if (!formData.RegisterNumber?.trim()) {
            newErrors.RegisterNumber = "Register Number is required";
        } else if (formData.RegisterNumber.trim().length < 4) {
            newErrors.RegisterNumber = "Register Number must be at least 4 characters";
        } else if (formData.RegisterNumber.trim().length > 50) {
            newErrors.RegisterNumber = "Register Number must not exceed 50 characters";
        } else if (!/^[A-Z0-9\-_]+$/i.test(formData.RegisterNumber.trim())) {
            newErrors.RegisterNumber = "Register Number can only contain letters, numbers, hyphens, and underscores";
        }

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

        if (!formData.DepartmentID) {
            newErrors.DepartmentID = "Department is required";
        }

        if (!formData.ProgramID) {
            newErrors.ProgramID = "Program is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const [formData, setFormData] = useState({
        RegisterNumber: "",
        FullName: "",
        Email: "",
        DepartmentID: "",
        ProgramID: "",
        BatchYear: "",
    });

    useEffect(() => {
        if (isOpen) {
            fetchMasterDataAndSetForm();
        }
    }, [isOpen, student]);

    const fetchMasterDataAndSetForm = async () => {
        try {
            const response = await api.get('/students/meta/create-options');
            const fetchedDepts = response.data.departments || [];
            const fetchedProgs = response.data.programs || [];
            
            setDepartments(fetchedDepts);
            setPrograms(fetchedProgs);

            // Set form data after fetching master data
            if (student) {
                setFormData({
                    RegisterNumber: student.RegisterNumber || "",
                    FullName: student.User?.FullName || "",
                    Email: student.User?.Email || "",
                    DepartmentID: student.DepartmentID?.toString() || "",
                    ProgramID: student.ProgramID?.toString() || "",
                    BatchYear: student.BatchYear?.toString() || "",
                });
            }
        } catch (error) {
            console.error("Failed to fetch master data", error);
            toast.error("Could not load form data options");
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
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
            await api.put(`/students/${student.StudentID}`, {
                RegisterNumber: formData.RegisterNumber.trim().toUpperCase(),
                FullName: formData.FullName.trim(),
                Email: formData.Email.trim().toLowerCase(),
                DepartmentID: parseInt(formData.DepartmentID),
                ProgramID: parseInt(formData.ProgramID),
                BatchYear: parseInt(formData.BatchYear),
            });
            toast.success("Student updated successfully");
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
            size="2xl"
            classNames={{
                base: "bg-white border border-white/20 shadow-2xl rounded-3xl",
                header: "p-0 border-none",
                body: "p-0",
                footer: "border-t border-gray-100 py-4 px-7",
                closeButton: "hover:bg-white/20 active:bg-white/30 text-white p-2 rounded-full transition-colors right-4 top-4 z-50"
            }}
            motionProps={{
                variants: {
                    enter: {
                        y: 0,
                        opacity: 1,
                        transition: { duration: 0.3, ease: "easeOut" },
                    },
                    exit: {
                        y: 20,
                        opacity: 0,
                        transition: { duration: 0.2, ease: "easeIn" },
                    },
                }
            }}
        >
            <ModalContent>
                <ModalHeader>
                    <div className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-900 rounded-t-3xl px-7 py-6">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                <GraduationCap size={22} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Edit Student</h2>
                                <p className="text-sm text-blue-200/60 font-normal mt-0.5">Update student information</p>
                            </div>
                        </div>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="px-7 py-6 space-y-6">
                        {/* PERSONAL INFORMATION */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Personal Information</h3>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label htmlFor="full-name" className="text-sm font-semibold text-gray-700 ml-1">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        id="full-name"
                                        autoComplete="name"
                                        startContent={<User className="text-gray-400" size={15} />}
                                        placeholder="John Doe"
                                        value={formData.FullName}
                                        onValueChange={(v) => handleChange("FullName", v)}
                                        isInvalid={!!errors.FullName}
                                        errorMessage={errors.FullName}
                                        classNames={{
                                            inputWrapper: `h-12 bg-gray-50/80 border-1 ${errors.FullName ? 'border-red-500 bg-red-50/30' : 'border-gray-200'} hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all`,
                                            input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                            errorMessage: "text-red-500 text-xs font-medium mt-1"
                                        }}
                                        variant="bordered"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="college-email" className="text-sm font-semibold text-gray-700 ml-1">
                                        College Email <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        id="college-email"
                                        autoComplete="email"
                                        type="email"
                                        startContent={<Mail className="text-gray-400" size={15} />}
                                        placeholder="john@sjcetpalai.ac.in"
                                        value={formData.Email}
                                        onValueChange={(v) => handleChange("Email", v)}
                                        isInvalid={!!errors.Email}
                                        errorMessage={errors.Email}
                                        classNames={{
                                            inputWrapper: `h-12 bg-gray-50/80 border-1 ${errors.Email ? 'border-red-500 bg-red-50/30' : 'border-gray-200'} hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all`,
                                            input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                            errorMessage: "text-red-500 text-xs font-medium mt-1"
                                        }}
                                        variant="bordered"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ACADEMIC INFORMATION */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Academic Information</h3>
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label htmlFor="register-number" className="text-sm font-semibold text-gray-700 ml-1">
                                            Register Number <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="register-number"
                                            autoComplete="off"
                                            startContent={<Hash className="text-gray-400" size={15} />}
                                            placeholder="SJC24MCA001"
                                            value={formData.RegisterNumber}
                                            onValueChange={(v) => handleChange("RegisterNumber", v)}
                                            isInvalid={!!errors.RegisterNumber}
                                            errorMessage={errors.RegisterNumber}
                                            classNames={{
                                                inputWrapper: `h-12 bg-gray-50/80 border-1 ${errors.RegisterNumber ? 'border-red-500 bg-red-50/30' : 'border-gray-200'} hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all`,
                                                input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                                errorMessage: "text-red-500 text-xs font-medium mt-1"
                                            }}
                                            variant="bordered"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="batch-year" className="text-sm font-semibold text-gray-700 ml-1">
                                            Batch Year <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            id="batch-year"
                                            type="number"
                                            placeholder="2026"
                                            value={formData.BatchYear}
                                            onValueChange={(v) => handleChange("BatchYear", v)}
                                            isInvalid={!!errors.BatchYear}
                                            errorMessage={errors.BatchYear}
                                            classNames={{
                                                inputWrapper: `h-12 bg-gray-50/80 border-1 ${errors.BatchYear ? 'border-red-500 bg-red-50/30' : 'border-gray-200'} hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all`,
                                                input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                                errorMessage: "text-red-500 text-xs font-medium mt-1"
                                            }}
                                            variant="bordered"
                                        />
                                        <p className="text-xs text-gray-400 ml-1">Year when student joined the program</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label htmlFor="department" className="text-sm font-semibold text-gray-700 ml-1">
                                            Department <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="department"
                                            value={formData.DepartmentID}
                                            onChange={(e) => handleChange("DepartmentID", e.target.value)}
                                            className={`w-full h-12 bg-gray-50/80 border rounded-xl text-sm px-3 focus:ring-1 outline-none transition-all ${errors.DepartmentID ? 'border-red-500 bg-red-50/30 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500'}`}
                                        >
                                            <option value="">Select Department...</option>
                                            {departments.map(dept => (
                                                <option key={dept.DepartmentID} value={dept.DepartmentID}>
                                                    {dept.DepartmentCode} - {dept.DepartmentName}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.DepartmentID && <p className="text-red-500 text-xs font-medium mt-1">{errors.DepartmentID}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="program" className="text-sm font-semibold text-gray-700 ml-1">
                                            Program <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="program"
                                            value={formData.ProgramID}
                                            onChange={(e) => handleChange("ProgramID", e.target.value)}
                                            className={`w-full h-12 bg-gray-50/80 border rounded-xl text-sm px-3 focus:ring-1 outline-none transition-all ${errors.ProgramID ? 'border-red-500 bg-red-50/30 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-500'}`}
                                        >
                                            <option value="">Select Program...</option>
                                            {programs
                                                .filter(prog => {
                                                    // Always show the currently selected program
                                                    if (formData.ProgramID && prog.ProgramID?.toString() === formData.ProgramID.toString()) {
                                                        return true;
                                                    }
                                                    // Also show programs from selected department or all if no department selected
                                                    if (!formData.DepartmentID) return true;
                                                    return prog.DepartmentID?.toString() === formData.DepartmentID.toString();
                                                })
                                                .map(prog => (
                                                    <option key={prog.ProgramID} value={prog.ProgramID}>
                                                        {prog.ProgramName}
                                                    </option>
                                                ))}
                                        </select>
                                        {errors.ProgramID && <p className="text-red-500 text-xs font-medium mt-1">{errors.ProgramID}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter className="flex justify-end items-center">
                    <div className="flex gap-2.5">
                        <Button
                            variant="bordered"
                            onPress={onClose}
                            className="font-semibold text-gray-600 border-gray-200 hover:bg-gray-50 px-5"
                            radius="lg"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 px-7"
                            onPress={handleSubmit}
                            isLoading={loading}
                            radius="lg"
                        >
                            Update Student
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
