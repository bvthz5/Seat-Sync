import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Link } from '@heroui/react'; // Ensure correct import
import { motion, AnimatePresence, Variants, useMotionValue, useSpring, useTransform, useMotionTemplate } from 'framer-motion';
import { useAuth } from '../../../hooks/useAuth';
import { AuthService } from '../../../services/auth.service';
import { ShieldCheck, UserCheck, Lock, Mail, Eye, EyeOff, FileCheck } from 'lucide-react';
import { Spinner } from '../../../components/GlobalLoader';
import { InvigilatorHeroSVG } from './InvigilatorHeroSVG';

// --- Icons ---
// Reusing SVG paths for custom styling if needed, or using Lucide directly in the input 
// (AdminLogin used custom SVGs, we can stick to that or use Lucide for easier consistent styling).
// Let's use Lucide icons passed to CustomInput for consistency with the new design.

// --- Custom Input Component (Reused from AdminLogin for consistency) ---
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
            <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                {label}
            </label>
            <div className={`
                relative flex items-center w-full h-14 rounded-xl overflow-hidden bg-slate-50 border-none transition-all duration-300
                ${error ? 'bg-red-50' : 'hover:bg-slate-100 focus-within:!bg-white focus-within:shadow-xl focus-within:shadow-indigo-100'}
            `}>
                {/* Icon Column */}
                <div className={`
                    w-14 h-full flex items-center justify-center border-r border-transparent transition-colors
                    ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}
                `}>
                    {icon}
                </div>

                {/* Input Field */}
                <input
                    id={id}
                    name={name || id}
                    autoComplete={autoComplete}
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`
                        flex-1 h-full px-4 outline-none bg-transparent font-medium text-lg placeholder:text-slate-300 !border-none !ring-0 !shadow-none focus:!ring-0
                        ${error ? 'text-red-900' : 'text-slate-800'}
                    `}
                />

                {/* Password Toggle */}
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setIsVisible(!isVisible)}
                        className="px-4 h-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                    >
                        {isVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                )}
            </div>
            {/* Error Message */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[11px] font-bold text-red-500 ml-1 mt-1"
                    >
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Neural Background (Reused but slightly tweaked color) ---
const NeuralNetworkBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
        let height = canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;

        type Particle = {
            x: number; y: number; vx: number; vy: number; size: number;
            update: () => void; draw: () => void;
        };

        const particleCount = 50;
        const particles: Particle[] = [];

        const createParticle = (): Particle => ({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            size: Math.random() * 2 + 0.5,
            update: function () {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            },
            draw: function () {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99, 102, 241, 0.4)'; // Indigo Tint
                ctx.fill();
            }
        });

        const init = () => {
            particles.length = 0;
            for (let i = 0; i < particleCount; i++) particles.push(createParticle());
        };

        const handleResize = () => {
            width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
            height = canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
            init();
        };

        window.addEventListener('resize', handleResize);
        init();

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            particles.forEach((p, index) => {
                p.update();
                p.draw();
                for (let j = index + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 100) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(99, 102, 241, ${0.15 * (1 - dist / 100)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            });
            requestAnimationFrame(animate);
        };
        const animationId = requestAnimationFrame(animate);
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-40" />;
};

