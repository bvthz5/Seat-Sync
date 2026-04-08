
import React, { useState } from "react";
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

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ProgramWithDuration {
    ProgramID: number;
    ProgramCode: string;
    ProgramName: string;
    DurationYears?: number;
    TotalSemesters?: number;
    DepartmentID?: number;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);
    const [programs, setPrograms] = useState<ProgramWithDuration[]>([]);

    const [formData, setFormData] = useState({
        RegisterNumber: "",
        FullName: "",
        Email: "",
        DepartmentID: "",
        ProgramID: "",
        BatchYear: "",
    });

    React.useEffect(() => {
        if (isOpen) {
            api.get('/students/meta/create-options').then(res => {
                const d = res.data;
                setDepartments(d.departments || []);
                setPrograms(d.programs || []);
            }).catch(err => console.error('Failed to load create options', err));
        }
    }, [isOpen]);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.RegisterNumber || !formData.FullName) {
            toast.error("Register Number and Full Name are required");
            return;
        }

        if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
            toast.error("Please enter a valid email address");
            return;
        }

        setLoading(true);
        try {
            await api.post("/students", {
                RegisterNumber: formData.RegisterNumber.trim(),
                FullName: formData.FullName.trim(),
                Email: formData.Email?.trim() || undefined,
                DepartmentID: formData.DepartmentID || undefined,
                ProgramID: formData.ProgramID || undefined,
                BatchYear: formData.BatchYear ? parseInt(formData.BatchYear) : undefined,
            });
            toast.success("Student created successfully" + (formData.Email ? " - Credentials sent to email" : ""));
            onSuccess();
            onClose();
            setFormData({ RegisterNumber: "", FullName: "", Email: "", DepartmentID: "", ProgramID: "", BatchYear: "" });
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to add student");
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
            size="md"
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
                                <h2 className="text-xl font-bold text-white tracking-tight">Add New Student</h2>
                                <p className="text-sm text-blue-200/60 font-normal mt-0.5">Auto-generated password will be sent to the college email</p>
                            </div>
                        </div>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="px-7 py-6 space-y-6">
                        {/* PERSONAL INFORMATION */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Personal Information</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="full-name" className="text-sm font-semibold text-gray-700 ml-1">Full Name <span className="text-red-500">*</span></label>
                                    <Input
                                        id="full-name"
                                        autoComplete="name"
                                        startContent={<User className="text-gray-400" size={15} />}
                                        placeholder="John Doe"
                                        value={formData.FullName}
                                        onValueChange={(v) => handleChange("FullName", v)}
                                        classNames={{
                                            inputWrapper: "h-12 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                            input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                        }}
                                        variant="bordered"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label htmlFor="college-email" className="text-sm font-semibold text-gray-700 ml-1">College Email <span className="text-green-500 text-xs font-normal">(Credentials will be sent)</span></label>
                                    <Input
                                        id="college-email"
                                        autoComplete="email"
                                        type="email"
                                        startContent={<Mail className="text-gray-400" size={15} />}
                                        placeholder="john@college.edu"
                                        value={formData.Email}
                                        onValueChange={(v) => handleChange("Email", v)}
                                        classNames={{
                                            inputWrapper: "h-12 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                            input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                        }}
                                        variant="bordered"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ACADEMIC INFORMATION */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Academic Information</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="register-number" className="text-sm font-semibold text-gray-700 ml-1">Register Number <span className="text-red-500">*</span></label>
                                        <Input
                                            id="register-number"
                                            autoComplete="off"
                                            startContent={<Hash className="text-gray-400" size={15} />}
                                            placeholder="SJC24MCA..."
                                            value={formData.RegisterNumber}
                                            onValueChange={(v) => handleChange("RegisterNumber", v)}
                                            classNames={{
                                                inputWrapper: "h-12 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                                input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                            }}
                                            variant="bordered"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="batch-year" className="text-sm font-semibold text-gray-700 ml-1">Batch Year (Year Joined)</label>
                                        <Input
                                            id="batch-year"
                                            type="number"
                                            placeholder="2026"
                                            value={formData.BatchYear}
                                            onValueChange={(v) => handleChange("BatchYear", v)}
                                            classNames={{
                                                inputWrapper: "h-12 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                                input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                            }}
                                            variant="bordered"
                                        />
                                        <p className="text-xs text-gray-400 ml-1">Enter the year you joined the program.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label htmlFor="department" className="text-sm font-semibold text-gray-700 ml-1">Department</label>
                                        <select
                                            id="department"
                                            value={formData.DepartmentID}
                                            onChange={(e) => handleChange("DepartmentID", e.target.value)}
                                            className="w-full h-12 bg-gray-50/80 border border-gray-200 rounded-xl text-sm px-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                        >
                                            <option value="">Select Department...</option>
                                            {departments.map(dept => (
                                                <option key={dept.DepartmentID} value={dept.DepartmentID}>{dept.DepartmentCode}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="program" className="text-sm font-semibold text-gray-700 ml-1">Program</label>
                                        <select
                                            id="program"
                                            value={formData.ProgramID}
                                            onChange={(e) => handleChange("ProgramID", e.target.value)}
                                            className="w-full h-12 bg-gray-50/80 border border-gray-200 rounded-xl text-sm px-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                        >
                                            <option value="">Select Program...</option>
                                            {programs
                                                .filter(prog => !formData.DepartmentID || prog.DepartmentID?.toString() === formData.DepartmentID.toString())
                                                .map(prog => (
                                                    <option key={prog.ProgramID} value={prog.ProgramID}>{prog.ProgramName}</option>
                                                ))}
                                        </select>
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
                            Add Student
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
