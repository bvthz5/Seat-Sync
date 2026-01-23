import React, { useEffect } from 'react';
import { Card, CardBody } from '@heroui/react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { Users, FileText, Layout, UserCheck } from 'lucide-react';

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
    change?: string;
    iconColor: string; // Tailwind text color class
    iconBg: string; // Tailwind bg color class
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, change, iconColor, iconBg }) => {
    const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : value;
    const isNumber = !isNaN(numValue as number);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl bg-white overflow-visible h-full">
                <CardBody className="p-6 flex flex-row items-center gap-4">
                    <div className={`p-4 rounded-xl ${iconBg} ${iconColor}`}>
                        {icon}
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[#5f6368] text-sm font-medium tracking-wide pb-1">{title}</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-normal text-[#202124]">
                                {isNumber ? <CountUp value={numValue as number} /> : value}
                            </h3>
                            {change && (
                                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                    {change}
                                </span>
                            )}
                        </div>
                    </div>
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
                change="+12%"
                icon={<Users size={24} />}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
            />
            <SummaryCard
                title="Active Exams"
                value="3"
                icon={<FileText size={24} />}
                iconColor="text-orange-600"
                iconBg="bg-orange-50"
            />
            <SummaryCard
                title="Exam Rooms"
                value="12"
                icon={<Layout size={24} />}
                iconColor="text-purple-600"
                iconBg="bg-purple-50"
            />
            <SummaryCard
                title="Invigilators"
                value="24"
                change="+2"
                icon={<UserCheck size={24} />}
                iconColor="text-teal-600"
                iconBg="bg-teal-50"
            />
        </div>
    );
};
