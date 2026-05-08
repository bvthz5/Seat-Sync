import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Lock, 
    Eye, 
    EyeOff, 
    ShieldCheck, 
    ArrowRight, 
    Loader2, 
    KeyRound, 
    ShieldAlert, 
    CheckCircle2,
    ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AccessTokenStore } from '../../../services/api';

const StudentChangePassword: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isTemporary = location.state?.isTemporary || !!sessionStorage.getItem("tempAccessToken");

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPasswords, setShowPasswords] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (newPassword.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);
        try {
            const token = AccessTokenStore.token || sessionStorage.getItem("tempAccessToken");
            
            if (!token) {
                throw new Error("Session expired. Please login again.");
            }

            const response = await fetch('/api/auth/student/change-password', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update security credentials');
            }

            toast.success("Security credentials updated!");
            
            if (data.accessToken) {
                AccessTokenStore.setToken(data.accessToken);
            }
            sessionStorage.removeItem("tempAccessToken");

            setTimeout(() => {
                window.location.replace('/student/dashboard');
            }, 1500);

        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-inter bg-[#f8fafc] relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] opacity-50"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3"></div>

            <div className="relative z-10 w-full flex flex-col items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-[480px]">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-6 shadow-sm">
                            <ShieldCheck size={14} className="text-indigo-600" />
                            <span className="text-[10px] font-bold tracking-[0.15em] text-indigo-700 uppercase">Security Center</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Security <span className="text-indigo-600">Update</span></h1>
                        <p className="text-slate-500 text-sm font-medium max-w-[320px] mx-auto">
                            {isTemporary 
                                ? "Your account is using a temporary password. Please establish a secure permanent password."
                                : "Update your account security by choosing a new, robust password."
                            }
                        </p>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="p-8 sm:p-10">
                            <form onSubmit={handleChangePassword} className="space-y-6">
                                {/* Current Password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <KeyRound size={18} />
                                        </div>
                                        <input
                                            type={showPasswords ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-[15px] font-medium rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block pl-12 pr-12 py-4 transition-all outline-none placeholder:text-slate-300"
                                            placeholder="••••••••"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="w-full h-px bg-slate-100 my-2" />

                                {/* New Password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Secure Password</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            type={showPasswords ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-[15px] font-medium rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block pl-12 pr-12 py-4 transition-all outline-none placeholder:text-slate-300"
                                            placeholder="Enter 8+ characters"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords(!showPasswords)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirm Password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <ShieldAlert size={18} />
                                        </div>
                                        <input
                                            type={showPasswords ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-[15px] font-medium rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 block pl-12 pr-12 py-4 transition-all outline-none placeholder:text-slate-300"
                                            placeholder="Re-type new password"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Password Requirements</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <RequirementItem label="Min. 8 characters" met={newPassword.length >= 8} />
                                            <RequirementItem label="Complexity" met={newPassword.length > 0} />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4.5 rounded-2xl transition-all duration-300 shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 group disabled:opacity-70 disabled:shadow-none"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                ACTIVATE SECURITY
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {!isTemporary && (
                        <button 
                            onClick={() => navigate(-1)}
                            className="mt-8 mx-auto flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs transition-colors"
                        >
                            <ArrowLeft size={16} /> Go Back
                        </button>
                    )}

                    <div className="mt-12 text-center">
                        <p className="text-[10px] text-slate-400 font-bold tracking-[0.3em] uppercase">
                            SeatSync Encryption Protocol v2.0
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RequirementItem = ({ label, met }: { label: string; met: boolean }) => (
    <div className="flex items-center gap-2">
        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${met ? 'bg-emerald-500' : 'bg-slate-200'}`}>
            <CheckCircle2 size={10} className="text-white" />
        </div>
        <span className={`text-[10px] font-bold ${met ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
    </div>
);

export default StudentChangePassword;
