import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, Hash, User, Building2, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { invigilatorService } from '../../services/invigilatorService';

interface AddInvigilatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const FIELD_CLASS = "w-full h-11 px-4 rounded-xl text-sm font-medium text-slate-800 outline-none transition-all bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white placeholder:text-slate-400";

const AddInvigilatorModal: React.FC<AddInvigilatorModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        FacultyID: '',
        Name: '',
        Department: '',
        Designation: '',
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleReset = () => {
        setFormData({ FacultyID: '', Name: '', Department: '', Designation: '' });
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.FacultyID || !formData.Name || !formData.Department) {
            toast.error('Faculty ID, Name, and Department are required');
            return;
        }
        setIsLoading(true);
        try {
            await invigilatorService.create({
                FacultyID: formData.FacultyID.trim(),
                Name: formData.Name,
                Department: formData.Department,
                Designation: formData.Designation || 'Faculty',
            });
            toast.success('Invigilator added successfully');
            handleReset();
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to add invigilator');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
            <div
                className="bg-white w-full max-w-md mx-4 rounded-2xl overflow-hidden shadow-2xl"
                style={{ border: '1px solid #e2e8f0' }}
            >
                {/* Header */}
                <div className="px-7 pt-7 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                            <UserPlus size={18} className="text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Add Invigilator</h2>
                            <p className="text-xs text-slate-400">Fill in the same fields as the Excel import</p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-sm"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-7 py-6 space-y-4">

                    {/* Faculty ID */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Hash size={10} /> Staff / Faculty ID <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.FacultyID}
                            onChange={e => handleChange('FacultyID', e.target.value)}
                            placeholder="e.g. FAC001 or 1001"
                            className={FIELD_CLASS}
                            required
                        />
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <User size={10} /> Full Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.Name}
                            onChange={e => handleChange('Name', e.target.value)}
                            placeholder="e.g. Dr. Sarah Connor"
                            className={FIELD_CLASS}
                            required
                        />
                    </div>

                    {/* Department */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Building2 size={10} /> Department <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.Department}
                            onChange={e => handleChange('Department', e.target.value)}
                            placeholder="e.g. Computer Science"
                            className={FIELD_CLASS}
                            required
                        />
                    </div>

                    {/* Designation */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Briefcase size={10} /> Designation <span className="text-slate-300 font-normal normal-case tracking-normal">optional</span>
                        </label>
                        <input
                            type="text"
                            value={formData.Designation}
                            onChange={e => handleChange('Designation', e.target.value)}
                            placeholder="e.g. Associate Professor"
                            className={FIELD_CLASS}
                        />
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-slate-100 !mt-6" />

                    {/* Actions */}
                    <div className="flex gap-3 !mt-5">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 h-11 rounded-xl font-semibold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 h-11 rounded-xl font-bold text-sm text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <UserPlus size={15} />
                            )}
                            {isLoading ? 'Adding...' : 'Add Invigilator'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default AddInvigilatorModal;
