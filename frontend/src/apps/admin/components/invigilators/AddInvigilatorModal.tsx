import React, { useState } from 'react';
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Input,
} from "@heroui/react";
import { Mail, User, Lock, UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { invigilatorService } from '../../services/invigilatorService';

interface AddInvigilatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AddInvigilatorModal: React.FC<AddInvigilatorModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        FullName: "",
        Email: "",
        Password: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => setIsVisible(!isVisible);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async () => {
        if (!formData.FullName || !formData.Email || !formData.Password) {
            toast.error("Please fill all required fields");
            return;
        }

        setIsLoading(true);
        try {
            await invigilatorService.create(formData);
            toast.success("Invigilator added successfully");
            setFormData({ FullName: "", Email: "", Password: "" });
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to add invigilator");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="md"
            backdrop="blur"
            classNames={{
                base: "bg-white rounded-3xl shadow-2xl border border-gray-100",
                backdrop: "bg-gray-900/40 backdrop-blur-sm",
                closeButton: "top-4 right-4 text-gray-400 hover:bg-gray-100 rounded-full p-2"
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 items-center pt-8 pb-2 px-8 text-center bg-gradient-to-b from-blue-50/50 to-transparent">
                            <div className="h-16 w-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-sm ring-4 ring-blue-50">
                                <UserPlus size={32} strokeWidth={2} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Add New Invigilator</h2>
                            <p className="text-sm font-medium text-gray-500 max-w-[280px]">
                                Create a new system account with invigilator permissions and access.
                            </p>
                        </ModalHeader>

                        <ModalBody className="px-8 py-6">
                            <div className="flex flex-col gap-5">
                                <div className="space-y-2">
                                    <label htmlFor="invigilator-name" className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Full Name</label>
                                    <Input
                                        id="invigilator-name"
                                        name="fullName"
                                        value={formData.FullName}
                                        onValueChange={(v) => handleChange("FullName", v)}
                                        placeholder="e.g. Sarah Connor"
                                        startContent={
                                            <div className="pointer-events-none flex items-center pr-2">
                                                <User size={18} className="text-gray-400" />
                                            </div>
                                        }
                                        variant="flat"
                                        classNames={{
                                            inputWrapper: "bg-gray-50 hover:bg-gray-100 focus-within:!bg-white !ring-0 !outline-none focus-within:!ring-0 !border-none !shadow-none rounded-xl h-12 transition-all",
                                            input: "text-gray-800 text-sm font-medium !outline-none !border-none !ring-0 placeholder:text-gray-400"
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="invigilator-email" className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Email Address</label>
                                    <Input
                                        id="invigilator-email"
                                        name="email"
                                        type="email"
                                        value={formData.Email}
                                        onValueChange={(v) => handleChange("Email", v)}
                                        placeholder="sarah.connor@college.edu"
                                        startContent={
                                            <div className="pointer-events-none flex items-center pr-2">
                                                <Mail size={18} className="text-gray-400" />
                                            </div>
                                        }
                                        autoComplete="email"
                                        variant="flat"
                                        classNames={{
                                            inputWrapper: "bg-gray-50 hover:bg-gray-100 focus-within:!bg-white !ring-0 !outline-none focus-within:!ring-0 !border-none !shadow-none rounded-xl h-12 transition-all",
                                            input: "text-gray-800 text-sm font-medium !outline-none !border-none !ring-0 placeholder:text-gray-400"
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="invigilator-password" className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">Initial Password</label>
                                    <Input
                                        id="invigilator-password"
                                        name="password"
                                        type={isVisible ? "text" : "password"}
                                        value={formData.Password}
                                        onValueChange={(v) => handleChange("Password", v)}
                                        placeholder="••••••••"
                                        startContent={
                                            <div className="pointer-events-none flex items-center pr-2">
                                                <Lock size={18} className="text-gray-400" />
                                            </div>
                                        }
                                        endContent={
                                            <button className="focus:outline-none" type="button" onClick={toggleVisibility}>
                                                {isVisible ? (
                                                    <EyeOff size={18} className="text-gray-400 cursor-pointer pointer-events-auto" />
                                                ) : (
                                                    <Eye size={18} className="text-gray-400 cursor-pointer pointer-events-auto" />
                                                )}
                                            </button>
                                        }
                                        autoComplete="new-password"
                                        variant="flat"
                                        classNames={{
                                            inputWrapper: "bg-gray-50 hover:bg-gray-100 focus-within:!bg-white !ring-0 !outline-none focus-within:!ring-0 !border-none !shadow-none rounded-xl h-12 transition-all",
                                            input: "text-gray-800 text-sm font-medium !outline-none !border-none !ring-0 placeholder:text-gray-400"
                                        }}
                                    />
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter className="flex flex-col gap-3 px-8 pb-8 pt-2">
                            <Button
                                className="w-full h-12 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 active:scale-[0.98] transition-all"
                                onPress={handleSubmit}
                                isLoading={isLoading}
                                startContent={!isLoading && <UserPlus size={18} />}
                            >
                                Confirm Addition
                            </Button>
                            <Button
                                variant="light"
                                className="w-full font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl h-10"
                                onPress={onClose}
                            >
                                Cancel
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default AddInvigilatorModal;
