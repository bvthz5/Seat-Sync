import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Hash, Briefcase, GraduationCap, Calendar, Loader2, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { validateRegistrationForm, validateField } from '../../../utils/studentRegistrationValidation';

interface Department {
    DepartmentID: number;
    DepartmentCode: string;
    DepartmentName: string;
}

interface Program {
    ProgramID: number;
    ProgramCode: string;
    ProgramName: string;
    DurationYears?: number;
    Departments?: { DepartmentID: number; DepartmentCode: string; DepartmentName: string }[];
}

/* ── InputField must be defined OUTSIDE the parent component so React
   doesn't re-create its type on every render (which loses focus). ── */
interface InputFieldProps {
    label: string;
    icon: React.ElementType;
    type: string;
    name: string;
    placeholder: string;
    formData: Record<string, string>;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onBlur?: (fieldName: string) => void;
    disabled: boolean;
    error?: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, icon: Icon, type, name, placeholder, formData, onChange, disabled, error, onBlur }) => {
    const hasError = !!error;
    return (
    <div className="relative group col-span-1">
        <div className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ml-1 ${hasError ? 'text-red-600' : 'text-slate-500'}`}>
            {label}
        </div>
        <div className="relative flex items-center transition-all duration-300">
            <div className={`absolute left-4 group-focus-within:text-blue-600 transition-colors ${hasError ? 'text-red-500' : 'text-slate-400'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <input
                type={type}
                name={name}
                id={name}
                value={formData[name] ?? ''}
                onChange={onChange}
                onBlur={(e) => {
                    if (onBlur) onBlur(name);
                }}
                className={`w-full bg-white border text-slate-900 text-[15px] font-medium rounded-xl focus:ring-4 focus:outline-none block pl-12 pr-4 py-3.5 transition-all shadow-sm placeholder:text-slate-400 ${
                    hasError
                        ? 'border-red-500 focus:ring-red-500/10 focus:border-red-500'
                        : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
                }`}
                placeholder={placeholder}
                disabled={disabled}
                autoComplete="off"
            />
        </div>
        {error && (
            <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
            </div>
        )}
    </div>
);};

const StudentRegister: React.FC = () => {
    const navigate = useNavigate();
    
    const [departments, setDepartments] = useState<Department[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

    const [formData, setFormData] = useState({
        FullName: '',
        Email: '',
        RegisterNumber: '',
        DepartmentID: '',
        ProgramID: '',
        BatchYear: new Date().getFullYear().toString(),
        Password: '',
        ConfirmPassword: ''
    });

    useEffect(() => {
        // Fetch departments and programs from the public meta endpoint (no auth needed)
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/auth/student/meta');
                if (res.ok) {
                    const { departments: depts, programs: progs } = await res.json();
                    setDepartments(depts || []);
                    setPrograms(progs || []);
                }
            } catch (err) {
                console.error("Failed to fetch registration data", err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (formData.DepartmentID) {
            const filtered = programs.filter(p =>
                p.Departments?.some(d => d.DepartmentID.toString() === formData.DepartmentID)
            );
            setFilteredPrograms(filtered);
            setFormData(prev => ({ ...prev, ProgramID: '' }));
        } else {
            setFilteredPrograms([]);
        }
    }, [formData.DepartmentID, programs]);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let { name, value } = e.target;
        
        if (name === 'RegisterNumber') {
            value = value.toUpperCase();
        }
        
        setFormData({ ...formData, [name]: value });
        
        // Mark field as touched
        setTouchedFields(prev => new Set([...prev, name]));
        
        // Validate field in real-time if touched
        if (touchedFields.has(name)) {
            const fieldError = validateField(
                name,
                value,
                name === 'ConfirmPassword' ? formData.Password : undefined
            );
            
            setErrors(prev => {
                if (fieldError) {
                    return { ...prev, [name]: fieldError };
                } else {
                    const newErrors = { ...prev };
                    delete newErrors[name];
                    return newErrors;
                }
            });
        }
    };

    const handleBlur = (fieldName: string) => {
        // Mark field as touched when blur
        setTouchedFields(prev => new Set([...prev, fieldName]));
        
        // Validate field
        const fieldError = validateField(
            fieldName,
            formData[fieldName as keyof typeof formData],
            fieldName === 'ConfirmPassword' ? formData.Password : undefined
        );
        
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all fields
        const validationErrors = validateRegistrationForm(formData);
        
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            setTouchedFields(new Set(Object.keys(validationErrors)));
            toast.error("Please correct all validation errors");
            triggerShake();
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                ...formData,
                DepartmentID: formData.DepartmentID ? parseInt(formData.DepartmentID) : null,
                ProgramID: formData.ProgramID ? parseInt(formData.ProgramID) : null,
                BatchYear: parseInt(formData.BatchYear)
            };

            const response = await fetch('http://localhost:5000/api/auth/student/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle server validation errors
                if (data.validationErrors) {
                    setErrors(data.validationErrors);
                    setTouchedFields(new Set(Object.keys(data.validationErrors)));
                    toast.error(data.error || 'Validation failed');
                } else {
                    toast.error(data.error || 'Registration failed');
                }
                triggerShake();
                return;
            }

            toast.success("Registration successful! You can now log in.");
            navigate('/student/login');

        } catch (error: any) {
            toast.error(error.message || 'Registration failed');
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="min-h-screen flex font-inter overflow-hidden bg-slate-50">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-5/12 flex-col justify-between relative bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 p-12 text-white overflow-hidden shadow-2xl z-10">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-white opacity-[0.07] rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-400 opacity-[0.15] rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-wide">SeatSync</span>
                    </div>
                    <h2 className="text-4xl xl:text-5xl font-extrabold leading-[1.15] mb-4 tracking-tight drop-shadow-sm">
                        Complete your <br/>Academic <br/>Profile.
                    </h2>
                    <p className="text-blue-100 text-base leading-relaxed max-w-sm font-medium">
                        Join your institution's central hub. Your academic journey synchronized perfectly.
                    </p>
                </div>

                {/* Profile Assembly Sync Animation */}
                <div className="relative flex-1 flex items-center justify-center w-full my-8">
                    {/* Pulsing Back Glow */}
                    <div className="absolute w-56 h-56 bg-white/5 rounded-full blur-[40px] animate-pulse"></div>

                    {/* Central Identity Node */}
                    <div className="absolute z-30 w-24 h-24 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                        <div className="w-16 h-16 bg-gradient-to-tr from-blue-300 to-indigo-300 rounded-full flex items-center justify-center shadow-inner">
                            <User className="w-8 h-8 text-indigo-900" />
                        </div>
                    </div>

                    {/* Internal Dashed Orbit */}
                    <div className="absolute w-40 h-40 border-[2px] border-dashed border-white/20 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>

                    {/* Outer Orbit Path */}
                    <div className="absolute z-20 w-[17rem] h-[17rem] border-[1.5px] border-white/10 rounded-full animate-[spin_12s_linear_infinite]">
                        
                        {/* Satellite: Program (GraduationCap) */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            {/* Counter-spin so the icon stays upright! */}
                            <div className="animate-[spin_12s_linear_infinite_reverse]">
                                <div className="w-14 h-14 bg-[#1e1b4b]/80 backdrop-blur-md border border-indigo-400/50 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(129,140,248,0.4)] transform rotate-12">
                                    <GraduationCap className="w-6 h-6 text-indigo-300 drop-shadow-[0_0_8px_#818cf8]" />
                                </div>
                            </div>
                        </div>

                        {/* Satellite: Department (Briefcase) */}
                        <div className="absolute top-[75%] left-[93.3%] -translate-x-1/2 -translate-y-1/2">
                            <div className="animate-[spin_12s_linear_infinite_reverse]">
                                <div className="w-12 h-12 bg-[#0ea5e9]/20 backdrop-blur-md border border-cyan-400/50 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                                    <Briefcase className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_8px_#22d3ee]" />
                                </div>
                            </div>
                        </div>

                        {/* Satellite: IDs (Hash) */}
                        <div className="absolute top-[75%] left-[6.7%] -translate-x-1/2 -translate-y-1/2">
                            <div className="animate-[spin_12s_linear_infinite_reverse]">
                                <div className="w-12 h-12 bg-[#9333ea]/30 backdrop-blur-md border border-fuchsia-400/50 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(232,121,249,0.4)]">
                                    <Hash className="w-5 h-5 text-fuchsia-300 drop-shadow-[0_0_8px_#e879f9]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Intersecting Data Streams */}
                    <div className="absolute w-[350px] h-6 border-b border-t border-white/5 bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45 pointer-events-none"></div>
                    <div className="absolute w-[350px] h-6 border-b border-t border-white/5 bg-gradient-to-r from-transparent via-white/10 to-transparent rotate-45 pointer-events-none"></div>

                    {/* Floating Data Particles */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute w-2 h-2 bg-indigo-300 rounded-full shadow-[0_0_10px_#818cf8] top-[20%] left-[25%] animate-[ping_3s_ease-in-out_infinite]"></div>
                        <div className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#22d3ee] bottom-[30%] right-[20%] animate-[ping_4s_ease-in-out_infinite_reverse]"></div>
                        <div className="absolute w-2 h-2 bg-fuchsia-300 rounded-full shadow-[0_0_10px_#e879f9] top-[40%] right-[15%] animate-[ping_2s_ease-in-out_infinite]"></div>
                    </div>
                </div>

                <div className="relative z-10 text-xs font-bold tracking-widest uppercase text-blue-200/80">
                    © {new Date().getFullYear()} SeatSync System
                </div>
            </div>

            {/* Right Panel - Form Area */}
            <div className="flex-1 flex flex-col relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] overflow-y-auto h-screen">
                <div className={`w-full max-w-[650px] mx-auto p-8 lg:p-12 my-auto transition-transform ${shake ? 'animate-shake' : ''}`}>
                    
                    <div className="mb-10 lg:mb-12">
                        <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">Student Registration</h1>
                        <p className="text-[15px] text-slate-500 mt-2 font-medium">Please provide accurate academic details.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-8">
                        
                        {/* Section: Personal Info */}
                        <div className="space-y-5">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputField 
                                    label="Full Name" 
                                    icon={User} 
                                    type="text" 
                                    name="FullName" 
                                    placeholder="John Doe" 
                                    formData={formData} 
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    disabled={isLoading}
                                    error={touchedFields.has('FullName') ? errors.FullName : undefined}
                                />
                                <InputField 
                                    label="College Email" 
                                    icon={Mail} 
                                    type="email" 
                                    name="Email" 
                                    placeholder="john@sjcetpalai.ac.in" 
                                    formData={formData} 
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    disabled={isLoading}
                                    error={touchedFields.has('Email') ? errors.Email : undefined}
                                />
                            </div>
                        </div>

                        {/* Section: Academic Info */}
                        <div className="space-y-5">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Academic Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputField 
                                    label="Register Number" 
                                    icon={Hash} 
                                    type="text" 
                                    name="RegisterNumber" 
                                    placeholder="SJC24MCA..." 
                                    formData={formData} 
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    disabled={isLoading}
                                    error={touchedFields.has('RegisterNumber') ? errors.RegisterNumber : undefined}
                                />
                                
                                <div className="relative group col-span-1">
                                    <div className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ml-1 ${errors.BatchYear && touchedFields.has('BatchYear') ? 'text-red-600' : 'text-slate-500'}`}>
                                        Batch Year (Year Joined)
                                    </div>
                                    <div className="relative flex items-center transition-all duration-300">
                                        <div className={`absolute left-4 group-focus-within:text-blue-600 transition-colors ${errors.BatchYear && touchedFields.has('BatchYear') ? 'text-red-500' : 'text-slate-400'}`}>
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            name="BatchYear"
                                            id="BatchYear"
                                            value={formData.BatchYear}
                                            onChange={handleInputChange}
                                            onBlur={() => handleBlur('BatchYear')}
                                            onFocus={(e) => e.target.select()}
                                            className={`w-full bg-white border text-slate-900 text-[15px] font-medium rounded-xl focus:outline-none block pl-12 pr-4 py-3.5 transition-all shadow-sm placeholder:text-slate-400 ${
                                                errors.BatchYear && touchedFields.has('BatchYear')
                                                    ? 'border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500'
                                                    : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                                            }`}
                                            placeholder="e.g. 2024"
                                            disabled={isLoading}
                                        />
                                    </div>
                                    {errors.BatchYear && touchedFields.has('BatchYear') && (
                                        <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {errors.BatchYear}
                                        </div>
                                    )}
                                    <p className="mt-2 ml-1 text-[11px] text-slate-400">
                                        Enter the year you joined the program.
                                    </p>
                                </div>

                                <div className="relative group col-span-1">
                                    <div className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ml-1 ${errors.DepartmentID && touchedFields.has('DepartmentID') ? 'text-red-600' : 'text-slate-500'}`}>
                                        Department <span className="text-[10px] text-slate-400 font-normal lowercase">(Optional)</span>
                                    </div>
                                    <div className="relative flex items-center transition-all duration-300">
                                        <div className={`absolute left-4 group-focus-within:text-blue-600 transition-colors ${errors.DepartmentID && touchedFields.has('DepartmentID') ? 'text-red-500' : 'text-slate-400'}`}>
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <select
                                            name="DepartmentID"
                                            id="DepartmentID"
                                            value={formData.DepartmentID}
                                            onChange={handleInputChange}
                                            onBlur={() => handleBlur('DepartmentID')}
                                            className={`w-full bg-white border text-slate-900 text-[15px] font-medium rounded-xl focus:outline-none block pl-12 pr-4 py-3.5 transition-all shadow-sm appearance-none outline-none ${
                                                errors.DepartmentID && touchedFields.has('DepartmentID')
                                                    ? 'border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500'
                                                    : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                                            }`}
                                            disabled={isLoading || departments.length === 0}
                                        >
                                            <option value="">Select Department...</option>
                                            {departments.map(d => (
                                                <option key={d.DepartmentID} value={d.DepartmentID}>{d.DepartmentName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {errors.DepartmentID && touchedFields.has('DepartmentID') && (
                                        <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                            {errors.DepartmentID}
                                        </div>
                                    )}
                                </div>

                                <div className="relative group col-span-1">
                                    <div className={`block text-[11px] font-bold uppercase tracking-widest mb-2 ml-1 ${errors.ProgramID && touchedFields.has('ProgramID') ? 'text-red-600' : 'text-slate-500'}`}>
                                        Program <span className="text-[10px] text-slate-400 font-normal lowercase">(Optional)</span>
                                    </div>
                                    <div className="relative flex items-center transition-all duration-300">
                                        <div className={`absolute left-4 group-focus-within:text-blue-600 transition-colors ${errors.ProgramID && touchedFields.has('ProgramID') ? 'text-red-500' : 'text-slate-400'}`}>
                                            <GraduationCap className="w-5 h-5" />
                                        </div>
                                        <select
                                            name="ProgramID"
                                            id="ProgramID"
                                            value={formData.ProgramID}
                                            onChange={handleInputChange}
                                            onBlur={() => handleBlur('ProgramID')}
                                            className={`w-full bg-white border text-slate-900 text-[15px] font-medium rounded-xl focus:outline-none block pl-12 pr-4 py-3.5 transition-all shadow-sm appearance-none outline-none ${
                                                errors.ProgramID && touchedFields.has('ProgramID')
                                                    ? 'border-red-500 focus:ring-4 focus:ring-red-500/10 focus:border-red-500'
                                                    : 'border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                                            }`}
                                            disabled={isLoading || !formData.DepartmentID}
                                        >
                                            <option value="">Select Program...</option>
                                            {filteredPrograms.map(p => (
                                                <option key={p.ProgramID} value={p.ProgramID}>{p.ProgramName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section: Security */}
                        <div className="space-y-5">
                            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Security</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <InputField 
                                    label="Password" 
                                    icon={Lock} 
                                    type="password" 
                                    name="Password" 
                                    placeholder="••••••••" 
                                    formData={formData} 
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    disabled={isLoading}
                                    error={touchedFields.has('Password') ? errors.Password : undefined}
                                />
                                <InputField 
                                    label="Confirm Password" 
                                    icon={Lock} 
                                    type="password" 
                                    name="ConfirmPassword" 
                                    placeholder="••••••••" 
                                    formData={formData} 
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    disabled={isLoading}
                                    error={touchedFields.has('ConfirmPassword') ? errors.ConfirmPassword : undefined}
                                />
                            </div>
                        </div>

                        {/* Password Requirements Info */}
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <h4 className="text-[12px] font-bold text-blue-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Password Requirements
                            </h4>
                            <ul className="text-[12px] text-blue-800 space-y-1.5 ml-6">
                                <li className="list-disc">At least 8 characters long</li>
                                <li className="list-disc">Contains uppercase letters (A-Z)</li>
                                <li className="list-disc">Contains lowercase letters (a-z)</li>
                                <li className="list-disc">Contains numbers (0-9)</li>
                                <li className="list-disc">Contains special characters (@, #, $, %, !, etc.)</li>
                            </ul>
                        </div>

                        <div className="pt-6 flex items-center justify-between">
                            <Link to="/student/login" className="text-xs font-bold tracking-widest uppercase text-slate-500 hover:text-blue-600 transition-colors">
                                ← Back to Login
                            </Link>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="group relative flex items-center gap-2 py-4 px-8 text-sm font-bold rounded-xl text-white bg-[#0f172a] hover:bg-[#1e293b] focus:outline-none focus:ring-4 focus:ring-slate-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_8px_20px_rgba(15,23,42,0.15)]"
                            >
                                {isLoading ? (
                                    <>PROCESSING <Loader2 className="w-5 h-5 animate-spin ml-2" /></>
                                ) : (
                                    <>
                                        <span className="tracking-wide uppercase">Register Profile</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-1" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};

export default StudentRegister;
