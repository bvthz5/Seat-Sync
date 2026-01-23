
import React, { useState, useEffect } from "react";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
    Select,
    SelectItem,
} from "@heroui/react";
import { toast } from "react-hot-toast";
import { User, Mail, Hash, Building2, GraduationCap, Calendar, BookOpen } from 'lucide-react';
import api from "../../../../services/api";

interface EditStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    student: any; // Using any for now to avoid strict type issues, but ideally should be Student interface
}

interface Department {
    DepartmentID: number;
    DepartmentCode: string;
    DepartmentName: string;
}

interface Program {
    ProgramID: number;
    ProgramName: string;
}

interface Semester {
    SemesterID: number;
    SemesterNumber: number;
    ProgramID: number;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    student
}) => {
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);

    const [formData, setFormData] = useState({
        RegisterNumber: "",
        FullName: "",
        Email: "",
        DepartmentID: "",
        ProgramID: "",
        SemesterID: "",
        BatchYear: "",
    });

    useEffect(() => {
        if (isOpen) {
            fetchMasterData();
            if (student) {
                setFormData({
                    RegisterNumber: student.RegisterNumber || "",
                    FullName: student.User?.FullName || "",
                    Email: student.User?.Email || "",
                    DepartmentID: student.DepartmentID?.toString() || "",
                    ProgramID: student.ProgramID?.toString() || "",
                    SemesterID: student.SemesterID?.toString() || "",
                    BatchYear: student.BatchYear?.toString() || "",
                });
            }
        }
    }, [isOpen, student]);

    const fetchMasterData = async () => {
        try {
            const response = await api.get('/students/meta/create-options');
            setDepartments(response.data.departments);
            setPrograms(response.data.programs);
            setSemesters(response.data.semesters);
        } catch (error) {
            console.error("Failed to fetch master data", error);
            toast.error("Could not load form data options");
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        // Basic Validation
        if (!formData.RegisterNumber || !formData.FullName || !formData.Email || !formData.DepartmentID || !formData.ProgramID || !formData.SemesterID || !formData.BatchYear) {
            toast.error("Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            await api.put(`/students/${student.StudentID}`, {
                ...formData,
                DepartmentID: parseInt(formData.DepartmentID),
                ProgramID: parseInt(formData.ProgramID),
                SemesterID: parseInt(formData.SemesterID),
                BatchYear: parseInt(formData.BatchYear)
            });
            toast.success("Student updated successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to update student");
        } finally {
            setLoading(false);
        }
    };

    // Filter semesters based on program
    const filteredSemesters = formData.ProgramID
        ? semesters.filter(s => s.ProgramID === parseInt(formData.ProgramID))
        : semesters;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            placement="center"
            backdrop="blur"
            size="2xl"
            classNames={{
                base: "bg-white dark:bg-zinc-950 border border-white/20 dark:border-zinc-800 shadow-2xl rounded-3xl",
                header: "border-b border-gray-100 dark:border-zinc-900 p-6 pb-4",
                body: "p-0",
                footer: "border-t border-gray-100 dark:border-zinc-900 p-6 pt-4 bg-gray-50/50 dark:bg-zinc-900/20",
                closeButton: "hover:bg-gray-100 dark:hover:bg-zinc-800 active:bg-gray-200 dark:active:bg-zinc-700 p-2 rounded-full transition-colors right-4 top-4"
            }}
            motionProps={{
                variants: {
                    enter: { y: 0, opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
                    exit: { y: 20, opacity: 0, transition: { duration: 0.2, ease: "easeIn" } },
                }
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1 items-center justify-center pt-8 pb-6 bg-gradient-to-b from-white to-gray-50 dark:from-zinc-950 dark:to-zinc-900/50">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-sm ring-4 ring-primary/5">
                        <User size={24} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Edit Student</h2>
                    <p className="text-sm font-medium text-gray-400 dark:text-gray-500 text-center max-w-xs">
                        Update {formData.FullName || "student"}'s profile details below.
                    </p>
                </ModalHeader>
                <ModalBody>
                    <div className="p-6 space-y-8">
                        {/* Section 1: Personal Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Personal Information
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    startContent={<Hash className="text-gray-400" size={16} />}
                                    placeholder="Register Number"
                                    value={formData.RegisterNumber}
                                    onValueChange={(v) => handleChange("RegisterNumber", v)}
                                    classNames={{
                                        inputWrapper: "h-12 bg-gray-50 dark:bg-zinc-900 border-0 shadow-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800 group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-black group-data-[focus=true]:ring-2 ring-primary/20",
                                        input: "text-small",
                                    }}
                                />
                                <Input
                                    startContent={<User className="text-gray-400" size={16} />}
                                    placeholder="Full Name"
                                    value={formData.FullName}
                                    onValueChange={(v) => handleChange("FullName", v)}
                                    classNames={{
                                        inputWrapper: "h-12 bg-gray-50 dark:bg-zinc-900 border-0 shadow-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800 group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-black group-data-[focus=true]:ring-2 ring-primary/20",
                                        input: "text-small",
                                    }}
                                />
                                <Input
                                    startContent={<Mail className="text-gray-400" size={16} />}
                                    placeholder="Email Address"
                                    type="email"
                                    className="md:col-span-2"
                                    value={formData.Email}
                                    onValueChange={(v) => handleChange("Email", v)}
                                    classNames={{
                                        inputWrapper: "h-12 bg-gray-50 dark:bg-zinc-900 border-0 shadow-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800 group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-black group-data-[focus=true]:ring-2 ring-primary/20",
                                        input: "text-small",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 dark:bg-zinc-900" />

                        {/* Section 2: Academic Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Academic Details
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    startContent={<Building2 className="text-gray-400" size={16} />}
                                    placeholder="Select Department"
                                    selectedKeys={formData.DepartmentID ? [formData.DepartmentID] : []}
                                    onChange={(e) => handleChange("DepartmentID", e.target.value)}
                                    aria-label="Department"
                                    classNames={{
                                        trigger: "h-12 bg-gray-50 dark:bg-zinc-900 border-0 shadow-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800",
                                        popoverContent: "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 shadow-xl",
                                        value: "text-small group-data-[has-value=true]:text-gray-900 dark:group-data-[has-value=true]:text-gray-100",
                                        selectorIcon: "hidden"
                                    }}
                                >
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.DepartmentID} textValue={dept.DepartmentCode}>
                                            {dept.DepartmentName}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <Select
                                    startContent={<GraduationCap className="text-gray-400" size={16} />}
                                    placeholder="Select Program"
                                    selectedKeys={formData.ProgramID ? [formData.ProgramID] : []}
                                    onChange={(e) => handleChange("ProgramID", e.target.value)}
                                    aria-label="Program"
                                    classNames={{
                                        trigger: "h-12 bg-gray-50 dark:bg-zinc-900 border-0 shadow-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800",
                                        popoverContent: "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 shadow-xl",
                                        value: "text-small group-data-[has-value=true]:text-gray-900 dark:group-data-[has-value=true]:text-gray-100",
                                        selectorIcon: "hidden"
                                    }}
                                >
                                    {programs.map((prog) => (
                                        <SelectItem key={prog.ProgramID} textValue={prog.ProgramName}>
                                            {prog.ProgramName}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <Select
                                    startContent={<BookOpen className="text-gray-400" size={16} />}
                                    placeholder="Select Semester"
                                    selectedKeys={formData.SemesterID ? [formData.SemesterID] : []}
                                    onChange={(e) => handleChange("SemesterID", e.target.value)}
                                    isDisabled={!formData.ProgramID}
                                    aria-label="Semester"
                                    classNames={{
                                        trigger: "h-12 bg-gray-50 dark:bg-zinc-900 border-0 shadow-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800",
                                        popoverContent: "bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 shadow-xl",
                                        selectorIcon: "hidden"
                                    }}
                                >
                                    {filteredSemesters.map((sem) => (
                                        <SelectItem key={sem.SemesterID} textValue={sem.SemesterNumber.toString()}>
                                            Semester {sem.SemesterNumber}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <Input
                                    startContent={<Calendar className="text-gray-400" size={16} />}
                                    placeholder="Batch Year"
                                    type="number"
                                    value={formData.BatchYear}
                                    onValueChange={(v) => handleChange("BatchYear", v)}
                                    classNames={{
                                        inputWrapper: "h-12 bg-gray-50 dark:bg-zinc-900 border-0 shadow-none hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors data-[hover=true]:bg-gray-100 dark:data-[hover=true]:bg-zinc-800 group-data-[focus=true]:bg-white dark:group-data-[focus=true]:bg-black group-data-[focus=true]:ring-2 ring-primary/20",
                                        input: "text-small",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter className="flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50 p-6">
                    <div className="text-xs text-gray-400 font-medium">
                        * All fields are required
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="light"
                            onPress={onClose}
                            className="font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-black dark:bg-white text-white dark:text-black font-bold shadow-lg shadow-black/20 dark:shadow-white/20 px-8"
                            onPress={handleSubmit}
                            isLoading={loading}
                        >
                            Update Student
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
