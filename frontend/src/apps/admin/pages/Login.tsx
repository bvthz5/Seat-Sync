import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { Button, Link } from '@heroui/react';
import { motion, AnimatePresence, Variants } from 'framer-motion';


// --- Icons ---
const EmailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

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

// --- Custom Input Component for Perfect Alignment ---
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
}: any) => (
    <div className="group flex flex-col gap-2 w-full">
        <label htmlFor={id} className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
            {label}
        </label>
        <div className={`
            relative flex items-center w-full h-14 rounded-xl overflow-hidden bg-slate-50 border-2 transition-all duration-200
            ${error ? 'border-red-300 bg-red-50' : 'border-slate-100 group-focus-within:border-slate-900 group-focus-within:shadow-lg'}
        `}>
            {/* Icon Column - Completely separated */}
            <div className={`
                w-14 h-full flex items-center justify-center border-r transition-colors
                ${error ? 'border-red-200 text-red-400' : 'border-slate-200 text-slate-400 group-focus-within:text-slate-800'}
            `}>
                {icon}
            </div>

            {/* Input Field - No overlap possible */}
            <input
                id={id}
                name={name || id}
                autoComplete={autoComplete}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`
                    flex-1 h-full px-4 outline-none bg-transparent font-medium text-lg placeholder:text-slate-300
                    ${error ? 'text-red-900' : 'text-slate-800'}
                `}
            />
        </div>
        {/* Error Message */}
        <AnimatePresence>
            {error && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[11px] font-bold text-red-500 ml-1"
                >
                    {error}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
);

// --- Flashlight Reveal Pattern (Left Side Design) ---
const RevealBackground = () => {
    const divRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: -500, y: -500 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (divRef.current && divRef.current.parentElement) {
                const rect = divRef.current.parentElement.getBoundingClientRect();
                setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                });
            }
        };

        const handleMouseLeave = () => {
            setMousePos({ x: -500, y: -500 });
        };

        // Attach to parent to cover the whole panel area
        const parent = divRef.current?.parentElement;
        if (parent) {
            parent.addEventListener('mousemove', handleMouseMove);
            parent.addEventListener('mouseleave', handleMouseLeave);
        }

        return () => {
            if (parent) {
                parent.removeEventListener('mousemove', handleMouseMove);
                parent.removeEventListener('mouseleave', handleMouseLeave);
            }
        };
    }, []);

    return (
        <div
            ref={divRef}
            className="absolute inset-0 pointer-events-none z-0"
            style={{
                // exact same pattern as left side
                backgroundImage: 'radial-gradient(#0F172A 1.5px, transparent 1.5px)',
                backgroundSize: '32px 32px',
                // Flashlight mask
                maskImage: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
                WebkitMaskImage: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
            }}
        >
            {/* Optional: Add a subtle background color wash if needed, but 'transparent' keeps it clean */}
            <div className="absolute inset-0 opacity-5 bg-slate-900" />
        </div>
    );
};

