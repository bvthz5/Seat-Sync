import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Card, CardBody } from "@heroui/react";
import { useNavigate } from 'react-router-dom';
import { Building2, GraduationCap, BookOpen, ArrowRight, Tag } from "lucide-react";

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
            size="md"
            backdrop="blur"
            classNames={{
                base: "glass-card rounded-[40px] border-white/40 shadow-glass overflow-hidden",
                header: "pb-0 pt-10 px-10 text-center flex flex-col items-center",
                body: "py-10 px-10",
                closeButton: "top-6 right-6 bg-white/50 backdrop-blur-md hover:bg-white hover:rotate-90 transition-all duration-500 rounded-full p-2 border border-white/50 shadow-sm"
            }}
        >
            <ModalContent>
                <ModalHeader className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-1 bg-indigo-500 rounded-full" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/80">Infrastructure Configuration</span>
                        <div className="w-8 h-1 bg-indigo-500 rounded-full" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">College <span className="text-indigo-600">Structure</span></h2>
                </ModalHeader>
                <ModalBody>
                    <div className="grid grid-cols-2 gap-8">
                        {/* Internal Option - Now First */}
                        <button 
                            onClick={() => handleSelect('internal')}
                            className="group relative aspect-[0.9/1] flex flex-col items-center justify-center text-center p-8 rounded-[40px] bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-premium-hover transition-all duration-500 ease-out hover:-translate-y-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-indigo-200 group-hover:shadow-lg">
                                <Tag size={36} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors px-2">Internal Structure</h3>
                            <div className="mt-4 w-10 h-1.5 bg-indigo-100 rounded-full group-hover:w-16 group-hover:bg-indigo-500 transition-all duration-300" />
                            
                            {/* Floating micro-glow effect */}
                            <div className="absolute inset-0 bg-indigo-400/0 group-hover:bg-indigo-400/5 rounded-[40px] transition-colors duration-500 pointer-events-none" />
                        </button>

                        {/* End Semester Option - Now Second */}
                        <button 
                            onClick={() => handleSelect('endsem')}
                            className="group relative aspect-[0.9/1] flex flex-col items-center justify-center text-center p-8 rounded-[40px] bg-white border border-slate-100 hover:border-violet-200 hover:shadow-premium-hover transition-all duration-500 ease-out hover:-translate-y-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-violet-600 group-hover:text-white transition-all duration-500 shadow-sm group-hover:shadow-violet-200 group-hover:shadow-lg">
                                <GraduationCap size={36} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-violet-600 transition-colors px-2">University Structure</h3>
                            <div className="mt-4 w-10 h-1.5 bg-violet-100 rounded-full group-hover:w-16 group-hover:bg-violet-500 transition-all duration-300" />
                            
                            {/* Floating micro-glow effect */}
                            <div className="absolute inset-0 bg-violet-400/0 group-hover:bg-violet-400/5 rounded-[40px] transition-colors duration-500 pointer-events-none" />
                        </button>
                    </div>
                </ModalBody>

            </ModalContent>
        </Modal>


    );
};

export default CollegeStructureTypeModal;
