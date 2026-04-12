import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, ArrowLeft, Building2, Mail, Info, Briefcase, Phone, MessageSquare, ChevronDown, Search, Network, ShieldCheck, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';
import { validateInvigilatorRequestForm, validateField } from '../../../utils/invigilatorRequestValidation';

const InvigilatorRequest: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [departments, setDepartments] = useState<{ DepartmentID: number; DepartmentCode: string; DepartmentName: string }[]>([]);
    const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
    const [deptSearch, setDeptSearch] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
    const deptDropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdown when clicked outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
                setIsDeptDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        
        // Mark field as touched
        setTouchedFields(prev => new Set([...prev, field]));
        
        // Validate field in real-time if touched
        if (touchedFields.has(field)) {
            const fieldError = validateField(field, value);
            
            setErrors(prev => {
                if (fieldError) {
                    return { ...prev, [field]: fieldError };
                } else {
                    const newErrors = { ...prev };
                    delete newErrors[field];
                    return newErrors;
                }
            });
        }
    };

    const handleBlur = (fieldName: string) => {
        // Mark field as touched when blur
        setTouchedFields(prev => new Set([...prev, fieldName]));
        
        // Validate field
        const fieldError = validateField(fieldName, formData[fieldName as keyof typeof formData]);
        
        setErrors(prev => {
            if (fieldError) {
                return { ...prev, [fieldName]: fieldError };
            } else {
                const newErrors = { ...prev };
                delete newErrors[fieldName];
                return newErrors;
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all fields
        const validationErrors = validateInvigilatorRequestForm(formData);
        
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setTouchedFields(new Set(Object.keys(validationErrors)));
            toast.error("Please correct all validation errors");
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/invigilators/request', formData);
            toast.success('Access request submitted successfully!');
            setIsSubmitted(true);
        } catch (error: any) {
            if (error.response?.data?.validationErrors) {
                setErrors(error.response.data.validationErrors);
                setTouchedFields(new Set(Object.keys(error.response.data.validationErrors)));
                toast.error(error.response.data.error || 'Validation failed');
            } else {
                toast.error(error.response?.data?.message || 'Failed to submit request. Please try again.');
            }
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
            {/* Left Panel - Breathtaking Aurora & Glass 3D Animation */}
            <div className="hidden lg:flex flex-1 bg-[#0a0f1c] relative p-12 text-white flex-col justify-between overflow-hidden">
                
                {/* Stunning Aurora Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, -50, 0], rotate: [0, 45, 0] }}
                        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-600/40 to-indigo-600/20 rounded-full blur-[120px]"
                    />
                    <motion.div 
                        animate={{ scale: [1, 1.3, 1], x: [0, -100, 0], y: [0, 50, 0], rotate: [0, -45, 0] }}
                        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-1/4 -left-1/4 w-[700px] h-[700px] bg-gradient-to-tr from-emerald-600/30 to-teal-600/20 rounded-full blur-[120px]"
                    />
                    <motion.div 
                        animate={{ scale: [0.8, 1.5, 0.8], opacity: [0.3, 0.7, 0.3] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[100px]"
                    />
                </div>

                {/* Animated Tech Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
                    <motion.div animate={{ y: [0, 80] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="w-full h-[200%] absolute top-0 left-0 bg-gradient-to-b from-transparent via-blue-400/20 to-transparent" />
                </div>

                <div className="relative z-10 w-full flex justify-between items-start">
                    <motion.button 
                        variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
                        initial="hidden" animate="visible"
                        onClick={() => navigate('/invigilator/login')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold"
                    >
                        <ArrowLeft size={16} /> Back to portal
                    </motion.button>

                    <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold tracking-widest text-slate-300 backdrop-blur-md">
                        PORTAL v2.4
                    </div>
                </div>

                {/* Stunning 3D Floating Glass ID Card */}
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center perspective-[2000px] w-full mt-4">
                    <motion.div
                        animate={{ y: [-15, 15, -15], rotateX: [8, -8, 8], rotateY: [-8, 8, -8] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="relative w-[340px] h-[500px] rounded-[32px] border border-white/20 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] overflow-hidden flex flex-col p-8"
                        style={{ transformStyle: 'preserve-3d' }}
                    >
                        {/* Dynamic Glass Shine Sweep */}
                        <motion.div 
                            animate={{ x: ['-150%', '250%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
                            className="absolute inset-0 w-1/2 h-[200%] bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 -top-1/2 z-20 pointer-events-none"
                        />
                        
                        <div className="flex justify-between items-start mb-12 w-full" style={{ transform: 'translateZ(40px)' }}>
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)] backdrop-blur-md">
                                <ShieldCheck size={28} className="text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
                            </div>
                            <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-full text-emerald-400 text-[10px] font-bold tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
                                ACTIVE
                            </div>
                        </div>
                        
                        <div className="flex-1 w-full flex flex-col items-center justify-center gap-8" style={{ transform: 'translateZ(60px)' }}>
                            <div className="w-36 h-36 rounded-full border border-slate-400/30 flex items-center justify-center relative backdrop-blur-sm bg-white/5">
                                {/* Orbiting ring */}
                                <motion.div 
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-[-4px] border-2 border-blue-400/60 rounded-full border-t-transparent border-l-transparent shadow-[0_0_15px_rgba(96,165,250,0.5)]" 
                                />
                                <div className="w-32 h-32 rounded-full bg-slate-900/80 flex items-center justify-center overflow-hidden inner-shadow">
                                    <User size={56} className="text-slate-400 drop-shadow-md" />
                                </div>
                            </div>
                            
                            <div className="text-center w-full space-y-4">
                                <div className="h-6 w-4/5 bg-slate-800/80 rounded-lg mx-auto overflow-hidden relative border border-white/5">
                                    <motion.div
                                        animate={{ x: ['-200%', '200%'] }}
                                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut' }}
                                        className="absolute inset-y-0 w-16 bg-white/10 blur-[4px]"
                                    />
                                </div>
                                <div className="h-4 w-1/2 bg-slate-800/60 rounded-lg mx-auto border border-white/5" />
                            </div>
                        </div>

                        <div className="mt-8 w-full" style={{ transform: 'translateZ(30px)' }}>
                            <div className="w-full h-14 border border-slate-600/40 bg-slate-900/40 rounded-xl relative overflow-hidden flex items-center px-5 backdrop-blur-md">
                                <div className="flex gap-1.5 w-full justify-between items-center opacity-60">
                                    {Array.from({length: 14}).map((_, i) => (
                                        <div key={i} className={`h-6 bg-slate-400 rounded-sm ${i%3===0 ? 'w-1.5' : 'w-2.5'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }}
                    className="relative z-10 w-full mt-4"
                >
                    <h1 className="text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight leading-[1.1] text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 drop-shadow-sm">
                        Faculty Access<br/>Network
                    </h1>
                    <p className="text-slate-400 text-base lg:text-lg max-w-md leading-relaxed font-medium">
                        Request institutional access to the examination duty portal. Privileges are granted upon administrative approval.
                    </p>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                    className="relative z-10 mt-8"
                >
                    <p className="text-slate-500 text-sm">&copy; {new Date().getFullYear()} SeatSync Enterprise.</p>
                </motion.div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-[#F8FAFC] overflow-y-auto">
                <div className="w-full max-w-xl my-auto">
                    <div className="lg:hidden mb-8">
                        <button 
                            onClick={() => navigate('/invigilator/login')}
                            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-semibold"
                        >
                            <ArrowLeft size={16} /> Back to Login
                        </button>
                    </div>

                    <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                        <div className="mb-8 text-center sm:text-left">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Request Access</h2>
                            <p className="text-slate-500 text-base">Please provide your official details</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            <div className="grid grid-cols-1 gap-6">
                                <div>
                                    <label htmlFor="facultyId" className={`text-xs font-bold block uppercase tracking-widest px-1 mb-2 ${errors.FacultyID && touchedFields.has('FacultyID') ? 'text-red-600' : 'text-slate-400'}`}>
                                        Staff / Faculty ID <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="relative h-14">
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 border-r ${errors.FacultyID && touchedFields.has('FacultyID') ? 'border-red-300' : 'border-slate-200'}`}>
                                            <Briefcase size={18} className={errors.FacultyID && touchedFields.has('FacultyID') ? 'text-red-500' : 'text-slate-400'} />
                                        </div>
                                        <input
                                            id="facultyId"
                                            name="facultyId"
                                            type="text"
                                            autoComplete="off"
                                            value={formData.FacultyID}
                                            onChange={e => handleChange('FacultyID', e.target.value)}
                                            onBlur={() => handleBlur('FacultyID')}
                                            className={`w-full h-full pl-14 pr-4 rounded-xl bg-slate-50 border text-base text-slate-800 outline-none focus:bg-white transition-all font-medium ${errors.FacultyID && touchedFields.has('FacultyID') ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                                            placeholder="e.g. FAC001"
                                            required
                                        />
                                    </div>
                                    {errors.FacultyID && touchedFields.has('FacultyID') && (
                                        <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {errors.FacultyID}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="fullName" className={`text-xs font-bold block uppercase tracking-widest px-1 mb-2 ${errors.Name && touchedFields.has('Name') ? 'text-red-600' : 'text-slate-400'}`}>
                                        Full Name <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="relative h-14">
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 border-r ${errors.Name && touchedFields.has('Name') ? 'border-red-300' : 'border-slate-200'}`}>
                                            <UserPlus size={18} className={errors.Name && touchedFields.has('Name') ? 'text-red-500' : 'text-slate-400'} />
                                        </div>
                                        <input
                                            id="fullName"
                                            name="fullName"
                                            type="text"
                                            autoComplete="name"
                                            value={formData.Name}
                                            onChange={e => handleChange('Name', e.target.value)}
                                            onBlur={() => handleBlur('Name')}
                                            className={`w-full h-full pl-14 pr-4 rounded-xl bg-slate-50 border text-base text-slate-800 outline-none focus:bg-white transition-all font-medium ${errors.Name && touchedFields.has('Name') ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                                            placeholder="e.g. Dr. Jane Smith"
                                            required
                                        />
                                    </div>
                                    {errors.Name && touchedFields.has('Name') && (
                                        <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {errors.Name}
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label htmlFor="email" className={`text-xs font-bold block uppercase tracking-widest px-1 mb-2 ${errors.Email && touchedFields.has('Email') ? 'text-red-600' : 'text-slate-400'}`}>
                                        Official Email <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="relative h-14">
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 border-r ${errors.Email && touchedFields.has('Email') ? 'border-red-300' : 'border-slate-200'}`}>
                                            <Mail size={18} className={errors.Email && touchedFields.has('Email') ? 'text-red-500' : 'text-slate-400'} />
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            value={formData.Email}
                                            onChange={e => handleChange('Email', e.target.value)}
                                            onBlur={() => handleBlur('Email')}
                                            className={`w-full h-full pl-14 pr-4 rounded-xl bg-slate-50 border text-base text-slate-800 outline-none focus:bg-white transition-all font-medium ${errors.Email && touchedFields.has('Email') ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                                            placeholder="jane@college.edu"
                                            required
                                        />
                                    </div>
                                    {errors.Email && touchedFields.has('Email') && (
                                        <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {errors.Email}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="department" className={`text-xs font-bold block uppercase tracking-widest px-1 mb-2 ${errors.Department && touchedFields.has('Department') ? 'text-red-600' : 'text-slate-400'}`}>
                                        Department <span className="text-rose-400">*</span>
                                    </label>
                                    <input type="hidden" id="department" name="department" value={formData.Department} />
                                    <div className="relative h-14" ref={deptDropdownRef}>
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 border-r pointer-events-none ${errors.Department && touchedFields.has('Department') ? 'border-red-300' : 'border-slate-200'}`}>
                                            <Building2 size={18} className={errors.Department && touchedFields.has('Department') ? 'text-red-500' : 'text-slate-400'} />
                                        </div>
                                        
                                        <div 
                                            onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                                            onBlur={() => handleBlur('Department')}
                                            className={`w-full h-full pl-12 pr-10 rounded-xl bg-slate-50 border text-base outline-none focus:bg-white transition-all font-medium flex items-center cursor-pointer select-none ${errors.Department && touchedFields.has('Department') ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                                        >
                                            {formData.Department ? (
                                                <span className="text-slate-800">
                                                    {departments.find(d => d.DepartmentCode === formData.Department)?.DepartmentName || formData.Department}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">Select Department...</span>
                                            )}
                                        </div>
                                        <ChevronDown size={18} className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''} ${errors.Department && touchedFields.has('Department') ? 'text-red-500' : 'text-slate-400'}`} />

                                        {/* Dropdown Menu */}
                                        {isDeptDropdownOpen && (
                                            <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
                                                <div className="p-2 border-b border-slate-100 relative">
                                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input 
                                                        id="departmentSearch"
                                                        name="departmentSearch"
                                                        type="text"
                                                        autoComplete="off"
                                                        autoFocus
                                                        placeholder="Search departments..."
                                                        value={deptSearch}
                                                        onChange={e => setDeptSearch(e.target.value)}
                                                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400"
                                                    />
                                                </div>
                                                <div className="max-h-60 overflow-y-auto p-1">
                                                    {departments.filter(d => 
                                                        d.DepartmentName.toLowerCase().includes(deptSearch.toLowerCase()) || 
                                                        d.DepartmentCode.toLowerCase().includes(deptSearch.toLowerCase())
                                                    ).length === 0 ? (
                                                        <div className="px-4 py-4 text-sm text-slate-500 text-center">No departments found</div>
                                                    ) : (
                                                        departments.filter(d => 
                                                            d.DepartmentName.toLowerCase().includes(deptSearch.toLowerCase()) || 
                                                            d.DepartmentCode.toLowerCase().includes(deptSearch.toLowerCase())
                                                        ).map(d => (
                                                            <div 
                                                                key={d.DepartmentID}
                                                                onClick={() => {
                                                                    handleChange('Department', d.DepartmentCode);
                                                                    setIsDeptDropdownOpen(false);
                                                                    setDeptSearch('');
                                                                }}
                                                                className={`px-4 py-3 text-sm rounded-lg cursor-pointer transition-colors ${
                                                                    formData.Department === d.DepartmentCode 
                                                                        ? 'bg-blue-50 text-blue-700' 
                                                                        : 'text-slate-700 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                <div className="font-semibold text-slate-900">{d.DepartmentCode}</div>
                                                                <div className="text-xs text-slate-500 mt-0.5">{d.DepartmentName}</div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {errors.Department && touchedFields.has('Department') && (
                                        <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {errors.Department}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="phone" className={`text-xs font-bold block uppercase tracking-widest px-1 mb-2 ${errors.Phone && touchedFields.has('Phone') ? 'text-red-600' : 'text-slate-400'}`}>
                                        Phone
                                    </label>
                                    <div className="relative h-14">
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-8 border-r pointer-events-none ${errors.Phone && touchedFields.has('Phone') ? 'border-red-300' : 'border-slate-200'}`}>
                                            <Phone size={18} className={errors.Phone && touchedFields.has('Phone') ? 'text-red-500' : 'text-slate-400'} />
                                        </div>
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="text"
                                            autoComplete="tel"
                                            value={formData.Phone}
                                            onChange={e => handleChange('Phone', e.target.value)}
                                            onBlur={() => handleBlur('Phone')}
                                            className={`w-full h-full pl-14 pr-4 rounded-xl bg-slate-50 border text-base text-slate-800 outline-none focus:bg-white transition-all font-medium ${errors.Phone && touchedFields.has('Phone') ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                                        />
                                    </div>
                                    {errors.Phone && touchedFields.has('Phone') && (
                                        <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {errors.Phone}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="reason" className={`text-xs font-bold block uppercase tracking-widest px-1 mb-2 ${errors.Reason && touchedFields.has('Reason') ? 'text-red-600' : 'text-slate-400'}`}>
                                        Reason for joining
                                    </label>
                                    <div className={`relative border rounded-xl transition-all overflow-hidden ${errors.Reason && touchedFields.has('Reason') ? 'border-red-500' : 'border-slate-200'}`}>
                                        <MessageSquare size={18} className={`absolute left-4 top-4 pointer-events-none ${errors.Reason && touchedFields.has('Reason') ? 'text-red-500' : 'text-slate-400'}`} />
                                        <textarea
                                            id="reason"
                                            name="reason"
                                            autoComplete="off"
                                            value={formData.Reason}
                                            onChange={e => handleChange('Reason', e.target.value)}
                                            onBlur={() => handleBlur('Reason')}
                                            className={`w-full min-h-[120px] pl-12 pr-4 py-4 bg-slate-50 text-base text-slate-800 outline-none focus:bg-white transition-all font-medium resize-none ring-0 focus:ring-4 ${errors.Reason && touchedFields.has('Reason') ? 'focus:ring-red-500/10' : 'focus:ring-blue-500/10'}`}
                                            placeholder="Optional note to the admin..."
                                        />
                                    </div>
                                    {errors.Reason && touchedFields.has('Reason') && (
                                        <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {errors.Reason}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full h-14 mt-8 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 disabled:hover:bg-blue-600"
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
