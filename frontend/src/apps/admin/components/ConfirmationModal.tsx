import React from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    type = 'danger'
}) => {
    const [isLoading, setIsLoading] = React.useState(false);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await onConfirm();
            onClose();
        } catch (error) {
            // Error handling should be done by parent typically, but we stop loading
        } finally {
            setIsLoading(false);
        }
    };

    const colors = {
        danger: { bg: 'bg-red-50', text: 'text-red-700', button: 'bg-red-600 hover:bg-red-700', icon: 'text-red-600' },
        warning: { bg: 'bg-amber-50', text: 'text-amber-700', button: 'bg-amber-600 hover:bg-amber-700', icon: 'text-amber-600' },
        info: { bg: 'bg-blue-50', text: 'text-blue-700', button: 'bg-blue-600 hover:bg-blue-700', icon: 'text-blue-600' }
    };

    const color = colors[type];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={isLoading ? undefined : onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    >
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                            <div className="p-6 text-center">
                                <div className={`w-12 h-12 rounded-full ${color.bg} flex items-center justify-center mx-auto mb-4`}>
                                    <AlertTriangle className={`w-6 h-6 ${color.icon}`} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                                <p className="text-slate-600 text-sm mb-6">{message}</p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-medium transition-colors disabled:opacity-50"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        onClick={handleConfirm}
                                        disabled={isLoading}
                                        className={`flex-1 px-4 py-2.5 ${color.button} text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70`}
                                    >
                                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : confirmText}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
