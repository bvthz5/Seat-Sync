import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Card, CardBody } from "@heroui/react";
import { useNavigate } from 'react-router-dom';
import { Building2, GraduationCap, BookOpen, ArrowRight } from "lucide-react";

interface CollegeStructureTypeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CollegeStructureTypeModal: React.FC<CollegeStructureTypeModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleSelect = (type: 'internal' | 'endsem') => {
        onClose();
        if (type === 'endsem') {
            navigate('/admin/college-structure/endsem');
        } else {
            navigate('/admin/college-structure/internal');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            backdrop="blur"
            classNames={{
                base: "bg-white shadow-2xl rounded-3xl border border-slate-100",
                header: "border-b border-slate-100 pb-5 pt-7 px-8",
                body: "py-8 px-8 pb-10",
                closeButton: "top-5 right-5 text-slate-400 hover:bg-slate-100 rounded-xl"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3 mb-0.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Building2 size={20} className="text-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">College Structure</h2>
                    </div>
                    <p className="text-sm text-slate-500 font-medium pl-[52px]">
                        Select the structure type to configure
                    </p>
                </ModalHeader>

                <ModalBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Internal Exam Card */}
                        <Card
                            isPressable
                            onPress={() => handleSelect('internal')}
                            className="bg-white border-2 border-slate-100 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-100/60 transition-all duration-300 group overflow-hidden rounded-2xl cursor-pointer"
                        >
                            <CardBody className="p-8 flex flex-col items-center text-center gap-5">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                        <BookOpen size={36} strokeWidth={1.8} />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                                        <ArrowRight size={12} className="text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                        Internal Exam
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                        Internal Exam Structure
                                    </p>
                                </div>
                                <div className="w-full pt-2 border-t border-slate-100">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 group-hover:text-indigo-600 transition-colors uppercase tracking-wider">
                                        Configure Structure
                                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                    </span>
                                </div>
                            </CardBody>
                        </Card>

                        {/* End Semester Card */}
                        <Card
                            isPressable
                            onPress={() => handleSelect('endsem')}
                            className="bg-white border-2 border-slate-100 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-100/60 transition-all duration-300 group overflow-hidden rounded-2xl cursor-pointer"
                        >
                            <CardBody className="p-8 flex flex-col items-center text-center gap-5">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm">
                                        <GraduationCap size={36} strokeWidth={1.8} />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
                                        <ArrowRight size={12} className="text-white" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                        End Semester Exam
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                        End Semester Structure
                                    </p>
                                </div>
                                <div className="w-full pt-2 border-t border-slate-100">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 group-hover:text-purple-600 transition-colors uppercase tracking-wider">
                                        Configure Structure
                                        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                                    </span>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default CollegeStructureTypeModal;
