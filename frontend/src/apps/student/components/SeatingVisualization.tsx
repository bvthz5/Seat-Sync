import React from 'react';
import { motion } from 'framer-motion';

interface SeatingVisualizationProps {
    layout: any[];
    mySeat?: {
        seatNumber: number;
        rowLabel: string;
        benchNumber: number;
    } | null;
}

const SeatingVisualization: React.FC<SeatingVisualizationProps> = ({ layout = [], mySeat }) => {
    if (!layout || !Array.isArray(layout)) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
                </div>
                <p className="text-sm font-medium">Preparing seat visualization...</p>
            </div>
        );
    }

    // Standard professional grid: Columns A-E, Rows 1-6
    // If the data doesn't provide this exact range, we still show the layout based on the data
    // but we can map Column 1->A, 2->B, etc. if needed.
    // For now, let's use the actual data mapping but keep it strictly professional.

    const rows = Array.from(new Set(layout.map(s => s.rowLabel))).sort();
    const benches = Array.from(new Set(layout.map(s => s.benchNumber))).sort((a, b) => a - b);

    // Map column numbers to letters A-E for visual clarity if preferred
    const colMap: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };

    return (
        <div className="flex flex-col items-center">
            {/* Frontend / Entrance indicator */}
            <div className="w-full flex flex-col items-center gap-3 mb-16">
                <div className="w-48 h-1 bg-slate-300 rounded-full shadow-sm" />
                <span className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-300">Entrance / Blackboard</span>
            </div>

            <div className="grid gap-12 justify-center w-full">
                {rows.map((rowLabel) => (
                    <div key={rowLabel} className="flex items-center justify-between gap-12 w-full max-w-2xl">
                        {/* Row Label Indicator */}
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 text-sm shadow-sm shrink-0">
                            {rowLabel}
                        </div>
                        
                        {/* Seats in this row */}
                        <div className="flex flex-1 justify-center gap-8">
                            {benches.map((benchNum) => {
                                const benchSeats = layout.filter(s => s.rowLabel === rowLabel && s.benchNumber === benchNum);
                                
                                return (
                                    <div key={benchNum} className="flex gap-3 p-3 bg-white/40 rounded-2xl border border-slate-100/50">
                                        {[1, 2].map((pos) => {
                                            // Find seat for this position in bench (1=Left, 2=Right)
                                            const seat = benchSeats.find(s => (s.seatNumber % 2 === 0 ? 2 : 1) === pos);
                                            const isMe = !!seat?.isMe || (
                                                mySeat && 
                                                mySeat.rowLabel === rowLabel && 
                                                mySeat.benchNumber === benchNum && 
                                                (mySeat.seatNumber % 2 === 0 ? 2 : 1) === pos
                                            );
                                            
                                            return (
                                                <motion.div
                                                    key={pos}
                                                    whileHover={seat || isMe ? { scale: 1.1, y: -2 } : {}}
                                                    className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-500 relative ${
                                                        isMe 
                                                            ? 'bg-cyan-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.6)] ring-4 ring-cyan-100 z-10' 
                                                            : seat 
                                                                ? 'bg-slate-200 text-slate-400 opacity-60' 
                                                                : 'bg-slate-50 border border-slate-200 border-dashed text-slate-200'
                                                    }`}
                                                >
                                                    <span className={`text-[9px] font-black ${isMe ? 'text-white' : 'opacity-40 uppercase'}`}>
                                                        {colMap[benchNum * 2 - (2 - pos)] || `S${pos}`}
                                                    </span>
                                                    {isMe && (
                                                        <motion.div 
                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-md border border-cyan-100"
                                                        >
                                                            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                                                        </motion.div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mirror Row Label */}
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 text-sm shadow-sm shrink-0">
                            {rowLabel}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeatingVisualization;
