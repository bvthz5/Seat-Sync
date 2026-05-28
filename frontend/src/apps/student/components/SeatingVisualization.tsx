import React from 'react';
import { motion } from 'framer-motion';

interface SeatingVisualizationProps {
    layout: any[];
    mySeat?: {
        seatNumber: number;
        rowLabel: string;
        benchNumber: number;
        rowLayout?: number[];
        seatsPerBench?: number;
    } | null;
    isDark?: boolean;
}

const SeatingVisualization: React.FC<SeatingVisualizationProps> = ({ layout = [], mySeat, isDark = true }) => {
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

    const hasRoomLayout = mySeat?.rowLayout && Array.isArray(mySeat.rowLayout) && mySeat.rowLayout.length > 0;

    const rows = hasRoomLayout
        ? mySeat.rowLayout!.map((_, i) => String.fromCharCode(65 + i))
        : Array.from(new Set(layout.filter(s => s.rowLabel != null).map(s => String(s.rowLabel)))).sort();

    const maxBenches = hasRoomLayout
        ? Math.max(...mySeat.rowLayout!)
        : Math.max(...layout.filter(s => s.benchNumber != null).map(s => Number(s.benchNumber)), 0);

    const fallbackBenches = Array.from({ length: maxBenches }, (_, i) => i + 1);

    const seatsPerBench = mySeat?.seatsPerBench || 2;

    return (
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto py-8">
            {/* ── Blackboard ── */}
            <div className="flex flex-col items-center mb-12 w-full max-w-2xl">
                <div className="w-full h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(180deg,#1a1f3a 0%,#131730 55%,#0f1228 100%)',
                        border: '1px solid rgba(129,140,248,0.25)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 30px rgba(99,102,241,0.05), inset 0 1px 0 rgba(129,140,248,0.12)'
                    }}>
                    <div className="absolute top-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)' }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] select-none" style={{ color: 'rgba(165,180,252,0.5)', textShadow: '0 0 15px rgba(99,102,241,0.2)' }}> Front Blackboard </span>
                    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.5),rgba(139,92,246,0.4),transparent)' }} />
                </div>
                <div className="w-4/5 h-3 -mt-0.5" style={{ background: 'radial-gradient(ellipse,rgba(99,102,241,0.08) 0%,transparent 70%)' }} />
            </div>

            {/* Bench Pillars */}
            <div className="flex gap-8 justify-center items-start flex-wrap w-full">
                {rows.map((rowLabel, r) => {
                    const colLetter = rowLabel;
                    const colLetterLower = colLetter.toLowerCase();
                    const numBenches = hasRoomLayout ? mySeat.rowLayout![r] || 0 : fallbackBenches.length;

                    return (
                        <div key={rowLabel} className="flex flex-col items-center gap-3">
                            {/* Column header */}
                            <div className="flex flex-col items-center gap-1">
                                <span className="text-xl font-black tracking-[0.3em] select-none transition-colors duration-500 relative"
                                    style={{ 
                                        background: isDark ? 'linear-gradient(180deg,#a5b4fc 0%,#818cf8 100%)' : 'linear-gradient(180deg,#6366f1 0%,#4f46e5 100%)', 
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        color: 'transparent'
                                    }}>
                                    {colLetter}
                                </span>
                                <span className="w-6 h-[2px] rounded-full transition-colors duration-500" style={{ background: isDark ? 'linear-gradient(90deg,transparent,#818cf8,transparent)' : 'linear-gradient(90deg,transparent,#6366f1,transparent)' }} />
                            </div>

                            {/* Pill container */}
                            <div className="relative rounded-[2rem] flex flex-col gap-2.5 transition-all duration-500"
                                style={{
                                    minWidth: '72px',
                                    padding: '18px 16px',
                                    background: isDark ? 'linear-gradient(175deg, rgba(99,102,241,0.12) 0%, rgba(15,28,74,0.7) 100%)' : 'linear-gradient(175deg, rgba(238,242,255,0.6) 0%, rgba(203,213,225,0.4) 100%)',
                                    border: isDark ? '1px solid rgba(129,140,248,0.2)' : '1px solid rgba(199,210,254,0.6)',
                                    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
                                    backdropFilter: 'blur(8px)',
                                }}>
                                <div className="absolute top-2.5 left-4 right-4 h-px pointer-events-none transition-colors duration-500" style={{ background: isDark ? 'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)' : 'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)' }} />

                                {Array.from({ length: numBenches }).map((_, b) => {
                                    const benchNum = b + 1;
                                    const isDual = seatsPerBench === 2;
                                    const benchSeats = layout.filter(s => s.rowLabel === rowLabel && s.benchNumber === benchNum);

                                    const makeSeatCell = (seatIndex: number) => {
                                        const seat = benchSeats.find(s => (s.seatNumber % seatsPerBench === 0 ? seatsPerBench : s.seatNumber % seatsPerBench) === seatIndex);
                                        
                                        const isMe = !!seat?.isMe || (
                                            mySeat && 
                                            mySeat.rowLabel === rowLabel && 
                                            mySeat.benchNumber === benchNum && 
                                            (mySeat.seatNumber % seatsPerBench === 0 ? seatsPerBench : mySeat.seatNumber % seatsPerBench) === seatIndex
                                        );

                                        const seatLabel = isDual
                                            ? `${colLetterLower}${benchNum}${seatIndex === 1 ? 'l' : 'r'}`
                                            : `${colLetterLower}${benchNum}`;

                                        const base = isDual
                                            ? 'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 text-[10px] font-bold select-none border relative '
                                            : 'w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 text-[11px] font-bold select-none border relative ';
                                            
                                        let seatCls = base;
                                        let seatStyle: React.CSSProperties = {};

                                        if (isMe) {
                                            seatCls += 'z-10 shadow-[0_0_15px_rgba(6,182,212,0.6)] ';
                                            seatStyle = { background: 'linear-gradient(135deg,#06b6d4,#0891b2)', borderColor: '#22d3ee', color: '#ffffff' };
                                        } else {
                                            seatCls += 'border-dashed ';
                                            seatStyle = { 
                                                background: 'transparent', 
                                                borderColor: isDark ? 'rgba(51,65,85,0.5)' : 'rgba(148,163,184,0.6)', 
                                                color: isDark ? 'rgba(100,116,139,0.4)' : 'rgba(148,163,184,0.6)' 
                                            };
                                        }

                                        return (
                                            <motion.div
                                                key={seatIndex}
                                                whileHover={seat || isMe ? { scale: 1.08, y: -1 } : {}}
                                                className={seatCls}
                                                style={seatStyle}
                                            >
                                                <span className={`tracking-tight ${isMe ? 'text-white' : ''}`}>
                                                    {seatLabel.toUpperCase()}
                                                </span>
                                                {isMe && (
                                                    <motion.div 
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-md"
                                                    >
                                                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        );
                                    };

                                    if (isDual) {
                                        return (
                                            <div key={benchNum} className="flex gap-1.5 items-center">
                                                {makeSeatCell(1)}
                                                <div className="w-px h-4 rounded-full shrink-0" style={{ background: 'linear-gradient(180deg,transparent,rgba(129,140,248,0.25),transparent)' }} />
                                                {makeSeatCell(2)}
                                            </div>
                                        );
                                    }
                                    return <React.Fragment key={benchNum}>{makeSeatCell(1)}</React.Fragment>;
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SeatingVisualization;
