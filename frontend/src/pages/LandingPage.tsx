import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ShieldCheck, Users, UserCheck, ArrowRight, Sparkles } from 'lucide-react';

// --- Types ---
interface RoleCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    path: string;
    gradient: string;
    delay: number;
    disabled?: boolean;
}

// --- Custom Cursor Component ---
const CustomCursor = () => {
    const mouseX = useMotionValue(-100);
    const mouseY = useMotionValue(-100);

    const ringX = useSpring(mouseX, { stiffness: 100, damping: 25, mass: 0.5 });
    const ringY = useSpring(mouseY, { stiffness: 100, damping: 25, mass: 0.5 });

    const dotX = useSpring(mouseX, { stiffness: 400, damping: 30, mass: 0.2 });
    const dotY = useSpring(mouseY, { stiffness: 400, damping: 30, mass: 0.2 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <div className="hidden lg:block pointer-events-none z-[9999]">
            {/* Glowing Ring */}
            <motion.div
                className="fixed top-0 left-0 w-12 h-12 rounded-full border-[1.5px] border-indigo-400/60 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] bg-indigo-500/5 backdrop-blur-[2px]"
                style={{
                    x: useTransform(ringX, x => x - 24),
                    y: useTransform(ringY, y => y - 24),
                }}
            />
            {/* Center Dot */}
            <motion.div
                className="fixed top-0 left-0 w-2 h-2 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(99,102,241,1)]"
                style={{
                    x: useTransform(dotX, x => x - 4),
                    y: useTransform(dotY, y => y - 4),
                }}
            />
        </div>
    );
};

// --- 3D Tilt Card Component ---
const TiltCard: React.FC<RoleCardProps> = ({ title, description, icon, path, gradient, delay, disabled }) => {
    const navigate = useNavigate();
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 400, damping: 90 });
    const mouseY = useSpring(y, { stiffness: 400, damping: 90 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["12deg", "-12deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-12deg", "12deg"]);

    // Raw pixel values for the spotlight
    const spotX = useMotionValue(0);
    const spotY = useMotionValue(0);
    const smoothSpotX = useSpring(spotX, { stiffness: 300, damping: 50 });
    const smoothSpotY = useSpring(spotY, { stiffness: 300, damping: 50 });
    const spotlightBackground = useMotionTemplate`radial-gradient(circle 350px at ${smoothSpotX}px ${smoothSpotY}px, rgba(255,255,255,0.8), transparent 80%)`;
    const borderGlow = useMotionTemplate`radial-gradient(circle 250px at ${smoothSpotX}px ${smoothSpotY}px, rgba(99,102,241,0.5), transparent 80%)`;

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();

        const mouseXRel = e.clientX - rect.left;
        const mouseYRel = e.clientY - rect.top;

        spotX.set(mouseXRel);
        spotY.set(mouseYRel);

        const xPct = mouseXRel / rect.width - 0.5;
        const yPct = mouseYRel / rect.height - 0.5;

        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        // Reset spotlight to center on leave
        if (ref.current) {
            spotX.set(ref.current.getBoundingClientRect().width / 2);
            spotY.set(ref.current.getBoundingClientRect().height / 2);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
            style={{ perspective: 2000 }}
            className={`w-full h-[320px] ${disabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
            onClick={() => !disabled && navigate(path)}
        >
            <motion.div
                ref={ref}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    rotateX: disabled ? 0 : rotateX,
                    rotateY: disabled ? 0 : rotateY,
                    transformStyle: "preserve-3d",
                }}
                className={`
                    relative w-full h-full rounded-[2rem] p-[1.5px] group transition-all duration-500
                    ${disabled ? '' : 'hover:-translate-y-2 hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.25)]'}
                `}
            >
                {/* Dynamic Border Glow Follower */}
                <motion.div
                    className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                    style={{ background: borderGlow }}
                />

                {/* Main Card Background */}
                <div className="absolute inset-[1.5px] rounded-[calc(2rem-1.5px)] bg-white/60 backdrop-blur-2xl z-10 border border-white/50 shadow-inner overflow-hidden">
                    {/* Inner Spotlight for Glassy Shine */}
                    <motion.div
                        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 mix-blend-overlay"
                        style={{ background: spotlightBackground }}
                    />
                </div>

                {/* Content Container */}
                <div className="relative z-20 h-full p-8 flex flex-col justify-between transform-gpu transition-all duration-500 [transform-style:preserve-3d]">

                    {/* Floating content wrapper */}
                    <div className="h-full flex flex-col justify-between transform-gpu transition-transform duration-500 ease-out group-hover:[transform:translateZ(40px)]">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className={`
                                w-16 h-16 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl
                                bg-gradient-to-br ${gradient} ring-4 ring-white/60 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500
                            `}>
                                {icon}
                            </div>

                            {!disabled && (
                                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-slate-400 shadow-sm border border-slate-200/60 group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/30 group-hover:border-indigo-500 transition-all duration-500">
                                    <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                                </div>
                            )}
                        </div>

                        {/* Text Content */}
                        <div className="mt-8">
                            <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300">
                                {title}
                            </h3>
                            <p className="text-slate-500 font-medium leading-relaxed group-hover:text-slate-600 transition-colors">
                                {description}
                            </p>
                        </div>
                    </div>

                    {/* Footer Status */}
                    {disabled && (
                        <div className="absolute top-6 right-6 transform-gpu group-hover:[transform:translateZ(20px)] transition-transform duration-500">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-sm text-slate-500 border border-slate-200/80 shadow-sm uppercase tracking-wider">
                                Coming Soon
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

// --- Background Mesh Component ---
const MeshBackground = () => {
    return (
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-50/50">
            {/* Animated Gradient Orbs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    x: [0, 50, 0],
                    y: [0, 30, 0],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-300/30 rounded-full blur-[120px]"
            />
            <motion.div
                animate={{
                    scale: [1, 1.5, 1],
                    x: [0, -50, 0],
                    y: [0, -40, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-[20%] right-[-10%] w-[45vw] h-[45vw] bg-indigo-300/30 rounded-full blur-[120px]"
            />
            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, 30, 0],
                    y: [0, -50, 0],
                }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-blue-300/30 rounded-full blur-[120px]"
            />

            {/* Premium Texture Overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] mix-blend-multiply"></div>

            {/* Elegant Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_40%,#000_20%,transparent_100%)]" />
        </div>
    );
};

const LandingPage: React.FC = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const backgroundSpotlight = useMotionTemplate`radial-gradient(800px circle at ${mouseX}px ${mouseY}px, rgba(99, 102, 241, 0.05), transparent 80%)`;

    return (
        <div className="relative min-h-screen w-full overflow-hidden font-sans text-slate-900 bg-[#f8f9fa] selection:bg-indigo-500/20 selection:text-indigo-900 cursor-auto lg:cursor-none">
            <CustomCursor />
            <MeshBackground />

            {/* Spotlight Follower on Main Background */}
            <motion.div
                className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300 mix-blend-multiply"
                style={{ background: backgroundSpotlight }}
            />

            <div className="relative z-10 max-w-[85rem] mx-auto px-6 flex flex-col items-center justify-center min-h-screen py-20">

                {/* Hero Header */}
                <div className="text-center mb-24 max-w-4xl flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-flex items-center justify-center space-x-2 px-4 py-2 mb-10 bg-white/60 backdrop-blur-xl rounded-full shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-white/60 ring-1 ring-slate-900/5"
                    >
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">ERP System Evolution</span>
                    </motion.div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 drop-shadow-sm leading-tight">
                        <motion.span
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                            className="block text-slate-800"
                        >
                            Welcome to
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                            className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-x bg-[length:200%_auto] pb-2"
                        >
                            SeatSync
                        </motion.span>
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                        className="text-lg md:text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto"
                    >
                        The unified examination control platform for <span className="font-semibold text-slate-800">SJCET Palai</span>.
                        Experience secure, streamlined, and intelligent assessment management.
                    </motion.p>
                </div>

                {/* Cards Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-12 w-full px-4 lg:px-8">

                    {/* Admin Card */}
                    <TiltCard
                        title="Administrator"
                        description="Centralized control for exam scheduling, user management, and system configuration."
                        icon={<ShieldCheck className="w-8 h-8" />}
                        path="/admin"
                        gradient="from-slate-700 to-slate-900"
                        delay={0.4}
                    />

                    {/* Invigilator Card */}
                    <TiltCard
                        title="Invigilator"
                        description="Streamlined interface for attendance tracking, exam monitoring, and reporting."
                        icon={<UserCheck className="w-8 h-8" />}
                        path="/invigilator/login"
                        gradient="from-indigo-600 to-violet-600"
                        delay={0.5}
                    />

                    {/* Student Card */}
                    <TiltCard
                        title="Student Portal"
                        description="Secure access to seating plans, schedules, and personal academic records."
                        icon={<Users className="w-8 h-8" />}
                        path="#"
                        gradient="from-blue-500 to-cyan-500"
                        delay={0.6}
                        disabled={true}
                    />

                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1, duration: 1.5 }}
                    className="absolute bottom-10 left-0 right-0 text-center pointer-events-none"
                >
                    <p className="text-xs font-semibold text-slate-400/80 uppercase tracking-[0.2em]">
                        © 2026 SeatSync Systems • Secure Identity Server v2.4
                    </p>
                </motion.div>

            </div>
        </div>
    );
};

export default LandingPage;
