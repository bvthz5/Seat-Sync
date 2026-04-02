import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Building2, Mail, Info, Briefcase, Phone, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';

const InvigilatorRequest: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [departments, setDepartments] = useState<{ DepartmentID: number; DepartmentCode: string; DepartmentName: string }[]>([]);

    // Fetch departments from public meta (no auth needed)
    React.useEffect(() => {
        fetch('http://localhost:5000/api/auth/student/meta')
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data?.departments) setDepartments(data.departments); })
            .catch(() => {});
    }, []);

    const [formData, setFormData] = useState({
        FacultyID: '',
        Name: '',
        Email: '',
        Phone: '',
        Department: '',
        Designation: '',
        Reason: ''
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.FacultyID || !formData.Name || !formData.Email || !formData.Department) {
            toast.error('Faculty ID, Name, Email, and Department are required.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/invigilators/request', formData);
            toast.success('Access request submitted successfully!');
            setIsSubmitted(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to submit request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
                <div className="bg-white max-w-md w-full rounded-2xl p-10 text-center shadow-xl border border-slate-100">
                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Info size={32} className="text-blue-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Received</h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        Your access request has been sent to the Exam Administration Cell. You will receive an activation email once your profile is verified and approved.
                    </p>
                    <button
                        onClick={() => navigate('/invigilator/login')}
                        className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-md"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex flex-1 bg-slate-900 relative p-12 text-white flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                
                <div className="relative z-10">
                    <button 
                        onClick={() => navigate('/invigilator/login')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold mb-20"
                    >
                        <ArrowLeft size={16} /> Back to portal
                    </button>
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md mb-6 border border-white/10">
                        <UserPlus size={24} className="text-blue-400" />
                    </div>
                    <h1 className="text-4xl font-bold mb-4 tracking-tight leading-tight">Join the<br/>Faculty Network</h1>
                    <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                        Submit an access request to the examination cell. Upon approval, you will receive full access to the duty portal.
                    </p>
                </div>

                <div className="relative z-10">
                    <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} SeatSync Enterprise.</p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAFC]">
                <div className="w-full max-w-md">
                    <div className="lg:hidden mb-8">
                        <button 
                            onClick={() => navigate('/invigilator/login')}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold"
                        >
                            <ArrowLeft size={16} /> Back to Login
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                        <div className="mb-8 text-center sm:text-left">
                            <h2 className="text-2xl font-bold text-slate-900 mb-1">Request Access</h2>
                            <p className="text-slate-500 text-sm">Please provide your official details</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            <div className="grid grid-cols-1 gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-widest px-1 mb-1.5">
                                            Staff / Faculty ID <span className="text-rose-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 border-r border-slate-200">
                                                <Briefcase size={16} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.FacultyID}
                                                onChange={e => handleChange('FacultyID', e.target.value)}
                                                className="w-full h-11 pl-14 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                                                placeholder="e.g. FAC001"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-widest px-1 mb-1.5">
                                            Full Name <span className="text-rose-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 border-r border-slate-200">
                                                <UserPlus size={16} className="text-slate-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.Name}
                                                onChange={e => handleChange('Name', e.target.value)}
                                                className="w-full h-11 pl-14 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                                                placeholder="e.g. Dr. Jane Smith"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-widest px-1 mb-1.5">
                                        Official Email <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 border-r border-slate-200">
                                            <Mail size={16} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="email"
                                            value={formData.Email}
                                            onChange={e => handleChange('Email', e.target.value)}
                                            className="w-full h-11 pl-14 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                                            placeholder="jane@college.edu"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-widest px-1 mb-1.5">
                                            Department <span className="text-rose-400">*</span>
                                        </label>
                                        <div className="relative">
                                            <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <select
                                                value={formData.Department}
                                                onChange={e => handleChange('Department', e.target.value)}
                                                className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium appearance-none"
                                                required
                                            >
                                                <option value="">Select Department...</option>
                                                {departments.map(d => (
                                                    <option key={d.DepartmentID} value={d.DepartmentCode}>
                                                        {d.DepartmentCode} — {d.DepartmentName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-widest px-1 mb-1.5">
                                            Phone
                                        </label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                value={formData.Phone}
                                                onChange={e => handleChange('Phone', e.target.value)}
                                                className="w-full h-11 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-widest px-1 mb-1.5">
                                        Reason for joining
                                    </label>
                                    <div className="relative">
                                        <MessageSquare size={16} className="absolute left-4 top-4 text-slate-400" />
                                        <textarea
                                            value={formData.Reason}
                                            onChange={e => handleChange('Reason', e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all font-medium resize-none h-24"
                                            placeholder="Optional note to the admin..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-12 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 disabled:hover:bg-blue-600"
                            >
                                {isLoading ? 'Submitting...' : 'Submit Request'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvigilatorRequest;