// --- Neural Network Animation for Left Panel ---
const NeuralNetworkBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
        let height = canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;

        // Define Particle type inline to avoid global scope issues
        type Particle = {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            update: () => void;
            draw: () => void;
        };

        const particleCount = 60;
        const connectionDistance = 120;
        const mouse = { x: -1000, y: -1000 };
        const particles: Particle[] = [];

        // Particle Class logic inside effect to keep it self-contained
        const createParticle = (): Particle => {
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                update: function () {
                    this.x += this.vx;
                    this.y += this.vy;

                    // Bounce off edges
                    if (this.x < 0 || this.x > width) this.vx *= -1;
                    if (this.y < 0 || this.y > height) this.vy *= -1;

                    // Mouse interaction
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 200) {
                        const angle = Math.atan2(dy, dx);
                        const force = (200 - dist) / 2000;
                        this.vx -= Math.cos(angle) * force;
                        this.vy -= Math.sin(angle) * force;
                    }
                },
                draw: function () {
                    if (!ctx) return;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(79, 209, 197, 0.5)'; // Emerald/Teal
                    ctx.fill();
                }
            };
        };

        const init = () => {
            particles.length = 0;
            for (let i = 0; i < particleCount; i++) {
                particles.push(createParticle());
            }
        };

        const handleResize = () => {
            width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
            height = canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        };

        window.addEventListener('resize', handleResize);
        canvas.parentElement?.addEventListener('mousemove', handleMouseMove);
        init();

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Draw particles and connection lines
            particles.forEach((p, index) => {
                p.update();
                p.draw();

                // Connect to nearby particles
                for (let j = index + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectionDistance) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(79, 209, 197, ${0.2 * (1 - dist / connectionDistance)})`;
                        ctx.lineWidth = 1;
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
            canvas.parentElement?.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-50" />;
};

const AdminLogin: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [formError, setFormError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, logout } = useAuth();
    const navigate = useNavigate();

    // Challenge: "If back from dashboard to login page, automatic logout"
    // Solution: We force a logout whenever this component mounts.
    useEffect(() => {
        logout({ silent: true });
    }, []);

    const validate = () => {
        let isValid = true;
        setEmailError('');
        setPasswordError('');
        setFormError('');

        if (!email) {
            setEmailError('Academic email is required');
            isValid = false;
        } else if (!email.includes('@')) {
            setEmailError('Invalid email format');
            isValid = false;
        }

        if (!password) {
            setPasswordError('Access key is required');
            isValid = false;
        } else if (password.length < 6) {
            setPasswordError('Key must be at least 6 characters');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await login(email, password);
            navigate('/admin/dashboard');
        } catch (error: any) {
            setFormError("Authentication failed. Please verify your credentials.");
        } finally {
            setLoading(false);
        }
    };

    // Animation Variants
    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
    };

    return (
        <div className="w-full min-h-screen flex text-slate-800 bg-white overflow-hidden">

            {/* --- LEFT PANEL (Updated with Animation & New Text) --- */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col justify-between p-16 text-white h-screen overflow-hidden">
                <NeuralNetworkBackground />
                <div className="relative z-10 flex items-center gap-3">
                    <SeatSyncLogo />
                    <span className="text-xl font-bold tracking-wide">SeatSync</span>
                </div>
                <div className="relative z-10 max-w-lg w-full">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="flex justify-center"
                    >
                        <img
                            src="/uploads/svg/college entrance exam-rafiki.svg"
                            alt="College Entrance Exam"
                            className="w-full h-auto max-h-[500px] object-contain drop-shadow-2xl"
                        />
                    </motion.div>
                </div>
                <div className="relative z-10 flex gap-8 text-xs font-semibold tracking-widest text-slate-500 uppercase">
                    <span>© 2026 SeatSync Systems</span>
                    <span>v2.4.0 Stabilized</span>
                </div>
            </div>

            {/* --- RIGHT PANEL (Rebuilt Perfectly) --- */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white h-screen overflow-y-auto relative">
                <RevealBackground />
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="w-full max-w-[480px] flex flex-col gap-8 relative z-10"
                >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="flex flex-col items-center text-center">
                        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-bold uppercase tracking-widest mb-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            Examination Control Portal
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Admin Authentication</h2>
                    </motion.div>

                    {/* Global Error */}
                    <AnimatePresence>
                        {formError && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {formError}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                        <motion.div variants={itemVariants}>
                            <CustomInput
                                id="email"
                                name="email"
                                autoComplete="email"
                                label="Official Academic Email"
                                placeholder="name@input.edu"
                                type="email"
                                value={email}
                                onChange={(e: any) => setEmail(e.target.value)}
                                icon={<EmailIcon />}
                                error={emailError}
                            />
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <CustomInput
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                label="Secure Access Key"
                                placeholder="••••••••••••"
                                type="password"
                                value={password}
                                onChange={(e: any) => setPassword(e.target.value)}
                                icon={<LockIcon />}
                                error={passwordError}
                            />
                            {/* Forgot Password Link - Precisely placed */}
                            <div className="flex justify-end mt-2">
                                <Link onPress={() => navigate('/admin/forgot-password')} className="text-xs font-bold text-slate-400 hover:text-slate-800 transition-colors uppercase tracking-wider cursor-pointer">
                                    Forgot Password?
                                </Link>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="pt-2">
                            <Button
                                type="submit"
                                size="lg"
                                isLoading={loading}
                                className="w-full h-14 bg-slate-900 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                            >
                                {loading ? 'VERIFYING...' : 'ACCESS DASHBOARD'}
                            </Button>
                        </motion.div>

                    </form>

                    {/* Footer / Helper */}
                    <motion.div variants={itemVariants} className="text-center">
                        <p className="text-xs text-slate-400 font-medium">
                            Protected by SeatSync Identity Server v2.4
                        </p>
                    </motion.div>

                </motion.div>
            </div>
        </div>
    );
};

export default AdminLogin;
