
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
                <ModalHeader className="flex flex-col gap-1 items-center justify-center pt-8 pb-6 bg-gradient-to-b from-white to-gray-50  ">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 shadow-sm ring-4 ring-primary/5">
                        <User size={24} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900  tracking-tight">New Student</h2>
                    <p className="text-sm font-medium text-gray-400  text-center max-w-xs">
                        Create a profile for a new student by filling in their academic details below.
                    </p>
                </ModalHeader>
                <ModalBody>
                    <div className="p-6 space-y-8">

                        {/* Section 1: Personal Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 ">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Personal Information
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    startContent={<Hash className="text-gray-400" size={16} />}
                                    placeholder="Register Number (e.g. 21CS001)"
                                    value={formData.RegisterNumber}
                                    onValueChange={(v) => handleChange("RegisterNumber", v)}
                                    classNames={{
                                        inputWrapper: "h-12 bg-gray-50  border-0 shadow-none hover:bg-gray-100  transition-colors data-[hover=true]:bg-gray-100  group-data-[focus=true]:bg-white  group-data-[focus=true]:ring-2 ring-primary/20",
                                        input: "text-small",
                                    }}
                                />
                                <Input
                                    startContent={<User className="text-gray-400" size={16} />}
                                    placeholder="Full Name"
                                    value={formData.FullName}
                                    onValueChange={(v) => handleChange("FullName", v)}
                                    classNames={{
                                        inputWrapper: "h-12 bg-gray-50  border-0 shadow-none hover:bg-gray-100  transition-colors data-[hover=true]:bg-gray-100  group-data-[focus=true]:bg-white  group-data-[focus=true]:ring-2 ring-primary/20",
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
                                        inputWrapper: "h-12 bg-gray-50  border-0 shadow-none hover:bg-gray-100  transition-colors data-[hover=true]:bg-gray-100  group-data-[focus=true]:bg-white  group-data-[focus=true]:ring-2 ring-primary/20",
                                        input: "text-small",
                                    }}
                                />
                            </div>
                        </div>

                        <div className="h-px bg-gray-100 " />

                        {/* Section 2: Academic Info */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 ">
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
                                        trigger: "h-12 bg-gray-50  border-0 shadow-none hover:bg-gray-100  transition-colors data-[hover=true]:bg-gray-100 ",
                                        popoverContent: "bg-white  border border-gray-100  shadow-xl",
                                        value: "text-small group-data-[has-value=true]:text-gray-900 "
                                    }}
                                >
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.DepartmentID} value={dept.DepartmentID} textValue={dept.DepartmentCode}>
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
                                        trigger: "h-12 bg-gray-50  border-0 shadow-none hover:bg-gray-100  transition-colors data-[hover=true]:bg-gray-100 ",
                                        popoverContent: "bg-white  border border-gray-100  shadow-xl",
                                        value: "text-small group-data-[has-value=true]:text-gray-900 "
                                    }}
                                >
                                    {programs.map((prog) => (
                                        <SelectItem key={prog.ProgramID} value={prog.ProgramID} textValue={prog.ProgramName}>
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
                                        trigger: "h-12 bg-gray-50  border-0 shadow-none hover:bg-gray-100  transition-colors data-[hover=true]:bg-gray-100 ",
                                        popoverContent: "bg-white  border border-gray-100  shadow-xl",
                                    }}
                                >
                                    {filteredSemesters.map((sem) => (
                                        <SelectItem key={sem.SemesterID} value={sem.SemesterID} textValue={sem.SemesterNumber.toString()}>
                                            Semester {sem.SemesterNumber}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <Input
                                    startContent={<Calendar className="text-gray-400" size={16} />}
                                    placeholder="Batch Year (e.g. 2024)"
                                    type="number"
                                    value={formData.BatchYear}
                                    onValueChange={(v) => handleChange("BatchYear", v)}
                                    classNames={{
                                        inputWrapper: "h-12 bg-gray-50  border-0 shadow-none hover:bg-gray-100  transition-colors data-[hover=true]:bg-gray-100  group-data-[focus=true]:bg-white  group-data-[focus=true]:ring-2 ring-primary/20",
                                        input: "text-small",
                                    }}
                                />
                            </div>
                        </div>

                    </div>
                </ModalBody>
                <ModalFooter className="flex justify-between items-center bg-gray-50/50  p-6">
                    <div className="text-xs text-gray-400 font-medium">
                        * All fields are required
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="light"
                            onPress={onClose}
                            className="font-semibold text-gray-500 hover:text-gray-700  "
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-black  text-white  font-bold shadow-lg shadow-black/20  px-8"
                            onPress={handleSubmit}
                            isLoading={loading}
                        >
                            Create Student
                        </Button>
                    </div>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