// --- Animated Right Background ---
const InteractiveRightBackground = ({ mouseX, mouseY }: { mouseX: any, mouseY: any }) => {
    const smoothX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const smoothY = useSpring(mouseY, { stiffness: 50, damping: 20 });
    const maskImage = useMotionTemplate`radial-gradient(400px circle at ${smoothX}px ${smoothY}px, black, transparent 80%)`;

    return (
        <div className="absolute inset-0 z-0 pointer-events-none bg-slate-50/50">
            {/* Base subtle dot grid */}
            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:32px_32px] opacity-40"></div>

            {/* Interactive dot grid revealing on hover */}
            <motion.div
                className="absolute inset-0 bg-[radial-gradient(#6366f1_1.5px,transparent_1.5px)] [background-size:32px_32px] opacity-80"
                style={{ WebkitMaskImage: maskImage, maskImage }}
            />

            {/* Slowly drifting ambient orbs */}
            <motion.div
                animate={{ scale: [1, 1.1, 1], x: [0, 40, 0], y: [0, 30, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-[100px]"
            />
            <motion.div
                animate={{ scale: [1, 1.2, 1], x: [0, -30, 0], y: [0, -40, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[100px]"
            />

            {/* Glowing aura following cursor */}
            <motion.div
                className="absolute top-0 left-0 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[100px]"
                style={{
                    x: useTransform(smoothX, (x: any) => x - 300),
                    y: useTransform(smoothY, (y: any) => y - 300)
                }}
            />
        </div>
    );
};

const InvigilatorLogin = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, isLoading, user } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const from = location.state?.from?.pathname || '/invigilator/dashboard';

    // Auto-redirect if already logged in securely
    useEffect(() => {
        if (!isLoading && isAuthenticated && user?.Role === 'invigilator') {
            navigate(from, { replace: true });
        }
    }, [isLoading, isAuthenticated, user, navigate, from]);

    const mouseX = useMotionValue(-1000);
    const mouseY = useMotionValue(-1000);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { left, top } = e.currentTarget.getBoundingClientRect();
        mouseX.set(e.clientX - left);
        mouseY.set(e.clientY - top);
    };

    const handleMouseLeave = () => {
        mouseX.set(-1000);
        mouseY.set(-1000);
    };

    const validate = () => {
        let isValid = true;
        setEmailError('');
        setPasswordError('');
        setFormError('');

        if (!email) {
            setEmailError('Faculty email is required');
            isValid = false;
        } else if (!/^[a-zA-Z0-9._%+-]+@sjcetpalai\.ac\.in$/.test(email)) {
            setEmailError('Must use @sjcetpalai.ac.in email');
            isValid = false;
        }

        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        }

        return isValid;
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await login(email, password, 'invigilator');
            // Add a small delay for smoother transition effect
            setTimeout(() => navigate('/invigilator/dashboard', { replace: true }), 800);
        } catch (error: any) {
            setLoading(false);
            setFormError(error.response?.data?.error || error.message || "Invalid credentials");
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
    };

    return (
        <div className="w-full min-h-screen flex text-slate-800 bg-white overflow-hidden font-sans">

            {/* LEFT PANEL - Branding */}
            <div className="hidden lg:flex w-1/2 bg-[#1E1B4B] relative flex-col justify-between p-12 text-white h-screen overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <NeuralNetworkBackground />

                {/* Top Brand */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 rounded-xl text-indigo-300">
                        <ShieldCheck size={24} />
                    </div>
                    <span className="text-xl font-bold tracking-wide text-indigo-50">SeatSync</span>
                </div>

                {/* Center Illustration Substitution - SVG */}
                <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full h-full my-auto">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ duration: 1, type: "spring" }}
                        className="relative w-full h-full flex items-center justify-center"
                    >
                        {/* Glow behind the SVG */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-indigo-500/20 blur-[100px] rounded-full animate-pulse pointer-events-none"></div>

                        <div className="relative z-10 w-full h-full flex items-center justify-center drop-shadow-2xl">
                            <InvigilatorHeroSVG />
                        </div>
                    </motion.div>
                </div>

                {/* Bottom Info */}
                <div className="relative z-10 flex justify-between items-center text-xs font-medium text-indigo-200/60 uppercase tracking-wider">
                    <span>Secure Examination Environment</span>
                    <span>v2.4.0</span>
                </div>
            </div>

            {/* RIGHT PANEL - Login Form */}
            <div
                className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-white overflow-hidden"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <InteractiveRightBackground mouseX={mouseX} mouseY={mouseY} />

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-[440px] flex flex-col gap-8 relative z-10"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-2 mb-4 justify-center">
                        <div className="w-8 h-8 flex items-center justify-center bg-indigo-600 rounded-lg text-white">
                            <ShieldCheck size={18} />
                        </div>
                        <span className="font-bold text-lg text-slate-900">SeatSync</span>
                    </div>

                    {/* Header */}
                    <motion.div variants={itemVariants} className="text-center space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            Faculty Portal
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Invigilator Sign In</h2>
                        <p className="text-slate-400 text-sm font-medium">Enter your credentials to manage exam sessions</p>
                    </motion.div>

                    {/* Error Display */}
                    <AnimatePresence>
                        {formError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded shadow-sm text-sm font-medium flex items-center gap-2"
                            >
                                <span className="flex-shrink-0">⚠️</span>
                                {formError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        <motion.div variants={itemVariants}>
                            <CustomInput
                                id="email"
                                label="Official Faculty Email"
                                placeholder="name@sjcetpalai.ac.in"
                                type="email"
                                value={email}
                                onChange={(e: any) => setEmail(e.target.value)}
                                icon={<Mail className="w-5 h-5" />}
                                error={emailError}
                                autoComplete="username"
                            />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <CustomInput
                                id="password"
                                label="Access Password"
                                placeholder="••••••••"
                                type="password"
                                value={password}
                                onChange={(e: any) => setPassword(e.target.value)}
                                icon={<Lock className="w-5 h-5" />}
                                error={passwordError}
                                autoComplete="current-password"
                            />
                            <div className="flex justify-end mt-2">
                                <Link href="#" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider">
                                    Forgot Password?
                                </Link>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="pt-2">
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full h-14 bg-[#1E1B4B] text-white font-bold text-lg rounded-xl shadow-xl shadow-indigo-200 hover:shadow-2xl hover:bg-[#312e81] hover:-translate-y-0.5 transition-all duration-300 group"
                                disabled={loading}
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Verifying...</span>
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        VERIFY & ACCESS <FileCheck className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </Button>
                        </motion.div>
                    </form>

                    {/* Footer */}
                    <motion.div variants={itemVariants} className="text-center space-y-4">
                        <div className="h-px w-full bg-slate-100"></div>
                        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest">
                            Protected by SeatSync Identity Server
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};

export default InvigilatorLogin;
