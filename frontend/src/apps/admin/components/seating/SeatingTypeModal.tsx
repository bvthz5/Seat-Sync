import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Card, CardBody } from "@heroui/react";
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap } from "lucide-react";

interface SeatingTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SeatingTypeModal: React.FC<SeatingTypeModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleSelect = (type: 'internal' | 'endsem') => {
        onClose();
        if (type === 'endsem') {
            navigate('/admin/seating/endsem');
        } else {
            navigate('/admin/seating/internal');
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose}
            size="2xl"
            backdrop="blur"
            classNames={{
                base: "bg-white shadow-2xl rounded-3xl",
                header: "border-b border-slate-100 pb-4 pt-6 px-8",
                body: "py-8 px-8",
                closeButton: "top-5 right-5 text-slate-400 hover:bg-slate-100"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Select Seating Type</h2>
                    <p className="text-sm text-slate-500 font-medium">Choose the exam category for seating arrangement</p>
                </ModalHeader>
                <ModalBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card 
                            isPressable 
                            onPress={() => handleSelect('internal')}
                            className="bg-white border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl transition-all group overflow-hidden"
                        >
                            <CardBody className="p-8 flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <BookOpen size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Internal Exam</h3>
                                    <p className="text-sm text-slate-500 font-medium">Internal Exam Seating Plan</p>
                                </div>
                            </CardBody>
                        </Card>

                        <Card 
                            isPressable 
                            onPress={() => handleSelect('endsem')}
                            className="bg-white border-2 border-slate-100 hover:border-purple-500 hover:shadow-xl transition-all group overflow-hidden"
                        >
                            <CardBody className="p-8 flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <GraduationCap size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">End Semester Exam</h3>
                                    <p className="text-sm text-slate-500 font-medium">End Semester Seating Plan</p>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default SeatingTypeModal;
