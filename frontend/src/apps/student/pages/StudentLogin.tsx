import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, User, BookOpen, CalendarClock, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { AccessTokenStore } from '../../../services/api';

const StudentLogin: React.FC = () => {
    const navigate = useNavigate();
    const identifierRef = useRef<HTMLInputElement>(null);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);
    const [loginMethod, setLoginMethod] = useState<'email' | 'register'>('register');
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        if (identifierRef.current) {
            identifierRef.current.focus();
        }
    }, []);

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        setAuthError(null);
        const trimmedIdentifier = identifier.trim();
        if (!trimmedIdentifier || !password) {
            setAuthError("Please fill in all fields");
            toast.error("Please fill in all fields");
            triggerShake();
            return;
        }

        if (loginMethod === 'email' && !trimmedIdentifier.toLowerCase().endsWith("sjcetpalai.ac.in")) {
            toast.error("Please use your official @sjcetpalai.ac.in email");
            triggerShake();
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/student/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: trimmedIdentifier, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            if (data.requirePasswordChange) {
                // Store the temporary token so the change-password page can use it
                sessionStorage.setItem("tempAccessToken", data.tempToken);
                toast("Please change your password to continue", { icon: '🔒' });
                
                // Navigate to the change password page with the state
                navigate('/student/change-password', { state: { isTemporary: true } });
                return;
            }

            // Successfully logged in
            AccessTokenStore.setToken(data.accessToken);
            sessionStorage.setItem('seat_sync_active', 'true');

            toast.success("Welcome back!");
            // Reload so AuthContext can hydrate from the stored session/token cleanly
            window.location.replace('/student/dashboard');

        } catch (error: any) {
            setIsLoading(false);
            setAuthError(error.message);
            toast.error(error.message);
            triggerShake();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-inter overflow-hidden bg-slate-50">
            {/* Left Panel - Dark Tech Vibe */}
            <div className="hidden lg:flex lg:w-1/2 flex-col relative bg-[#0B1120] text-white p-8 overflow-hidden border-r border-[#1e293b]">
                {/* Tech grid background */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBoNDBWMEgwem00MCAwaC0xVjFoLTF2MzloMzhWem0wIDBoLTEtMXYtMWgxdjFINDB6IiBmaWxsPSIjMWUyOTNiIiBmaWxsLW9wYWNpdHk9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg==')] opacity-[0.15]"></div>

                {/* Glowing orb */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <ShieldCheck className="w-6 h-6 text-cyan-400" />
                    </div>
                    <span className="font-bold text-xl tracking-wide text-slate-100">SeatSync</span>
                </div>

                {/* Center Avatar Interface */}
                <div className="relative z-10 flex-1 flex items-center justify-center">
                    <div className="relative w-full max-w-[500px] aspect-square border border-slate-700/50 rounded-3xl bg-[#0f172a]/60 backdrop-blur-xl p-8 flex flex-col items-center justify-between shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        
                        {/* Top Label */}
                        <div className="border border-cyan-500/30 rounded-full px-8 py-2 text-cyan-400 text-xs font-bold tracking-[0.2em] uppercase bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                            Student Access Portal
                        </div>

                        {/* PRO-LEVEL Holographic Book Animation */}
                        <div className="relative w-80 h-80 my-2 flex items-center justify-center group flex-grow" style={{ perspective: '1000px' }}>
                            {/* Ambient background glow */}
                            <div className="absolute inset-0 bg-gradient-to-t from-cyan-600/10 via-blue-500/5 to-transparent rounded-full blur-[60px] group-hover:from-cyan-500/20 transition-all duration-1000 pointer-events-none"></div>
                            
                            {/* 3D Hologram Base Projector */}
                            <div className="absolute bottom-0 w-48 h-12 bg-cyan-950/40 border border-cyan-500/30 rounded-[100%] shadow-[0_0_40px_rgba(6,182,212,0.4)] flex items-center justify-center">
                                {/* Inner projector rings */}
                                <div className="w-32 h-6 border border-cyan-400/40 rounded-[100%] absolute animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                <div className="w-20 h-4 bg-cyan-400/60 rounded-[100%] blur-[8px] animate-pulse"></div>
                            </div>
                            
                            {/* Scanning Light Column */}
                            <div className="absolute bottom-6 w-32 h-64 bg-gradient-to-t from-cyan-400/20 via-cyan-400/5 to-transparent rounded-[100%] blur-[4px] animate-[pulse_3s_ease-in-out_infinite] pointer-events-none" style={{ WebkitMaskImage: 'linear-gradient(to bottom, transparent, white)' }}></div>

                            {/* Floating Isometric Core */}
                            <div className="relative z-20 flex items-center justify-center animate-[bounce_4s_ease-in-out_infinite]">
                                {/* Majestic layered glowing core */}
                                <div className="absolute inset-0 bg-cyan-400/30 blur-[40px] rounded-full mix-blend-screen animate-pulse pointer-events-none"></div>
                                
                                <div className="w-28 h-28 bg-gradient-to-tr from-cyan-950/90 to-blue-900/90 rounded-3xl border border-cyan-400/50 shadow-[0_0_60px_rgba(34,211,238,0.5)] flex items-center justify-center backdrop-blur-xl transform rotate-45 group-hover:rotate-[225deg] transition-all duration-[2000ms] ease-out">
                                    <div className="w-24 h-24 border border-cyan-300/30 rounded-2xl flex items-center justify-center bg-cyan-950/30">
                                        <div className="w-20 h-20 border border-cyan-200/20 rounded-xl flex items-center justify-center flex-col -rotate-45 group-hover:-rotate-[225deg] transition-all duration-[2000ms] ease-out">
                                            {/* Highly detailed stylized Book SVG */}
                                            <div className="relative">
                                                {/* Floating magical star */}
                                                <div className="absolute -top-4 -right-2 text-cyan-200 animate-[spin_3s_linear_infinite]">
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z" />
                                                    </svg>
                                                </div>
                                                <svg className="w-14 h-14 text-cyan-50 drop-shadow-[0_0_20px_#22d3ee]" viewBox="0 0 24 24" fill="url(#book-gradient)" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                                    <defs>
                                                        <linearGradient id="book-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                            <stop offset="0%" stopColor="#cffafe" stopOpacity="0.4" />
                                                            <stop offset="100%" stopColor="#0891b2" stopOpacity="0.8" />
                                                        </linearGradient>
                                                    </defs>
                                                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                                    {/* Central illuminated spine */}
                                                    <path d="M12 3v14" className="stroke-cyan-300" strokeWidth="2"></path>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Perfect Round Orbiting Rings */}
                            {/* Outer Orbit */}
                            <div className="absolute inset-0 border border-cyan-500/30 rounded-full animate-[spin_12s_linear_infinite] pointer-events-none flex items-center justify-center">
                                <div className="absolute top-0 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_20px_#22d3ee] -translate-y-1/2"></div>
                                <div className="absolute bottom-0 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa] translate-y-1/2"></div>
                            </div>
                            
                            {/* Middle Orbit */}
                            <div className="absolute inset-6 border border-blue-500/30 rounded-full animate-[spin_8s_linear_infinite_reverse] pointer-events-none flex items-center justify-center">
                                <div className="absolute right-0 w-3.5 h-3.5 bg-indigo-400 rounded-full shadow-[0_0_15px_#818cf8] translate-x-1/2"></div>
                            </div>

                            {/* Inner Orbit */}
                            <div className="absolute inset-[3.2rem] border border-slate-100/10 rounded-full animate-[spin_15s_linear_infinite] pointer-events-none flex items-center justify-center">
                                <div className="absolute top-[14%] right-[14%] w-2.5 h-2.5 bg-purple-400 rounded-full shadow-[0_0_15px_#a855f7]"></div>
                            </div>
                            
                            {/* Data particle swarm floating around */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_5px_#fff] top-1/4 left-1/4 animate-[ping_2s_ease-in-out_infinite]"></div>
                                <div className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_#22d3ee] top-1/3 right-1/4 animate-[ping_3s_ease-in-out_infinite_reverse]"></div>
                                <div className="absolute w-1 h-1 bg-blue-300 rounded-full shadow-[0_0_10px_#93c5fd] bottom-1/4 left-1/3 animate-[ping_4s_ease-in-out_infinite]"></div>
                                <div className="absolute w-2 h-2 bg-indigo-400/50 rounded-full blur-[1px] top-1/2 right-1/3 animate-[ping_5s_ease-in-out_infinite]"></div>
                            </div>
                        </div>

                        {/* High-tech Corner decorations */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-[1.5px] border-l-[1.5px] border-cyan-500/50 rounded-tl-3xl"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-[1.5px] border-r-[1.5px] border-cyan-500/50 rounded-tr-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[1.5px] border-l-[1.5px] border-cyan-500/50 rounded-bl-3xl"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[1.5px] border-r-[1.5px] border-cyan-500/50 rounded-br-3xl"></div>
                    </div>
                </div>

                {/* Footer labels */}
                <div className="relative z-10 flex justify-between items-center text-[10px] text-slate-500 font-mono tracking-widest pt-8 uppercase font-bold">
                    <span>Secure Student Environment</span>
                    <span>V2.4.0</span>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex-1 flex flex-col justify-center relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px]">
                <div className={`w-full max-w-[440px] mx-auto p-8 relative ${shake ? 'animate-shake' : ''}`}>
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            <span className="text-[10px] font-bold tracking-widest text-blue-700 uppercase">Student Portal</span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Student Sign In</h2>
                        <p className="text-sm text-slate-500 font-medium">Enter your credentials to access your dashboard</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Login Method Toggle */}
                        <div className="flex p-1.5 bg-slate-100/80 border border-slate-200/60 rounded-xl mb-6">
                            <button
                                type="button"
                                onClick={() => { setLoginMethod('email'); setIdentifier(''); identifierRef.current?.focus(); }}
                                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${loginMethod === 'email' ? 'bg-white text-blue-700 shadow-[0_2px_10px_rgba(0,0,0,0.05)]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                Official Email
                            </button>
                            <button
                                type="button"
                                onClick={() => { setLoginMethod('register'); setIdentifier(''); identifierRef.current?.focus(); }}
                                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${loginMethod === 'register' ? 'bg-white text-blue-700 shadow-[0_2px_10px_rgba(0,0,0,0.05)]' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                            >
                                Register Number
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="group">
                                <div className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                                    {loginMethod === 'email' ? 'Official Student Email' : 'Register Number'}
                                </div>
                                <div className="relative flex items-center transition-all duration-300">
                                    <div className="absolute left-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        {loginMethod === 'email' ? <Mail className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                    </div>
                                    <input
                                        ref={identifierRef}
                                        id="student-identifier"
                                        type={loginMethod === 'email' ? 'email' : 'text'}
                                        value={identifier}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setIdentifier(loginMethod === 'register' ? val.toUpperCase() : val);
                                        }}
                                        className="w-full bg-white border border-slate-200 text-slate-900 text-[15px] font-medium rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block pl-12 pr-4 py-4 transition-all shadow-sm placeholder:text-slate-400"
                                        placeholder={loginMethod === 'email' ? "name@mca.sjcetpalai.ac.in" : "SJC24MCA021"}
                                        disabled={isLoading}
                                        autoComplete={loginMethod === 'email' ? 'email' : 'username'}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <div className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                                    Access Password
                                </div>
                                <div className="relative flex items-center transition-all duration-300">
                                    <div className="absolute left-4 text-slate-400 group-focus-within:text-blue-600 transition-colors">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <input
                                        id="student-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white border border-slate-200 text-slate-900 text-[15px] font-medium rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block pl-12 pr-12 py-4 transition-all shadow-sm placeholder:text-slate-400"
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <Link to="/student/forgot-password" className="text-[11px] font-bold text-slate-500 hover:text-blue-600 uppercase tracking-widest transition-colors">
                                Forgot Password?
                            </Link>
                        </div>

                        {authError && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-[13px] font-medium animate-in fade-in slide-in-from-top-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                {authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[#0f172a] hover:bg-[#1e293b] focus:outline-none focus:ring-4 focus:ring-slate-500/30 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_8px_20px_rgba(15,23,42,0.15)] mt-4"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span className="tracking-wide">VERIFY & ACCESS</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform ml-1" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center flex flex-col gap-5">
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                            Protected by SeatSync Identity Server
                        </p>
                        <p className="text-sm text-slate-500 font-medium">
                            Don't have an account?{' '}
                            <Link to="/student/register" className="font-bold text-[#0f172a] hover:text-blue-600 transition-colors">
                                Register now
                            </Link>
                        </p>
                    </div>
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

export default StudentLogin;
