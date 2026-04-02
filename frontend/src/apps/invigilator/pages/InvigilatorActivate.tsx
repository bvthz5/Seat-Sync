import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck as ShieldIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';

const InvigilatorActivate: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error('Invalid or missing activation token.');
            navigate('/invigilator/login');
        }
    }, [token, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/invigilators/activate', { token, password });
            toast.success('Account activated successfully!');
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/invigilator/login');
            }, 3000);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Activation failed. The link might be expired.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center p-4">
                <div className="bg-white max-w-md w-full rounded-3xl p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50/50">
                        <ShieldIcon size={32} className="text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Activated</h2>
                    <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        Your faculty account has been successfully secured and activated. You can now access the invigilator portal.
                    </p>
                    <button
                        onClick={() => navigate('/invigilator/login')}
                        className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-md"
                    >
                        Proceed to Login <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4">
            <div className="mb-8 text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
                    <ShieldCheck size={24} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 mb-1">Activate Account</h1>
                <p className="text-slate-500 text-sm">Set your secure access password</p>
            </div>

            <div className="bg-white max-w-md w-full rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3 text-sm text-blue-700 leading-relaxed mb-6">
                        <Mail size={20} className="shrink-0 mt-0.5" />
                        <p>Welcome to SeatSync. Please create a strong password to activate your faculty account.</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 text-left block uppercase tracking-widest px-1">
                            New Password
                        </label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-12 pl-11 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                placeholder="Min. 8 characters"
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-400 text-left block uppercase tracking-widest px-1">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                                placeholder="Re-enter password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70 disabled:hover:bg-blue-600 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                        {isLoading ? 'Activating...' : 'Activate & Secure Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default InvigilatorActivate;
