import React, { useEffect, useState, useMemo } from 'react';
import {
    Card, CardBody, CardHeader, Button, Input, Autocomplete, AutocompleteItem, Divider, Chip
} from '@heroui/react';
import {
    Plus, Minus, Save, RotateCcw, MonitorPlay, Armchair,
    Info, Eye, MousePointerClick, Columns3, Layers
} from 'lucide-react';
import { internalStructureService, InternalBlock, InternalFloor, InternalRoom, InternalSeat } from '../../services/internalStructureService';
import { toast } from '../../../../utils/toast';
import './InternalLayoutConfig.css';

interface Props { readOnly?: boolean }

export const InternalLayoutConfig: React.FC<Props> = ({ readOnly = false }) => {
    const [blocks, setBlocks] = useState<InternalBlock[]>([]);
    const [floors, setFloors] = useState<InternalFloor[]>([]);
    const [rooms, setRooms] = useState<InternalRoom[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState('');
    const [selectedFloorId, setSelectedFloorId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [roomData, setRoomData] = useState<InternalRoom | null>(null);
    const [seats, setSeats] = useState<InternalSeat[]>([]);
    const [customDisabledSeats, setCustomDisabledSeats] = useState<Set<number>>(new Set());
    const [initialCustomDisabled, setInitialCustomDisabled] = useState<Set<number>>(new Set());
    const [config, setConfig] = useState({ rowLayout: [] as number[], seatsPerBench: 2 });
    const [initialConfig, setInitialConfig] = useState<typeof config | null>(null);
    const [seatMode, setSeatMode] = useState<'Single' | 'Dual' | 'Mixed'>('Dual');
    const [initialSeatMode, setInitialSeatMode] = useState<'Single' | 'Dual' | 'Mixed'>('Dual');
    const [loading, setLoading] = useState(false);
    const [fetchingFloors, setFetchingFloors] = useState(false);
    const [fetchingRooms, setFetchingRooms] = useState(false);
    const [viewMode, setViewMode] = useState<'view' | 'disable'>('view');

    // Fetch blocks on mount
    useEffect(() => {
        internalStructureService.getBlocks({ limit: 100 }).then(r => setBlocks(r.data || []));
    }, []);

    // Fetch floors when block changes
    useEffect(() => {
        if (!selectedBlockId || isNaN(Number(selectedBlockId))) {
            setFloors([]);
            return;
        }
        setFetchingFloors(true);
        internalStructureService.getFloors({ blockId: Number(selectedBlockId), limit: 100 })
            .then(res => {
                setFloors(res.data || []);
            })
            .catch(() => toast.error('Failed to load floors'))
            .finally(() => setFetchingFloors(false));
    }, [selectedBlockId]);

    // Fetch rooms when floor changes
    useEffect(() => {
        if (!selectedFloorId || isNaN(Number(selectedFloorId))) {
            setRooms([]);
            return;
        }
        setFetchingRooms(true);
        internalStructureService.getRooms({ floorId: Number(selectedFloorId), limit: 100 })
            .then(r => setRooms(r.data || []))
            .catch(() => toast.error('Failed to load rooms'))
            .finally(() => setFetchingRooms(false));
    }, [selectedFloorId]);

    // Load room layout when room changes
    useEffect(() => {
        if (!selectedRoomId) { setRoomData(null); setSeats([]); return; }
        setLoading(true);
        internalStructureService.getRoomLayout(Number(selectedRoomId)).then(data => {
            setRoomData(data.room);
            setSeats(data.seats);
            
            // Sync hierarchy if it doesn't match the selected room
            if (data.room.BlockID && selectedBlockId !== String(data.room.BlockID)) {
                setSelectedBlockId(String(data.room.BlockID));
            }
            if (data.room.FloorID && selectedFloorId !== String(data.room.FloorID)) {
                setSelectedFloorId(String(data.room.FloorID));
            }

            const layout = Array.isArray(data.room.RowLayout) ? data.room.RowLayout : [];
            const spb = data.room.SeatsPerBench || 2;
            const cfg = { rowLayout: layout, seatsPerBench: spb };
            setConfig(cfg);
            setInitialConfig(cfg);
            
            const mode = data.room.SeatMode || 'Dual';
            setSeatMode(mode);
            setInitialSeatMode(mode);

            const customDisabled = new Set<number>();
            data.seats.forEach(s => {
                if (!s.IsActive) {
                    if (mode === 'Single') {
                        customDisabled.add(s.SeatID);
                    } else {
                        if (s.SeatNumber !== 2) {
                            customDisabled.add(s.SeatID);
                        }
                    }
                }
            });
            setCustomDisabledSeats(customDisabled);
            setInitialCustomDisabled(new Set(customDisabled));
        }).catch(() => toast.error('Failed to load room layout'))
          .finally(() => setLoading(false));
    }, [selectedRoomId]);

    const isDirty = useMemo(() => {
        if (!initialConfig) return false;
        if (JSON.stringify(config.rowLayout) !== JSON.stringify(initialConfig.rowLayout)) return true;
        if (config.seatsPerBench !== initialConfig.seatsPerBench) return true;
        if (seatMode !== initialSeatMode) return true;
        if (customDisabledSeats.size !== initialCustomDisabled.size) return true;
        for (const id of customDisabledSeats) { if (!initialCustomDisabled.has(id)) return true; }
        return false;
    }, [config, initialConfig, seatMode, initialSeatMode, customDisabledSeats, initialCustomDisabled]);

    // Live active seats recomputation (derived in real-time with zero negative guards)
    const totalActiveSeats = useMemo(() => {
        return Math.max(0, seats.filter(s => {
            const isAlternateDisabled = seatMode === 'Dual' && s.SeatNumber === 2;
            const isCustomDisabled = customDisabledSeats.has(s.SeatID);
            return !isAlternateDisabled && !isCustomDisabled;
        }).length);
    }, [seats, seatMode, customDisabledSeats]);

    const capacityCount = config.rowLayout.reduce((a, b) => a + b, 0) * 2; // Always 2 physically

    const handleAddColumn = () => {
        const last = config.rowLayout.length > 0 ? config.rowLayout[config.rowLayout.length - 1] : 4;
        setConfig(c => ({ ...c, rowLayout: [...c.rowLayout, last] }));
    };

    const handleRemoveColumn = (i: number) => {
        setConfig(c => ({ ...c, rowLayout: c.rowLayout.filter((_, idx) => idx !== i) }));
    };

    const handleSeatCountChange = (i: number, val: number) => {
        const next = [...config.rowLayout]; next[i] = val;
        setConfig(c => ({ ...c, rowLayout: next }));
    };

    const handleReset = () => {
        if (initialConfig) {
            setConfig(initialConfig);
            setSeatMode(initialSeatMode);
            setCustomDisabledSeats(new Set(initialCustomDisabled));
            toast.success('Reset to saved state');
        }
    };

    const handleSave = async () => {
        if (!selectedRoomId) return;
        setLoading(true);
        try {
            await internalStructureService.updateRoomLayout(Number(selectedRoomId), {
                RowLayout: config.rowLayout,
                SeatsPerBench: 2, // Physical seats per bench remains immutable
                SeatMode: seatMode,
            } as any);
            
            // Persist derived seat states dynamically
            const data = await internalStructureService.getRoomLayout(Number(selectedRoomId));
            if (data.seats.length > 0) {
                const updates = data.seats.map(s => {
                    const isAlternateDisabled = seatMode === 'Dual' && s.SeatNumber === 2;
                    const isCustomDisabled = customDisabledSeats.has(s.SeatID);
                    const isActive = !isAlternateDisabled && !isCustomDisabled;
                    return { SeatID: s.SeatID, IsActive: isActive };
                });
                await internalStructureService.updateSeatStates(Number(selectedRoomId), updates);
            }
            
            // Reload fresh database structures
            const fresh = await internalStructureService.getRoomLayout(Number(selectedRoomId));
            setRoomData(fresh.room);
            setSeats(fresh.seats);
            
            const cfg = { rowLayout: Array.isArray(fresh.room.RowLayout) ? fresh.room.RowLayout : [], seatsPerBench: fresh.room.SeatsPerBench || 2 };
            setConfig(cfg);
            setInitialConfig(cfg);
            
            const freshMode = fresh.room.SeatMode || 'Dual';
            setSeatMode(freshMode);
            setInitialSeatMode(freshMode);

            const customDisabled = new Set<number>();
            fresh.seats.forEach(s => {
                if (!s.IsActive) {
                    if (freshMode === 'Single') {
                        customDisabled.add(s.SeatID);
                    } else {
                        if (s.SeatNumber !== 2) {
                            customDisabled.add(s.SeatID);
                        }
                    }
                }
            });
            setCustomDisabledSeats(customDisabled);
            setInitialCustomDisabled(new Set(customDisabled));
            
            toast.success('Layout saved successfully');
        } catch (e: any) { 
            toast.error(e.response?.data?.message || 'Save failed'); 
        } finally { 
            setLoading(false); 
        }
    };

    const toggleSeatDisable = (seatId: number) => {
        if (readOnly || viewMode !== 'disable') return;
        setCustomDisabledSeats(prev => {
            const next = new Set(prev);
            if (next.has(seatId)) next.delete(seatId); else next.add(seatId);
            return next;
        });
    };

    // Build seat lookup for visualization
    const seatLookup = useMemo(() => {
        const map = new Map<string, InternalSeat>();
        seats.forEach(s => map.set(`${s.RowLabel}-${s.BenchNumber}-${s.SeatNumber}`, s));
        return map;
    }, [seats]);

    interface BenchView {
        benchNum: number;
        leftKey: string;
        rightKey: string | null;
        leftSeat: InternalSeat | undefined;
        rightSeat: InternalSeat | undefined;
        leftLabel: string;
        rightLabel: string | null;
    }
    interface ColumnView {
        colLabel: string;
        benchCount: number;
        benches: BenchView[];
    }

    const visualColumns: ColumnView[] = useMemo(() => {
        return config.rowLayout.map((benchCount, colIdx) => {
            const colLabel = String.fromCharCode(65 + colIdx);
            const benches: BenchView[] = [];

            for (let bi = 0; bi < benchCount; bi++) {
                const b = bi + 1;
                const leftKey = `${colLabel}-${b}-1`;
                const leftSeat = seatLookup.get(leftKey);
                const leftLabel = `${b}L`;

                const rightKey = `${colLabel}-${b}-2`;
                const rightSeat = seatLookup.get(rightKey);
                const rightLabel = `${b}R`;

                benches.push({ benchNum: b, leftKey, rightKey, leftSeat, rightSeat, leftLabel, rightLabel });
            }
            return { colLabel, benchCount, benches };
        });
    }, [config, seatLookup]);

    const getSeatClasses = (seat: InternalSeat | undefined): string => {
        if (!seat) return 'ilc-seat ilc-seat--disabled';
        
        const isAlternateDisabled = seatMode === 'Dual' && seat.SeatNumber === 2;
        const isCustomDisabled = customDisabledSeats.has(seat.SeatID);
        const isDisabled = isAlternateDisabled || isCustomDisabled;

        if (isDisabled) return 'ilc-seat ilc-seat--disabled';
        if (viewMode === 'disable') return 'ilc-seat ilc-seat--editable';
        return 'ilc-seat ilc-seat--active';
    };

    const getBenchClasses = (bench: BenchView): string => {
        const leftDis = bench.leftSeat ? (seatMode === 'Dual' && bench.leftSeat.SeatNumber === 2) || customDisabledSeats.has(bench.leftSeat.SeatID) : false;
        const rightDis = bench.rightSeat ? (seatMode === 'Dual' && bench.rightSeat.SeatNumber === 2) || customDisabledSeats.has(bench.rightSeat.SeatID) : false;
        const allDisabled = leftDis && rightDis;
        
        let cls = 'ilc-bench ilc-bench--dual';
        if (allDisabled) cls += ' ilc-bench--all-disabled';
        if (viewMode === 'disable') cls += ' ilc-bench--edit-mode';
        return cls;
    };

    return (
        <div className="ilc-root">
            {/* Header */}
            <div className="ilc-header">
                <div className="ilc-header__left">
                    <div className="ilc-header__icon">
                        <Columns3 size={22} />
                    </div>
                    <div>
                        <h3 className="ilc-header__title">Classroom Architect</h3>
                        <p className="ilc-header__sub">Vertical column-based classroom visualization engine</p>
                    </div>
                </div>
                {selectedRoomId && (
                    <div className="ilc-header__chips">
                        <Chip variant="flat" color="secondary" size="sm" className="font-bold">{roomData?.RoomType}</Chip>
                        <Chip variant="flat" color="primary" size="sm" className="font-bold">{roomData?.SeatMode} Mode</Chip>
                    </div>
                )}
            </div>

            {/* Stage Content */}
            <div className="ilc-container">
                {/* ─ Left Panel: Side Configurator ─ */}
                <div className="ilc-sidebar">
                    <Card className="ilc-sidebar__card border border-slate-100 shadow-sm rounded-2xl bg-white">
                        <CardHeader className="ilc-sidebar__header">
                            <div className="ilc-sidebar__header-icon"><MonitorPlay size={18} /></div>
                            <div>
                                <h3 className="ilc-sidebar__header-title">Grid Engine</h3>
                                <p className="ilc-sidebar__header-sub">Column-by-column seat control</p>
                            </div>
                        </CardHeader>
                        <CardBody className="p-5 flex flex-col gap-5">
                            <div className="space-y-5 pt-1">
                                <div className="flex flex-col gap-2">
                                    <label className="ilc-label">Infrastructure Block</label>
                                    <Autocomplete
                                        items={blocks}
                                        placeholder="Select block..."
                                        size="sm"
                                        variant="bordered"
                                        selectedKey={selectedBlockId ? String(selectedBlockId) : null}
                                        onSelectionChange={(k) => {
                                            const val = k ? String(k) : '';
                                            setSelectedBlockId(val);
                                            setSelectedFloorId('');
                                            setSelectedRoomId('');
                                            setFloors([]);
                                            setRooms([]);
                                        }}
                                        inputProps={{ classNames: { inputWrapper: 'bg-slate-50/50 rounded-xl h-11 border-slate-200' } }}
                                        listboxProps={{ classNames: { base: "p-2 rounded-xl", list: "gap-1" } }}
                                        popoverProps={{ classNames: { content: "rounded-xl border border-slate-100 shadow-2xl bg-white/95 backdrop-blur-xl" } }}>
                                        {(b) => (
                                            <AutocompleteItem key={String(b.BlockID)} textValue={b.BlockName} className="rounded-lg font-bold text-slate-700">
                                                {b.BlockName}
                                            </AutocompleteItem>
                                        )}
                                    </Autocomplete>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="ilc-label">Level / Floor</label>
                                    <Autocomplete
                                        items={floors}
                                        placeholder={!selectedBlockId ? "Select block first..." : (fetchingFloors ? "Loading..." : "Select floor...")}
                                        size="sm"
                                        variant="bordered"
                                        isDisabled={!selectedBlockId || fetchingFloors}
                                        isLoading={fetchingFloors}
                                        selectedKey={selectedFloorId ? String(selectedFloorId) : null}
                                        onSelectionChange={(k) => {
                                            const val = k ? String(k) : '';
                                            setSelectedFloorId(val);
                                            setSelectedRoomId('');
                                            setRooms([]);
                                        }}
                                        inputProps={{ classNames: { inputWrapper: 'bg-slate-50/50 rounded-xl h-11 border-slate-200' } }}
                                        listboxProps={{ classNames: { base: "p-2 rounded-xl", list: "gap-1" } }}
                                        popoverProps={{ classNames: { content: "rounded-xl border border-slate-100 shadow-2xl bg-white/90 backdrop-blur-xl" } }}>
                                        {(f) => (
                                            <AutocompleteItem key={String(f.FloorID)} textValue={`Floor ${f.FloorNumber}`} className="rounded-lg font-bold text-slate-700">
                                                Floor {f.FloorNumber}
                                            </AutocompleteItem>
                                        )}
                                    </Autocomplete>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="ilc-label">Specific Room</label>
                                    <Autocomplete
                                        items={rooms}
                                        placeholder={!selectedFloorId ? "Select floor first..." : (fetchingRooms ? "Loading..." : "Select room...")}
                                        size="sm"
                                        variant="bordered"
                                        isDisabled={!selectedFloorId || fetchingRooms || loading}
                                        isLoading={fetchingRooms}
                                        selectedKey={selectedRoomId ? String(selectedRoomId) : null}
                                        onSelectionChange={(k) => setSelectedRoomId(k ? String(k) : '')}
                                        inputProps={{ classNames: { inputWrapper: 'bg-slate-50/50 rounded-xl h-11 border-slate-200' } }}
                                        listboxProps={{ classNames: { base: "p-2 rounded-xl", list: "gap-1" } }}
                                        popoverProps={{ classNames: { content: "rounded-xl border border-slate-100 shadow-2xl bg-white/90 backdrop-blur-xl" } }}>
                                        {(r) => (
                                            <AutocompleteItem key={String(r.RoomID)} textValue={r.RoomCode}>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{r.RoomCode}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase font-black">{r.RoomType}</span>
                                                </div>
                                            </AutocompleteItem>
                                        )}
                                    </Autocomplete>
                                </div>
                            </div>

                            <Divider className="opacity-60" />

                            {selectedRoomId ? (
                                <div className="space-y-5">
                                    {/* Column Controls */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="ilc-label" style={{ margin: 0 }}>Classroom Columns</h4>
                                            <Button size="sm" variant="flat" color="secondary" startContent={<Plus size={13} />} onPress={handleAddColumn} isDisabled={readOnly} className="font-bold">Add Column</Button>
                                        </div>
                                        <div className="ilc-col-list">
                                            {config.rowLayout.map((seatCount, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center text-xs font-black shadow-sm shadow-violet-50">{String.fromCharCode(65 + i)}</span>
                                                    <div className="flex-1">
                                                        <Input type="number" min={1} max={30} value={String(seatCount)}
                                                            onChange={(e) => handleSeatCountChange(i, Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                                                            classNames={{ inputWrapper: 'bg-slate-50 border-none shadow-none h-8', input: 'font-bold' }} isDisabled={readOnly} />
                                                    </div>
                                                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleRemoveColumn(i)} isDisabled={readOnly} className="rounded-lg"><Minus size={14} /></Button>
                                                </div>
                                            ))}
                                            {config.rowLayout.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No columns defined</p>}
                                        </div>
                                    </div>

                                    {/* Seat Mode */}
                                    <div className="ilc-schema-box">
                                        <div className="flex justify-between items-center">
                                            <span className="ilc-label" style={{ margin: 0 }}>Seating Schema</span>
                                            <Chip size="sm" variant="dot" color="primary" className="font-bold border-none text-[10px] uppercase">{seatMode}</Chip>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[{ v: 'Dual', l: '⊡ Dual' }, { v: 'Single', l: '□ Single' }].map(s => (
                                                <button key={s.v} disabled={readOnly}
                                                    onClick={() => setSeatMode(s.v as any)}
                                                    className={`py-2 rounded-xl text-xs font-black border-2 transition-all ${seatMode === s.v ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-100' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'}`}>
                                                    {s.l}
                                                </button>
                                            ))}
                                        </div>
                                        <Divider className="opacity-40" />
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex flex-col">
                                                <span className="ilc-label" style={{ margin: 0, color: '#7c3aed' }}>Live Capacity</span>
                                                <span className="text-[10px] text-slate-400 font-medium">Active seats only</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-3xl font-black text-violet-700 tracking-tighter">{totalActiveSeats}</span>
                                                {seats.length - totalActiveSeats > 0 && (
                                                    <span className="text-[10px] text-red-400 font-bold">({seats.length - totalActiveSeats} disabled)</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Save/Reset */}
                                    {!readOnly && (
                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <Button variant="flat" color="default" isDisabled={!isDirty || loading} onPress={handleReset}
                                                startContent={<RotateCcw size={16} />}
                                                className={`font-bold h-11 rounded-xl border ${isDirty ? 'bg-white text-slate-700 border-slate-200 shadow-sm' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                                                Reset
                                            </Button>
                                            <Button isLoading={loading} isDisabled={(!isDirty) || capacityCount === 0 || loading} onPress={handleSave}
                                                startContent={isDirty ? <Save size={16} /> : null}
                                                className={`font-black h-11 rounded-xl transition-all ${isDirty ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-xl shadow-violet-100' : 'bg-emerald-500 text-white opacity-90'}`}>
                                                {isDirty ? 'Save' : 'Saved ✓'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                                        <Armchair size={24} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-400">Select room to start</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* ─ Right Panel: Classroom Visualization ─ */}
                <div className="ilc-classroom">
                    <div className="ilc-classroom__grid-bg" />

                    {!selectedRoomId ? (
                        <div className="ilc-classroom__empty">
                            <Columns3 size={56} strokeWidth={1} />
                            <p>Vertical Classroom Engine</p>
                            <span>Select a room to visualize</span>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="ilc-toolbar">
                                <div className="ilc-toolbar__info">
                                    <div className="ilc-toolbar__dot" />
                                    <div>
                                        <span className="ilc-toolbar__room">{roomData?.RoomCode}</span>
                                        <span className="ilc-toolbar__meta">
                                            {config.rowLayout.length} Columns · {totalActiveSeats} Active Seats
                                        </span>
                                    </div>
                                </div>
                                {!readOnly && (
                                    <div className="ilc-toolbar__modes">
                                        {([
                                            { key: 'view' as const, label: 'View', icon: <Eye size={12} /> },
                                            { key: 'disable' as const, label: 'Toggle Seats', icon: <MousePointerClick size={12} /> },
                                        ]).map(m => (
                                            <button key={m.key} onClick={() => setViewMode(m.key)}
                                                className={`ilc-toolbar__mode-btn ${viewMode === m.key ? 'ilc-toolbar__mode-btn--active' : ''}`}>
                                                {m.icon}
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Classroom Area */}
                            <div className="ilc-classroom__stage">
                                {/* Blackboard */}
                                <div className="ilc-blackboard">
                                    <div className="ilc-blackboard__glow" />
                                    <span className="ilc-blackboard__text">Front Blackboard</span>
                                    <div className="ilc-blackboard__reflection" />
                                </div>

                                {/* Column Labels */}
                                <div className="ilc-columns-wrapper">
                                    <div className="ilc-col-labels ilc-col-labels--dual">
                                        {visualColumns.map(col => (
                                            <div key={col.colLabel} className="ilc-col-label ilc-col-label--dual">
                                                {col.colLabel}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Vertical Columns */}
                                    <div className="ilc-columns ilc-columns--dual">
                                        {visualColumns.map(col => (
                                            <div key={col.colLabel} className="ilc-column ilc-column--dual">
                                                <div className="ilc-column__inner">
                                                    {col.benches.map(bench => (
                                                        <div key={bench.benchNum} className={getBenchClasses(bench)}>
                                                            {/* Left Seat */}
                                                            <button
                                                                disabled={readOnly || viewMode !== 'disable'}
                                                                onClick={() => bench.leftSeat && toggleSeatDisable(bench.leftSeat.SeatID)}
                                                                className={getSeatClasses(bench.leftSeat)}
                                                                title={`${col.colLabel}${bench.leftLabel}`}
                                                            >
                                                                <span className="ilc-seat__label">{bench.leftLabel}</span>
                                                            </button>

                                                            {/* Bench Divider + Right Seat (Always physically present) */}
                                                            {bench.rightSeat !== undefined && (
                                                                <>
                                                                    <div className="ilc-bench__divider" />
                                                                    <button
                                                                        disabled={readOnly || viewMode !== 'disable'}
                                                                        onClick={() => bench.rightSeat && toggleSeatDisable(bench.rightSeat.SeatID)}
                                                                        className={getSeatClasses(bench.rightSeat)}
                                                                        title={`${col.colLabel}${bench.rightLabel}`}
                                                                    >
                                                                        <span className="ilc-seat__label">{bench.rightLabel}</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {config.rowLayout.length === 0 && (
                                            <div className="ilc-classroom__no-cols">
                                                <Layers size={36} />
                                                <p>No columns defined</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="ilc-legend">
                                <div className="ilc-legend__items">
                                    <div className="ilc-legend__item">
                                        <div className="ilc-legend__dot ilc-legend__dot--active" />
                                        <span>Active Seat</span>
                                    </div>
                                    <div className="ilc-legend__item">
                                        <div className="ilc-legend__dot ilc-legend__dot--disabled" />
                                        <span>Disabled</span>
                                    </div>
                                </div>
                                <div className="ilc-legend__hint">
                                    <Info size={13} />
                                    <span>{viewMode === 'disable' ? 'Click seats to toggle status' : 'View mode — switch to Toggle Seats for changes'}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
