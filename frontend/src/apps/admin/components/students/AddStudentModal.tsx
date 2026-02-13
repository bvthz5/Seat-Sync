
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
import { User, Hash, GraduationCap, Info } from 'lucide-react';
import api from "../../../../services/api";

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        RegisterNumber: "",
        FullName: "",
    });

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.RegisterNumber || !formData.FullName) {
            toast.error("Please fill all fields");
            return;
        }

        setLoading(true);
        try {
            await api.post("/students", {
                RegisterNumber: formData.RegisterNumber.trim(),
                FullName: formData.FullName.trim(),
            });
            toast.success("Student added successfully");
            onSuccess();
            onClose();
            setFormData({ RegisterNumber: "", FullName: "" });
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
                                <p className="text-sm text-blue-200/60 font-normal mt-0.5">Academic details will be extracted from the Register Number</p>
                            </div>
                        </div>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="px-7 py-6 space-y-5">

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="register-number" className="text-sm font-semibold text-gray-700 ml-1">Register Number</label>
                                <Input
                                    id="register-number"
                                    name="registerNumber"
                                    autoComplete="off"
                                    startContent={<Hash className="text-gray-400" size={15} />}
                                    placeholder="e.g. SJC24MCA2001"
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
                                <label htmlFor="student-name" className="text-sm font-semibold text-gray-700 ml-1">Student Name</label>
                                <Input
                                    id="student-name"
                                    name="fullName"
                                    autoComplete="name"
                                    startContent={<User className="text-gray-400" size={15} />}
                                    placeholder="e.g. John Doe"
                                    value={formData.FullName}
                                    onValueChange={(v) => handleChange("FullName", v)}
                                    classNames={{
                                        inputWrapper: "h-12 bg-gray-50/80 border-1 border-gray-200 hover:border-blue-300 focus-within:!border-blue-500 focus-within:bg-white focus-within:shadow-sm rounded-xl transition-all",
                                        input: "text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0 placeholder:text-gray-400",
                                    }}
                                    variant="bordered"
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50/60 rounded-xl p-4 flex gap-3 border border-blue-100">
                            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                            <div className="text-xs text-blue-700/80 leading-relaxed">
                                <span className="font-semibold text-blue-800">Auto-detection:</span> Department, Program, Batch Year, and Semester are automatically extracted from the Register Number format — same as Excel import.
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
