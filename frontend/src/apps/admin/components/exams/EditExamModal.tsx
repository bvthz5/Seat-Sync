import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Select, SelectItem } from "@heroui/react";
import { ExamService } from '../../services/examService';
import { toast } from 'react-hot-toast';
import { Pencil } from 'lucide-react';

interface EditExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    exam: any;
}

const EditExamModal = ({ isOpen, onClose, onSuccess, exam }: EditExamModalProps) => {
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        ExamName: '',
        ExamDate: '',
        Session: '',
        Duration: '',
        SubjectID: ''
    });

    useEffect(() => {
        if (isOpen && exam) {
            setFormData({
                ExamName: exam.ExamName,
                ExamDate: exam.ExamDate ? exam.ExamDate.split('T')[0] : '',
                Session: exam.Session,
                Duration: String(exam.Duration),
                SubjectID: String(exam.SubjectID)
            });
        }
    }, [isOpen, exam]);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.ExamName || !formData.ExamDate || !formData.Duration) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                Duration: parseInt(formData.Duration),
                SubjectID: parseInt(formData.SubjectID)
            };

            await ExamService.update(exam.ExamID, payload);
            toast.success("Exam updated successfully");
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Failed to update exam");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            backdrop="blur"
            scrollBehavior="inside"
            classNames={{
                body: "p-0 bg-[#F8FAFC]",
                backdrop: "bg-gray-900/40 backdrop-blur-sm",
                base: "border border-gray-200 bg-white shadow-2xl rounded-2xl overflow-hidden",
                header: "border-b border-gray-100 py-6 px-8 bg-white",
                footer: "hidden",
                closeButton: "top-6 right-6 hover:bg-gray-100 text-gray-500",
            }}
        >
            <ModalContent>
                <ModalHeader>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Edit Exam</h2>
                        <p className="text-sm text-gray-500 font-normal mt-1">Update exam details and schedule</p>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="p-6 bg-white">
                        <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <Pencil size={18} className="text-blue-600" /> Exam Details
                        </h3>

                        <div className="space-y-6 w-full">

                            {/* Subject (Read-only) */}
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Subject</label>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-sm font-semibold text-gray-800">
                                        {exam?.Subject?.SubjectName || 'Unknown Subject'}
                                    </p>
                                    <p className="text-xs text-blue-500 mt-0.5">{exam?.Subject?.SubjectCode || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Exam Name */}
                            <div>
                                <label htmlFor="edit-exam-name" className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Exam Name</label>
                                <Input
                                    id="edit-exam-name"
                                    name="ExamName"
                                    placeholder="e.g. End Semester Exam"
                                    value={formData.ExamName}
                                    onValueChange={(val) => handleChange('ExamName', val)}
                                    variant="flat"
                                    radius="sm"
                                    size="lg"
                                    isRequired
                                    classNames={{
                                        inputWrapper: "!bg-gray-50 !border-none !shadow-none hover:!bg-gray-100 group-data-[focus=true]:!bg-white group-data-[focus=true]:!shadow-sm !ring-transparent group-data-[focus=true]:!ring-gray-200",
                                        input: "font-medium text-gray-800 !border-0 !outline-none placeholder:text-gray-400"
                                    }}
                                />
                            </div>

                            {/* Date & Session */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="edit-exam-date" className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Date</label>
                                    <Input
                                        id="edit-exam-date"
                                        type="date"
                                        name="ExamDate"
                                        aria-label="Exam Date"
                                        value={formData.ExamDate}
                                        onValueChange={(val) => handleChange('ExamDate', val)}
                                        variant="flat"
                                        radius="sm"
                                        size="lg"
                                        isRequired
                                        classNames={{
                                            inputWrapper: "!bg-gray-50 !border-none !shadow-none hover:!bg-gray-100 group-data-[focus=true]:!bg-white group-data-[focus=true]:!shadow-sm !ring-transparent group-data-[focus=true]:!ring-gray-200",
                                            input: "font-medium text-gray-800 !border-0 !outline-none"
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-3">Session</label>
                                    <div className="flex gap-6 h-[48px] items-center">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.Session === 'FN' ? 'border-blue-600 bg-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                                                {formData.Session === 'FN' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                            </div>
                                            <input type="radio" className="hidden" name="Session" value="FN" checked={formData.Session === 'FN'} onChange={() => handleChange('Session', 'FN')} />
                                            <div className="text-sm">
                                                <span className="font-bold text-gray-700 block">Forenoon</span>
                                                <span className="text-xs text-gray-400 font-medium">(FN)</span>
                                            </div>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${formData.Session === 'AN' ? 'border-blue-600 bg-white' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                                                {formData.Session === 'AN' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                                            </div>
                                            <input type="radio" className="hidden" name="Session" value="AN" checked={formData.Session === 'AN'} onChange={() => handleChange('Session', 'AN')} />
                                            <div className="text-sm">
                                                <span className="font-bold text-gray-700 block">Afternoon</span>
                                                <span className="text-xs text-gray-400 font-medium">(AN)</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Duration */}
                            <div>
                                <label htmlFor="edit-exam-duration" className="block text-xs font-bold uppercase text-gray-500 tracking-wide mb-2">Duration (Minutes)</label>
                                <Input
                                    id="edit-exam-duration"
                                    type="number"
                                    name="Duration"
                                    aria-label="Duration"
                                    placeholder="180"
                                    value={formData.Duration}
                                    onValueChange={(val) => handleChange('Duration', val)}
                                    variant="flat"
                                    radius="sm"
                                    size="lg"
                                    isRequired
                                    classNames={{
                                        inputWrapper: "!bg-gray-50 !border-none !shadow-none hover:!bg-gray-100 group-data-[focus=true]:!bg-white group-data-[focus=true]:!shadow-sm !ring-transparent group-data-[focus=true]:!ring-gray-200",
                                        input: "font-medium text-gray-800 placeholder:text-gray-400 !border-0 !outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    }}
                                />
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gray-100 my-4"></div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="bordered" className="border-gray-300 text-gray-700 font-medium px-6" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-blue-600 text-white font-semibold shadow-md px-6 hover:bg-blue-700"
                                    onPress={handleSubmit}
                                    isLoading={loading}
                                >
                                    Save Changes
                                </Button>
                            </div>

                        </div>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default EditExamModal;
