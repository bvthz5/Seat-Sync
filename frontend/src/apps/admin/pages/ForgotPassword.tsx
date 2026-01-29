import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Link } from '@heroui/react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { AuthService } from '../../../services/auth.service';

// --- Icons ---
const EmailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const SeatSyncLogo = () => (
    <div className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-lg text-white font-bold text-xl">
        S
    </div>
);

// --- Reuse CustomInput (Simplified for brevity, or export it from Login if possible. For now, duplication is safer to avoid breaking Login) ---
const CustomInput = ({ label, value, onChange, placeholder, type = "text", icon, error, id, name, autoComplete }: any) => (
    <div className="group flex flex-col gap-2 w-full">
        <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">{label}</label>
        <div className={`relative flex items-center w-full h-14 rounded-xl overflow-hidden bg-slate-50 border-2 transition-all duration-200 ${error ? 'border-red-300 bg-red-50' : 'border-slate-100 group-focus-within:border-slate-900 group-focus-within:shadow-lg'}`}>
            <div className={`w-14 h-full flex items-center justify-center border-r transition-colors ${error ? 'border-red-200 text-red-400' : 'border-slate-200 text-slate-400 group-focus-within:text-slate-800'}`}>{icon}</div>
            <input id={id} name={name} autoComplete={autoComplete} type={type} value={value} onChange={onChange} placeholder={placeholder} className={`flex-1 h-full px-4 outline-none bg-transparent font-medium text-lg placeholder:text-slate-300 !border-none !ring-0 !shadow-none focus:!ring-0 ${error ? 'text-red-900' : 'text-slate-800'}`} />
        </div>
        <AnimatePresence>{error && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="text-[11px] font-bold text-red-500 ml-1">{error}</motion.div>)}</AnimatePresence>
    </div>
);

// --- Background Components (Reused) ---
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

// --- Main Component ---
const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validate = () => {
        if (!email) { setEmailError('Email is required'); return false; }
        if (!email.includes('@')) { setEmailError('Invalid email format'); return false; }
        setEmailError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        if (!validate()) return;
        setLoading(true);
        try {
            await AuthService.forgotPassword(email);
            setMessage('If an account exists, a reset link has been sent to your email.');
        } catch (error) {
            setMessage('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full min-h-screen flex text-slate-800 bg-white overflow-hidden">
            {/* Left Panel - Simplified for this page */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-16 text-white h-screen overflow-hidden">
                <div className="absolute inset-0 opacity-50"><canvas className="w-full h-full" /></div> {/* Placeholder for neural net */}
                <div className="relative z-10 flex items-center gap-3"><SeatSyncLogo /><span className="text-xl font-bold tracking-wide">SeatSync</span></div>
                <div className="relative z-10 max-w-lg w-full">
                    <h1 className="text-4xl font-bold mb-4">Account Recovery</h1>
                    <p className="text-slate-400 text-lg">Lost your key? No worries. We'll verify your identity and get you back into the control center securely.</p>
                </div>
                <div className="relative z-10 flex gap-8 text-xs font-semibold tracking-widest text-slate-500 uppercase"><span>© 2026 SeatSync Systems</span></div>
            </div>

            {/* Right Panel */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white h-screen relative">
                <RevealBackground />
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[480px] flex flex-col gap-8 relative z-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password?</h2>
                        <p className="text-slate-500 mt-2">Enter your academic email to receive a reset link.</p>
                    </div>

                    <AnimatePresence>
                        {message && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className={`px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${message.includes('sent') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                {message}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                        <CustomInput label="Official Academic Email" id="email" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<EmailIcon />} error={emailError} placeholder="name@input.edu" />
                        <Button type="submit" size="lg" isLoading={loading} className="w-full h-14 bg-slate-900 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                            {loading ? 'SENDING...' : 'SEND RESET LINK'}
                        </Button>
                    </form>

                    <div className="text-center">
                        <Link href="#" onPress={() => navigate('/admin/login')} className="text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-wider">
                            Back to Login
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ForgotPassword;
