import React, { useEffect, useState } from 'react';
import { Card, CardBody } from '@heroui/react';
import { motion, useSpring, useTransform } from 'framer-motion';

// CountUp Component for animated numbers
const CountUp = ({ value }: { value: number }) => {
    const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
    const display = useTransform(spring, (current) => Math.floor(current).toLocaleString());

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return <motion.span>{display}</motion.span>;
};

interface SummaryCardProps {
    title: string;
    value: number | string;
    icon?: React.ReactNode;
    gradient: string; // Tailwind gradient classes
    delay?: number;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, gradient, delay = 0 }) => {
    // Parse value to number if possible for animation, else string
    const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : value;
    const isNumber = !isNaN(numValue as number);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
            <Card className="border-none bg-white/60 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.1)] overflow-visible">
                <CardBody className="p-0 relative overflow-hidden">
                    {/* Decorative Gradient Background */}
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-20 rounded-full blur-2xl transform translate-x-10 -translate-y-10`} />

                    <div className="p-6 relative z-10 flex flex-col justify-between h-full min-h-[140px]">
                        <div className="flex justify-between items-start">
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{title}</p>
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} text-white shadow-md`}>
                                {icon}
                            </div>
                        </div>

                        <div className="mt-4">
                            <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                                {isNumber ? <CountUp value={numValue as number} /> : value}
                            </h3>
                        </div>
                    </div>

                    {/* Bottom accent line */}
                    <div className={`h-1 w-full bg-gradient-to-r ${gradient} opacity-80`} />
                </CardBody>
            </Card>
        </motion.div>
    );
};

export const DashboardCards = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard
                title="Total Students"
                value="1,245"
                gradient="from-blue-600 to-blue-400"
                icon={<span className="text-lg">👨‍🎓</span>}
                delay={0.1}
            />
            <SummaryCard
                title="Active Exams"
                value="3"
                gradient="from-amber-500 to-yellow-400"
                icon={<span className="text-lg">📝</span>}
                delay={0.2}
            />
            <SummaryCard
                title="Exam Rooms"
                value="12"
                gradient="from-emerald-500 to-teal-400"
                icon={<span className="text-lg">🏫</span>}
                delay={0.3}
            />
            <SummaryCard
                title="Invigilators"
                value="24"
                gradient="from-purple-600 to-indigo-400"
                icon={<span className="text-lg">👨‍🏫</span>}
                delay={0.4}
            />
        </div>
    );
};
