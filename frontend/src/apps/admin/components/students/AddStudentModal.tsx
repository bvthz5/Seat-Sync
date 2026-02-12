
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

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
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
        BatchYear: new Date().getFullYear().toString(),
    });

    useEffect(() => {
        if (isOpen) {
            fetchMasterData();
        }
    }, [isOpen]);

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
            await api.post("/students", {
                ...formData,
                DepartmentID: parseInt(formData.DepartmentID),
                ProgramID: parseInt(formData.ProgramID),
                SemesterID: parseInt(formData.SemesterID),
                BatchYear: parseInt(formData.BatchYear)
            });
            toast.success("Student added successfully");
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                RegisterNumber: "",
                FullName: "",
                Email: "",
                DepartmentID: "",
                ProgramID: "",
                SemesterID: "",
                BatchYear: new Date().getFullYear().toString(),
            });
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to add student");
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
                base: "bg-white  border border-white/20  shadow-2xl rounded-3xl",
                header: "border-b border-gray-100  p-6 pb-4",
                body: "p-0", // Removing default padding for custom layout
                footer: "border-t border-gray-100  p-6 pt-4 bg-gray-50/50 ",
                closeButton: "hover:bg-gray-100  active:bg-gray-200  p-2 rounded-full transition-colors right-4 top-4"
            }}
            motionProps={{
                variants: {
                    enter: {
                        y: 0,
                        opacity: 1,
                        transition: {
                            duration: 0.3,
                            ease: "easeOut",
                        },
                    },
                    exit: {
                        y: 20,
                        opacity: 0,
                        transition: {
                            duration: 0.2,
                            ease: "easeIn",
                        },
                    },
                }
            }}
        >
            <ModalContent>
                <ModalHeader className="p-0 border-none">
                    <div className="w-full bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-900 rounded-t-3xl px-7 py-6">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                                <User size={22} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Add New Student</h2>
                                <p className="text-sm text-blue-200/60 font-normal mt-0.5">Fill in the details to create a student profile</p>
                            </div>
                        </div>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="p-6 space-y-6">

                        {/* Section 1: Personal Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <User size={14} className="text-blue-600" />
                                </div>
                                <span className="text-sm font-bold text-gray-800 tracking-tight">Personal Information</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <Input
                                    startContent={<Hash className="text-gray-400" size={15} />}
                                    placeholder="Register Number (e.g. 21CS001)"
                                    value={formData.RegisterNumber}
                                    onValueChange={(v) => handleChange("RegisterNumber", v)}
                                    classNames={{
                                        inputWrapper: "h-11 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                        input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                    }}
                                />
                                <Input
                                    startContent={<User className="text-gray-400" size={15} />}
                                    placeholder="Full Name"
                                    value={formData.FullName}
                                    onValueChange={(v) => handleChange("FullName", v)}
                                    classNames={{
                                        inputWrapper: "h-11 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                        input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                    }}
                                />
                                <Input
                                    startContent={<Mail className="text-gray-400" size={15} />}
                                    placeholder="Email Address"
                                    type="email"
                                    className="md:col-span-2"
                                    value={formData.Email}
                                    onValueChange={(v) => handleChange("Email", v)}
                                    classNames={{
                                        inputWrapper: "h-11 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                        input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                        {/* Section 2: Academic Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <GraduationCap size={14} className="text-blue-600" />
                                </div>
                                <span className="text-sm font-bold text-gray-800 tracking-tight">Academic Details</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <Select
                                    startContent={<Building2 className="text-gray-400" size={15} />}
                                    placeholder="Select Department"
                                    selectedKeys={formData.DepartmentID ? [formData.DepartmentID] : []}
                                    onChange={(e) => handleChange("DepartmentID", e.target.value)}
                                    aria-label="Department"
                                    classNames={{
                                        trigger: "h-11 bg-gray-50/80 border-1 border-gray-200 data-[hover=true]:border-blue-300 data-[focus=true]:border-blue-500 rounded-xl transition-all relative",
                                        popoverContent: "bg-white border border-gray-100 shadow-xl rounded-xl",
                                        value: "text-sm group-data-[has-value=true]:text-gray-900",
                                        selectorIcon: "absolute right-3"
                                    }}
                                >
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.DepartmentID} textValue={dept.DepartmentCode}>
                                            {dept.DepartmentName}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <Select
                                    startContent={<GraduationCap className="text-gray-400" size={15} />}
                                    placeholder="Select Program"
                                    selectedKeys={formData.ProgramID ? [formData.ProgramID] : []}
                                    onChange={(e) => handleChange("ProgramID", e.target.value)}
                                    aria-label="Program"
                                    classNames={{
                                        trigger: "h-11 bg-gray-50/80 border-1 border-gray-200 data-[hover=true]:border-blue-300 data-[focus=true]:border-blue-500 rounded-xl transition-all relative",
                                        popoverContent: "bg-white border border-gray-100 shadow-xl rounded-xl",
                                        value: "text-sm group-data-[has-value=true]:text-gray-900",
                                        selectorIcon: "absolute right-3"
                                    }}
                                >
                                    {programs.map((prog) => (
                                        <SelectItem key={prog.ProgramID} textValue={prog.ProgramName}>
                                            {prog.ProgramName}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <Select
                                    startContent={<BookOpen className="text-gray-400" size={15} />}
                                    placeholder="Select Semester"
                                    selectedKeys={formData.SemesterID ? [formData.SemesterID] : []}
                                    onChange={(e) => handleChange("SemesterID", e.target.value)}
                                    isDisabled={!formData.ProgramID}
                                    aria-label="Semester"
                                    classNames={{
                                        trigger: "h-11 bg-gray-50/80 border-1 border-gray-200 data-[hover=true]:border-blue-300 data-[focus=true]:border-blue-500 rounded-xl transition-all relative",
                                        popoverContent: "bg-white border border-gray-100 shadow-xl rounded-xl",
                                        selectorIcon: "absolute right-3"
                                    }}
                                >
                                    {filteredSemesters.map((sem) => (
                                        <SelectItem key={sem.SemesterID} textValue={sem.SemesterNumber.toString()}>
                                            Semester {sem.SemesterNumber}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <Input
                                    startContent={<Calendar className="text-gray-400" size={15} />}
                                    placeholder="Batch Year (e.g. 2024)"
                                    type="number"
                                    value={formData.BatchYear}
                                    onValueChange={(v) => handleChange("BatchYear", v)}
                                    classNames={{
                                        inputWrapper: "h-11 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                        input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                    }}
                                />
                            </div>
                        </div>

                    </div>
                </ModalBody>
                <ModalFooter className="flex justify-between items-center border-t border-gray-100 px-7 py-4">
                    <p className="text-[11px] text-gray-400 font-medium">* All fields are required</p>
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
                            Create Student
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
