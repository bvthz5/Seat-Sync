import React from 'react';
import { motion } from 'framer-motion';
import { HashLoader } from 'react-spinners';

export const Spinner = ({ size = 60, color = "#132ef1", className = "" }: { size?: number, color?: string, className?: string }) => (
    <div className={`flex justify-center items-center ${className}`}>
        <HashLoader color={color} size={size} speedMultiplier={1.5} />
    </div>
);

const GlobalLoader = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
        >
            <Spinner size={80} />
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-lg font-medium text-[#132ef1] tracking-wide"
            >
                Loading...
            </motion.p>
        </motion.div>
    );
};

export default GlobalLoader;
