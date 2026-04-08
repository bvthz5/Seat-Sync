import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../../services/api';

type ActivationState = 'verifying' | 'valid' | 'invalid' | 'activated';

const strengthLabel = (password: string) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: 'Weak', color: 'bg-rose-500', width: '20%' };
    if (score <= 3) return { label: 'Fair', color: 'bg-amber-500', width: '55%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-blue-500', width: '80%' };
    return { label: 'Very strong', color: 'bg-emerald-500', width: '100%' };
};

const ActivateAccountPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';

    const [pageState, setPageState] = useState<ActivationState>('verifying');
    const [errorMessage, setErrorMessage] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

    const strength = useMemo(() => strengthLabel(password), [password]);
    const passwordMatch = password && confirmPassword ? password === confirmPassword : true;

    useEffect(() => {
        if (resendCooldownSeconds <= 0) return;

        const timer = window.setInterval(() => {
            setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => window.clearInterval(timer);
    }, [resendCooldownSeconds]);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setPageState('invalid');
                setErrorMessage('Invalid activation link. No token was provided.');
                return;
            }

            try {
                const response = await api.get('/invigilators/activate/verify', { params: { token } });
                if (response.data?.valid) {
                    setPageState('valid');
                    setErrorMessage('');
                    return;
                }

                setPageState('invalid');
                setErrorMessage(response.data?.message || 'Activation link is invalid or has expired.');
            } catch (error: any) {
                setPageState('invalid');
                if (error.response?.status === 429) {
                    const retryAfter = Number(error.response?.headers?.['retry-after'] || 60);
                    setResendCooldownSeconds(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60);
                    setErrorMessage('Too many attempts. Please wait a minute and try again.');
                    return;
                }

                setErrorMessage(error.response?.data?.message || 'Unable to verify activation link.');
            }
        };

        verifyToken();
    }, [token]);

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long.');
            return;
        }

        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
            toast.error('Use upper case, lower case, and a number for a stronger password.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/invigilators/activate', { token, password });
            setPageState('activated');
            toast.success('Account activated successfully.');
        } catch (error: any) {
            if (error.response?.status === 429) {
                const retryAfter = Number(error.response?.headers?.['retry-after'] || 60);
                setResendCooldownSeconds(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60);
                toast.error('Too many activation attempts. Please wait and try again.');
                return;
            }

            toast.error(error.response?.data?.message || 'Activation failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Enter the email address used for registration.');
            return;
        }

        if (resendCooldownSeconds > 0) {
            toast.error(`Please wait ${resendCooldownSeconds}s before requesting a new link.`);
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/invigilators/activate/resend', { email });
            toast.success('A fresh activation link has been sent.');
        } catch (error: any) {
            if (error.response?.status === 429) {
                const retryAfter = Number(error.response?.headers?.['retry-after'] || 60);
                const seconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;
                setResendCooldownSeconds(seconds);
                toast.error(`Too many requests. Try again in ${seconds}s.`);
                return;
            }

            toast.error(error.response?.data?.message || 'Unable to resend activation link.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eff6ff_0%,_#f8fafc_38%,_#e2e8f0_100%)] flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-2xl shadow-slate-900/20 mb-4">
                        <ShieldCheck size={26} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Activate your account</h1>
                    <p className="text-slate-500 mt-2">Complete secure onboarding for the invigilator portal.</p>
                </div>

                <div className="bg-white/95 backdrop-blur-sm border border-white shadow-[0_30px_80px_rgba(15,23,42,0.12)] rounded-3xl p-8 sm:p-10">
                    {pageState === 'verifying' && (
                        <div className="py-10 text-center space-y-4">
                            <Loader2 className="mx-auto animate-spin text-blue-600" size={36} />
                            <h2 className="text-xl font-bold text-slate-900">Verifying activation link</h2>
                            <p className="text-slate-500 text-sm">Please wait while we confirm your secure token.</p>
                        </div>
                    )}

                    {pageState === 'valid' && (
                        <form onSubmit={handleActivate} className="space-y-5">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex gap-3 text-sm text-blue-800">
                                <Mail size={18} className="mt-0.5 shrink-0" />
                                <p>Token confirmed. Set a strong password to activate your account.</p>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="activation-password" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Password</label>
                                <div className="relative">
                                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="activation-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 pl-11 pr-11 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                        placeholder="Create a strong password"
                                        autoComplete="new-password"
                                        minLength={8}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span>{strength.label} password</span>
                                    <span>8+ chars, mixed case, number</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${strength.color}`} style={{ width: strength.width }} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="activation-confirm-password" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Confirm password</label>
                                <input
                                    id="activation-confirm-password"
                                    name="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={`w-full h-12 px-4 rounded-xl bg-slate-50 border outline-none focus:bg-white focus:ring-4 transition-all ${confirmPassword && !passwordMatch ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'}`}
                                    placeholder="Re-enter password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                />
                                {confirmPassword && !passwordMatch && (
                                    <p className="text-xs text-rose-600">Passwords do not match.</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition disabled:opacity-70"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                                {isSubmitting ? 'Activating...' : 'Activate account'}
                            </button>
                        </form>
                    )}

                    {pageState === 'invalid' && (
                        <div className="space-y-6 text-center">
                            <div className="mx-auto w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                                <TriangleAlert size={30} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Activation link unavailable</h2>
                                <p className="mt-2 text-sm text-slate-500">{errorMessage || 'The link is invalid or expired.'}</p>
                            </div>

                            <form onSubmit={handleResend} className="space-y-3 text-left">
                                <label htmlFor="activation-email" className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Resend activation link</label>
                                <input
                                    id="activation-email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="Enter your email address"
                                    autoComplete="email"
                                    required
                                />
                                {resendCooldownSeconds > 0 && (
                                    <p className="text-xs text-amber-700">Please wait {resendCooldownSeconds}s before requesting another link.</p>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSubmitting || resendCooldownSeconds > 0}
                                    className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                    {resendCooldownSeconds > 0 ? `Retry in ${resendCooldownSeconds}s` : 'Resend activation link'}
                                </button>
                            </form>
                        </div>
                    )}

                    {pageState === 'activated' && (
                        <div className="py-8 text-center space-y-5">
                            <div className="mx-auto w-18 h-18 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <CheckCircle2 size={34} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Account activated</h2>
                                <p className="mt-2 text-sm text-slate-500">Your password has been set successfully. You can now sign in.</p>
                            </div>
                            <button
                                onClick={() => navigate('/invigilator/login')}
                                className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-2 transition"
                            >
                                Continue to login <ArrowRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivateAccountPage;
