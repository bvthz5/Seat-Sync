
import React, { useState, useEffect } from 'react';
import { Button, Card, CardBody } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../../services/auth.service';
import {
    ShieldCheck,
    CheckCircle2,
    Eye,
    EyeOff,
    XCircle,
    KeyRound,
    AlertCircle
} from 'lucide-react';

// --- Custom Input Component (Borderless & Consistent) ---
const CustomInput = ({
    label,
    value,
    onChange,
    placeholder,
    type = "text",
    icon,
    error,
    id,
    name,
    autoComplete
}: any) => {
    const [isVisible, setIsVisible] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (isVisible ? "text" : "password") : type;

    return (
        <div className="group flex flex-col gap-2 w-full">
            <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            <div className={`
                relative flex items-center w-full h-14 rounded-xl overflow-hidden bg-slate-50 border-none transition-all duration-300
                ${error ? 'bg-red-50' : 'hover:bg-slate-100 focus-within:!bg-white focus-within:shadow-xl focus-within:shadow-blue-100'}
            `}>
                {icon && (
                    <div className={`w-14 h-full flex items-center justify-center border-r border-transparent transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-blue-600'}`}>
                        {icon}
                    </div>
                )}

                <input
                    id={id}
                    name={name}
                    autoComplete={autoComplete}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`
                        flex-1 h-full px-4 outline-none bg-transparent font-medium text-lg placeholder:text-slate-300 !border-none !ring-0 !shadow-none focus:!ring-0
                        ${error ? 'text-red-900' : 'text-slate-800'}
                        ${icon ? '' : 'pl-5'} 
                    `}
                />

                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        className="px-4 h-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                    >
                        {isVisible ? <Eye /> : <EyeOff />}
                    </button>
                )}
            </div>
            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-bold text-red-500 ml-1 mt-1">
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ChangePassword: React.FC = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // UI State
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // Validation State
    const [requirements, setRequirements] = useState({
        minLength: false,
        upper: false,
        lower: false,
        number: false,
        special: false,
        match: false
    });

    useEffect(() => {
        setRequirements({
            minLength: newPassword.length >= 8,
            upper: /[A-Z]/.test(newPassword),
            lower: /[a-z]/.test(newPassword),
            number: /[0-9]/.test(newPassword),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
            match: newPassword !== '' && newPassword === confirmPassword
        });
    }, [newPassword, confirmPassword]);

    const calculateStrength = () => {
        let score = 0;
        if (requirements.minLength) score++;
        if (requirements.upper) score++;
        if (requirements.lower) score++;
        if (requirements.number) score++;
        if (requirements.special) score++;
        return score; // Max 5
    };

    const getStrengthColor = (score: number) => {
        if (score <= 1) return 'bg-red-500';
        if (score <= 3) return 'bg-amber-500';
        if (score === 4) return 'bg-blue-500';
        return 'bg-emerald-500';
    };

    const getStrengthLabel = (score: number) => {
        if (score === 0) return 'Weak';
        if (score <= 2) return 'Fair';
        if (score <= 4) return 'Good';
        return 'Strong';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (Object.values(requirements).some(req => !req) && confirmPassword) {
            // Allow match to be checked only if confirm is filled.
        }

        // Strict Validation before submit
        if (!requirements.minLength || !requirements.upper || !requirements.match) {
            setError('Please fulfill all password requirements.');
            return;
        }

        setLoading(true);
        try {
            await AuthService.changePassword(currentPassword, newPassword);
            setMessage('Password changed successfully. You can now login with your new password.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to change password. check your current password.');
        } finally {
            setLoading(false);
        }
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <motion.div
            className="p-6 md:p-12 max-w-[1600px] mx-auto min-h-screen flex flex-col items-center justify-center scroll-smooth"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="w-full max-w-6xl">
                <div className="mb-12 text-center max-w-3xl mx-auto">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center justify-center p-3 bg-white text-blue-600 rounded-2xl mb-5 shadow-lg shadow-blue-100 ring-1 ring-blue-50"
                    >
                        <ShieldCheck size={32} strokeWidth={1.5} />
                    </motion.div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight mb-3">Security Settings</h1>
                    <p className="text-lg text-slate-500 font-medium">
                        Update your password to ensure your account stays secure.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
                    {/* Left Column: Form */}
                    <div className="lg:col-span-7 xl:col-span-8">
                        <Card className="border border-slate-200/60 shadow-2xl shadow-slate-200/50 bg-white rounded-[2rem] overflow-hidden h-full">

                            <CardBody className="p-8 md:p-16">
                                <div className="flex items-center gap-6 mb-12">
                                    <div className="p-4 bg-slate-50 rounded-2xl text-slate-700 border border-slate-100">
                                        <KeyRound size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-slate-800">Change Password</h3>
                                        <p className="text-slate-500 font-medium mt-1">Enter your details below to update key</p>
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {message && (
                                        <motion.div
                                            key="success-message"
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-6 py-5 rounded-2xl text-md font-semibold flex items-center gap-4 shadow-sm"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                                                <CheckCircle2 size={18} />
                                            </div>
                                            {message}
                                        </motion.div>
                                    )}
                                    {error && (
                                        <motion.div
                                            key="error-message"
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            className="bg-red-50 border border-red-100 text-red-700 px-6 py-5 rounded-2xl text-md font-semibold flex items-center gap-4 shadow-sm"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                                                <XCircle size={18} />
                                            </div>
                                            {error}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                                    {/* Current Password */}
                                    <CustomInput
                                        label="Current Password"
                                        id="currentPassword"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e: any) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter your current password"
                                    />

                                    <div className="w-full h-px bg-slate-100"></div>

                                    {/* New Password */}
                                    <div className="space-y-4">
                                        <CustomInput
                                            label="New Password"
                                            id="newPassword"
                                            type="password"
                                            value={newPassword}
                                            onChange={(e: any) => setNewPassword(e.target.value)}
                                            placeholder="Create a strong password"
                                        />

                                        {/* Strength Meter */}
                                        <div className="px-2">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Strength</span>
                                                <span className={`text-xs font-bold transition-colors duration-300 ${calculateStrength() <= 2 ? 'text-red-500' :
                                                    calculateStrength() <= 3 ? 'text-amber-500' : 'text-emerald-600'
                                                    }`}>
                                                    {getStrengthLabel(calculateStrength())}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    className={`h-full rounded-full ${getStrengthColor(calculateStrength())}`}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(calculateStrength() / 5) * 100}%` }}
                                                    transition={{ duration: 0.5, ease: "circOut" }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-3">
                                        <CustomInput
                                            label="Confirm New Password"
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e: any) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat your new password"
                                        />

                                        <AnimatePresence>
                                            {confirmPassword && !requirements.match && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex items-center gap-2 text-sm text-red-500 font-semibold px-2"
                                                >
                                                    <AlertCircle size={14} /> Passwords do not match
                                                </motion.div>
                                            )}
                                            {requirements.match && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex items-center gap-2 text-sm text-emerald-600 font-semibold px-2"
                                                >
                                                    <CheckCircle2 size={14} /> Passwords match
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="pt-8">
                                        <Button
                                            type="submit"
                                            size="lg"
                                            isLoading={loading}
                                            isDisabled={loading || calculateStrength() < 3 || !requirements.match}
                                            className={`w-full font-bold text-lg h-16 rounded-xl shadow-xl shadow-indigo-500/20 transition-all transform duration-300 ${loading || calculateStrength() < 3 || !requirements.match
                                                ? 'bg-slate-100 text-slate-400 opacity-80 cursor-not-allowed shadow-none'
                                                : 'bg-slate-900 text-white hover:bg-black hover:-translate-y-1 hover:shadow-2xl'
                                                }`}
                                        >
                                            Update Password
                                        </Button>
                                    </div>
                                </form>
                            </CardBody>
                        </Card>
                    </div>

                    {/* Right Column: Requirements (Sticky) */}
                    <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-8 mt-6 lg:mt-0">
                        <Card className="border-none shadow-2xl shadow-slate-900/20 bg-slate-900 text-white rounded-[2rem] overflow-hidden relative min-h-[640px] flex flex-col h-full">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>
                            <div className="absolute top-0 right-0 p-12 opacity-[0.05] -rotate-12 translate-x-12 -translate-y-12">
                                <ShieldCheck size={300} />
                            </div>

                            <CardBody className="p-10 relative z-10 flex flex-col h-full">
                                <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-10 border border-white/10 shadow-lg">
                                    <ShieldCheck size={32} className="text-white" />
                                </div>

                                <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Security Checklist</h3>
                                <p className="text-slate-400 text-lg mb-12 leading-relaxed font-medium">
                                    Please meet these requirements to ensure maximum account security.
                                </p>

                                <div className="space-y-8 flex-1">
                                    <RequirementItem
                                        text="Minimum 8 characters"
                                        met={requirements.minLength}
                                    />
                                    <RequirementItem
                                        text="Uppercase & lowercase letters"
                                        met={requirements.upper && requirements.lower}
                                    />
                                    <RequirementItem
                                        text="At least one number (0-9)"
                                        met={requirements.number}
                                    />
                                    <RequirementItem
                                        text="Special character (!@#$%^&*)"
                                        met={requirements.special}
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const RequirementItem = ({ text, met }: { text: string; met: boolean }) => (
    <motion.div
        className="flex items-center gap-5 group"
        animate={{ opacity: met ? 1 : 0.5 }}
        transition={{ duration: 0.3 }}
    >
        <div className="relative">
            <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ease-out ${met ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'border-slate-600 text-transparent bg-transparent group-hover:border-slate-500'
                    }`}
                initial={false}
                animate={{ scale: met ? 1.1 : 1 }}
            >
                <CheckCircle2 size={16} strokeWidth={4} className={met ? 'opacity-100' : 'opacity-0'} />
            </motion.div>
        </div>
        <span className={`text-lg font-medium transition-colors duration-300 ${met ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'}`}>
            {text}
        </span>
    </motion.div>
);

export default ChangePassword;
