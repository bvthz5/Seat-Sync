import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from "@heroui/react";
import { ExamService } from '../../services/examService';
import { academicService } from '../../services/academicService';
import { toast } from 'react-hot-toast';

interface EditExamModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    exam: any; // The exam to edit
}

const EditExamModal = ({ isOpen, onClose, onSuccess, exam }: EditExamModalProps) => {
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        ExamName: '',
        ExamDate: '',
        Session: '',
        Duration: '',
        SubjectID: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchDepartments();
            if (exam) {
                setFormData({
                    ExamName: exam.ExamName,
                    ExamDate: exam.ExamDate, // Assuming ISO string YYYY-MM-DD
                    Session: exam.Session,
                    Duration: String(exam.Duration),
                    SubjectID: String(exam.SubjectID)
                });
            }
        }
    }, [isOpen, exam]);

    const fetchDepartments = async () => {
        try {
            const response = await academicService.getDepartments();
            setDepartments(response.data);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    };

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
        <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            Edit Exam
                            <span className="text-sm font-normal text-gray-500">Update exam details and schedule</span>
                        </ModalHeader>
                        <ModalBody className="py-6">
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        id="edit-exam-name"
                                        name="ExamName"
                                        label="Exam Name"
                                        placeholder="e.g. End Semester Exam"
                                        value={formData.ExamName}
                                        onValueChange={(val) => handleChange('ExamName', val)}
                                        variant="bordered"
                                        isRequired
                                    />
                                    <Input
                                        id="edit-exam-date"
                                        name="ExamDate"
                                        type="date"
                                        label="Date"
                                        placeholder="YYYY-MM-DD"
                                        value={formData.ExamDate}
                                        onValueChange={(val) => handleChange('ExamDate', val)}
                                        variant="bordered"
                                        isRequired
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Select
                                        id="edit-exam-session"
                                        name="Session"
                                        label="Session"
                                        placeholder="Select Session"
                                        selectedKeys={formData.Session ? [formData.Session] : []}
                                        onChange={(e) => handleChange('Session', e.target.value)}
                                        variant="bordered"
                                        isRequired
                                    >
                                        <SelectItem key="FN">Forenoon (FN)</SelectItem>
                                        <SelectItem key="AN">Afternoon (AN)</SelectItem>
                                    </Select>

                                    <Input
                                        id="edit-exam-duration"
                                        name="Duration"
                                        type="number"
                                        label="Duration (Minutes)"
                                        placeholder="180"
                                        value={formData.Duration}
                                        onValueChange={(val) => handleChange('Duration', val)}
                                        variant="bordered"
                                        isRequired
                                    />
                                </div>

                                {/* Subject Selection is typically read-only or restricted in edit to avoid key issues, but allowing here if needed. 
                                    Ideally, changing subject might change the exam entirely. For now, disabled to keep it simple or show as read-only. */
                                }
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Subject</p>
                                    <p className="text-sm font-medium text-gray-900">{exam?.Subject?.SubjectName || 'Unknown Subject'} ({exam?.Subject?.SubjectCode})</p>
                                </div>

                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={onClose}>
                                Cancel
                            </Button>
                            <Button color="primary" onPress={handleSubmit} isLoading={loading}>
                                Save Changes
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default EditExamModal;
