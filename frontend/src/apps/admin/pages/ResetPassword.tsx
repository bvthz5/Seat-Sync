import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthService } from '../../../services/auth.service';

const LockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const SeatSyncLogo = () => (
    <img
        src="/uploads/images/logo_uploaded_0.png"
        alt="SeatSync"
        className="w-12 h-12 object-contain bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 shadow-lg"
    />
);

const CustomInput = ({ label, value, onChange, placeholder, type = "text", icon, error, id, name }: any) => (
    <div className="group flex flex-col gap-2 w-full">
        <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <div className={`relative flex items-center w-full h-14 rounded-xl overflow-hidden bg-slate-50 border-2 transition-all duration-200 ${error ? 'border-red-300 bg-red-50' : 'border-slate-100 group-focus-within:border-slate-900 group-focus-within:shadow-lg'}`}>
            <div className={`w-14 h-full flex items-center justify-center border-r transition-colors ${error ? 'border-red-200 text-red-400' : 'border-slate-200 text-slate-400 group-focus-within:text-slate-800'}`}>{icon}</div>
            <input id={id} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={`flex-1 h-full px-4 outline-none bg-transparent font-medium text-lg placeholder:text-slate-300 ${error ? 'text-red-900' : 'text-slate-800'}`} />
        </div>
        <AnimatePresence>{error && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-bold text-red-500 ml-1">{error}</motion.div>)}</AnimatePresence>
    </div>
);

const RevealBackground = () => {
    const divRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (divRef.current?.parentElement) {
                const rect = divRef.current.parentElement.getBoundingClientRect();
                setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
        };
        const parent = divRef.current?.parentElement;
        if (parent) parent.addEventListener('mousemove', handleMouseMove);
        return () => parent?.removeEventListener('mousemove', handleMouseMove);
    }, []);
    return (
        <div ref={divRef} className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#0F172A 1.5px, transparent 1.5px)', backgroundSize: '32px 32px', maskImage: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`, WebkitMaskImage: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, black, transparent)` }}>
            <div className="absolute inset-0 opacity-5 bg-slate-900" />
        </div>
    );
};

const ResetPassword: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Invalid reset link.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await AuthService.resetPassword(token, password);
            setSuccess(true);
            setTimeout(() => navigate('/admin/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password. Link may be expired.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="w-full min-h-screen flex items-center justify-center bg-white text-slate-900">
                <div className="text-center p-8 max-w-md">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Password Reset!</h2>
                    <p className="text-slate-500 mb-6">Your password has been successfully updated. Redirecting to login...</p>
                    <Button onPress={() => navigate('/admin/login')} className="w-full bg-slate-900 text-white font-bold h-12 rounded-xl">Go to Login Now</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen flex text-slate-800 bg-white overflow-hidden">
            {/* Left Panel */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-16 text-white h-screen overflow-hidden">
                <div className="absolute inset-0 opacity-50"><canvas className="w-full h-full" /></div>
                <div className="relative z-10 flex items-center gap-3"><SeatSyncLogo /><span className="text-xl font-bold tracking-wide">SeatSync</span></div>
                <div className="relative z-10 max-w-lg w-full">
                    <h1 className="text-4xl font-bold mb-4">Secure Access</h1>
                    <p className="text-slate-400 text-lg">Create a new strong password to protect the examination control portal.</p>
                </div>
                <div className="relative z-10 flex gap-8 text-xs font-semibold tracking-widest text-slate-500 uppercase"><span>© 2026 SeatSync Systems</span></div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white h-screen relative">
                <RevealBackground />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[480px] flex flex-col gap-8 relative z-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Set New Password</h2>
                        <p className="text-slate-500 mt-2">Enter your new secure access key below.</p>
                    </div>

                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <CustomInput label="New Password" id="newPass" type="password" value={password} onChange={(e: any) => setPassword(e.target.value)} icon={<LockIcon />} placeholder="••••••••••••" />
                        <CustomInput label="Confirm Password" id="confirmPass" type="password" value={confirmPassword} onChange={(e: any) => setConfirmPassword(e.target.value)} icon={<LockIcon />} placeholder="••••••••••••" />
                        <Button type="submit" size="lg" isLoading={loading} className="w-full h-14 bg-slate-900 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                            {loading ? 'RESETTING...' : 'RESET PASSWORD'}
                        </Button>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};

export default ResetPassword;
