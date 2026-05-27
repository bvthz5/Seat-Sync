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
    if (!layout || !Array.isArray(layout) || layout.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mb-4">
                    <div className="w-6 h-6 border-2 border-slate-700 border-t-indigo-400 rounded-full animate-spin" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider">Loading seating arrangement...</p>
            </div>
        );
    }

    const rows = Array.from(new Set(layout.filter(s => s.rowLabel != null).map(s => String(s.rowLabel)))).sort();
    const benches = Array.from(new Set(layout.filter(s => s.benchNumber != null).map(s => Number(s.benchNumber)))).sort((a, b) => a - b);

    // Map column numbers to letters A-E for visual clarity
    const colMap: Record<number, string> = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };

    return (
        <div className="flex flex-col items-center w-full max-w-xl mx-auto py-4">
            {/* Entrance blackboard indicator */}
            <div className="w-full flex flex-col items-center gap-2 mb-12 relative">
                <div className="w-36 h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
                <span className="text-[8px] font-black uppercase tracking-[0.5em] text-slate-500">Entrance / Blackboard</span>
            </div>

            <div className="grid gap-6 w-full">
                {rows.map((rowLabel) => (
                    <div key={rowLabel} className="flex items-center justify-between gap-6 w-full">
                        {/* Row Designation left */}
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-slate-500 text-xs shadow-sm shrink-0">
                            {rowLabel}
                        </div>
                        
                        {/* Seats grid */}
                        <div className="flex flex-1 justify-center gap-4">
                            {benches.map((benchNum) => {
                                const benchSeats = layout.filter(s => s.rowLabel === rowLabel && s.benchNumber === benchNum);
                                
                                return (
                                    <div key={benchNum} className="flex gap-2 p-1.5 bg-[#0C1220] rounded-xl border border-slate-900 shadow-sm">
                                        {[1, 2].map((pos) => {
                                            // Determine seat position (1=Left, 2=Right)
                                            const seat = benchSeats.find(s => (s.seatNumber % 2 === 0 ? 2 : 1) === pos);
                                            
                                            // Confirm if this seat is mine
                                            const isMe = !!seat?.isMe || (
                                                mySeat && 
                                                mySeat.rowLabel === rowLabel && 
                                                mySeat.benchNumber === benchNum && 
                                                (mySeat.seatNumber % 2 === 0 ? 2 : 1) === pos
                                            );
                                            
                                            return (
                                                <motion.div
                                                    key={pos}
                                                    whileHover={seat || isMe ? { scale: 1.08, y: -1 } : {}}
                                                    className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center transition-all duration-300 relative ${
                                                        isMe 
                                                            ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] font-black z-10' 
                                                            : seat 
                                                                ? 'bg-slate-800 text-slate-600 border border-slate-800' 
                                                                : 'bg-transparent border border-slate-900 border-dashed text-slate-800'
                                                    }`}
                                                >
                                                    <span className={`text-[8px] font-black ${isMe ? 'text-white' : 'opacity-40 uppercase'}`}>
                                                        {colMap[benchNum * 2 - (2 - pos)] || `S${pos}`}
                                                    </span>
                                                    {isMe && (
                                                        <motion.div 
                                                            initial={{ scale: 0.8, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center shadow-md"
                                                        >
                                                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
                                                        </motion.div>
                                                    )}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Row Designation right */}
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-slate-500 text-xs shadow-sm shrink-0">
                            {rowLabel}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeatingVisualization;
