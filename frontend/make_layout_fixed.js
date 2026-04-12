const fs = require('fs');

let content = fs.readFileSync('src/LayoutConfig.bak', 'utf16le'); // Read the backup in UTF-16
if (content.indexOf('<div className="flex gap-12 justify-center">') === -1) {
    // maybe it wasn't utf16le? Try utf8
    content = fs.readFileSync('src/LayoutConfig.bak', 'utf8');
}

const startTag = '<div className="flex gap-12 justify-center">';
const startIdx = content.indexOf(startTag);

if (startIdx === -1) {
    console.error("Cannot find start tag.");
    process.exit(1);
}

let openCount = 0;
let endIdx = -1;
let i = startIdx;
while (i < content.length) {
    if (content.substr(i, 4) === '<div') {
        openCount++;
        i += 4;
    } else if (content.substr(i, 6) === '</div'+'>') {
        openCount--;
        i += 6;
        if (openCount === 0) {
            endIdx = i;
            break;
        }
    } else {
        i++;
    }
}

if (endIdx === -1) {
    console.error("Cannot find end closing div tag");
    process.exit(1);
}

const replacement = `<div className="flex gap-12 justify-center w-full">
                                    {config.rowLayout.map((benches, r) => {
                                        const colLabel = String.fromCharCode(65 + r);
                                        
                                        // RULE: if benches == 0 -> render dashed skip marker (no fake grid)
                                        if (benches === 0) {
                                            return <div key={r} className="flex flex-col gap-6 items-center"><div className="w-16 h-full border-r-2 border-dashed border-slate-700/30" /></div>;
                                        }

                                        return (
                                            <div key={r} className="flex flex-col gap-6 items-center">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold shadow-xl flex items-center justify-center">{colLabel}</div>

                                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col gap-4 shadow-xl shadow-black/50">
                                                    {Array.from({ length: benches }).map((_, b) => (
                                                        <div key={b} className="relative group/bench">
                                                            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-3 shadow-lg hover:border-indigo-500/30 transition-colors">
                                                                <div className="h-1.5 w-full bg-slate-700 rounded-full mb-3 opacity-50" />

                                                                <div className="flex gap-3 justify-center">
                                                                    {Array.from({ length: config.seatsPerBench }).map((_, s) => {
                                                                        const seatIndex = s + 1;
                                                                        const seatId = \`\${colLabel}-\${b + 1}-\${seatIndex}\`;
                                                                        const isActive = !disabledSeatIds.has(seatId);

                                                                        let seatCls = "w-10 h-10 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-200 text-xs font-bold relative group/seat shadow-sm ";
                                                                        
                                                                        // RULES: Clickable seats & Disable Mode built in. Zoning removed.
                                                                        if (isActive) {
                                                                            if (viewMode === 'DISABLE') {
                                                                                seatCls += "bg-slate-900 border-indigo-500/30 text-indigo-400 hover:bg-slate-800 hover:text-white";
                                                                            } else {
                                                                                seatCls += "bg-slate-900 border-slate-700 text-slate-400 hover:bg-indigo-900/50 hover:border-indigo-500/50";
                                                                            }
                                                                        } else {
                                                                            seatCls += "bg-slate-900/50 border-slate-800 text-slate-700 opacity-50 line-through";
                                                                            if (viewMode === 'DISABLE') {
                                                                                seatCls += " hover:border-indigo-500/50 hover:bg-indigo-900/30 cursor-pointer";
                                                                            } else {
                                                                                seatCls += " cursor-not-allowed";
                                                                            }
                                                                        }
                                                                        
                                                                        if (viewMode === 'DISABLE' && !isActive) {
                                                                            seatCls = "w-10 h-10 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-200 text-xs font-bold relative group/seat shadow-sm bg-red-900/10 border-red-500/30 text-red-500/50 line-through hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-400";
                                                                        }

                                                                        return (
                                                                            <Tooltip key={seatId} content={\`\${seatId} \${!isActive ? '(Disabled)' : ''}\`}>
                                                                                <div className={seatCls} onClick={() => toggleSeat(seatId)}>
                                                                                    {isActive ? <span>{seatIndex}</span> : <Ban size={14}/>}
                                                                                </div>
                                                                            </Tooltip>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                            <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-xs font-black text-white/50 tracking-wider">
                                                                B{b + 1}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
// Write back properly stringified utf-8
fs.writeFileSync('src/apps/admin/components/structure/LayoutConfig.tsx', content, 'utf8');
console.log('LayoutConfig successfully reconstructed and fixed!');
