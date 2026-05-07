import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, PowerOff, ShieldAlert, X } from 'lucide-react';

interface InternalConfirmationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    details?: string[];
    isLoading?: boolean;
}

export const InternalConfirmationModal: React.FC<InternalConfirmationModalProps> = ({
    isOpen,
    onOpenChange,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    details = [],
    isLoading = false
}) => {
    const getIcon = () => {
        switch (type) {
            case 'danger': return <Trash2 className="text-red-600" size={28} />;
            case 'warning': return <PowerOff className="text-amber-600" size={28} />;
            default: return <ShieldAlert className="text-violet-600" size={28} />;
        }
    };

    const getColors = () => {
        switch (type) {
            case 'danger': return {
                bg: 'bg-red-50',
                border: 'border-red-200',
                text: 'text-red-700',
                btn: 'bg-red-600 hover:bg-red-700 shadow-red-200'
            };
            case 'warning': return {
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                text: 'text-amber-700',
                btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
            };
            default: return {
                bg: 'bg-violet-50',
                border: 'border-violet-200',
                text: 'text-violet-700',
                btn: 'bg-violet-600 hover:bg-violet-700 shadow-violet-200'
            };
        }
    };

    const colors = getColors();

    return (
        <Modal 
            isOpen={isOpen} 
            onOpenChange={onOpenChange} 
            hideCloseButton
            backdrop="blur"
            classNames={{
                backdrop: "bg-slate-900/40 backdrop-blur-md",
                base: "border border-white/20 bg-white/90 shadow-2xl rounded-[32px] overflow-hidden",
            }}
            motionProps={{
                variants: {
                    enter: {
                        y: 0,
                        opacity: 1,
                        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                    },
                    exit: {
                        y: 20,
                        opacity: 0,
                        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
                    },
                }
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <div className="relative">
                        {/* Decorative Background */}
                        <div className={`absolute top-0 left-0 w-full h-32 ${colors.bg} opacity-50 blur-3xl -z-10`} />
                        
                        <ModalHeader className="flex flex-col gap-1 px-8 pt-8 pb-4">
                            <div className="flex items-center justify-between">
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className={`w-14 h-14 rounded-2xl ${colors.bg} ${colors.border} border-2 flex items-center justify-center shadow-sm`}
                                >
                                    {getIcon()}
                                </motion.div>
                                <Button 
                                    isIconOnly 
                                    variant="light" 
                                    size="sm" 
                                    onPress={onClose}
                                    className="text-slate-400 hover:text-slate-600 rounded-full"
                                >
                                    <X size={20} />
                                </Button>
                            </div>
                            <motion.h2 
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                className="text-2xl font-black text-slate-800 tracking-tight mt-4"
                            >
                                {title}
                            </motion.h2>
                        </ModalHeader>

                        <ModalBody className="px-8 pb-4">
                            <motion.div 
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-4"
                            >
                                <p className="text-slate-600 font-medium leading-relaxed">
                                    {message}
                                </p>
                                
                                {details.length > 0 && (
                                    <div className={`p-4 ${colors.bg} ${colors.border} border rounded-2xl`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <ShieldAlert size={14} className={colors.text} />
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${colors.text}`}>Impact Summary</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {details.map((detail, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                                                    <div className={`w-1 h-1 rounded-full ${colors.text} shrink-0 mt-1.5`} />
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </motion.div>
                        </ModalBody>

                        <ModalFooter className="px-8 pt-4 pb-8 flex gap-3">
                            <Button 
                                variant="flat" 
                                onPress={onClose}
                                className="flex-1 font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all py-6 rounded-2xl"
                            >
                                {cancelText}
                            </Button>
                            <Button 
                                isLoading={isLoading}
                                onPress={() => {
                                    onConfirm();
                                }}
                                className={`flex-[1.5] font-black text-white ${colors.btn} shadow-xl py-6 rounded-2xl transition-all active:scale-[0.98]`}
                            >
                                {confirmText}
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </ModalContent>
        </Modal>
    );
};
