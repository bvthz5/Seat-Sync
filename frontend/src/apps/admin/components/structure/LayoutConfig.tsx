import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Autocomplete, AutocompleteItem, Input, Button, Card, CardBody, CardHeader, Divider, Tooltip, Chip, Switch, Select, SelectItem } from '@heroui/react';
import { Armchair, Save, RotateCcw, MonitorPlay, AlertTriangle, Grid3X3, Building2, Layers, Layout, MapPin, ChevronRight, Hash, Maximize2, Minimize2, Eye, EyeOff, Spline, CheckCircle2, Ban } from 'lucide-react';
import { structureService } from '../../services/structureService';
import { Block, Floor, Room } from '../../types/collegeStructure';
import { toast } from '../../../../utils/toast';

interface LayoutConfigProps {
    readOnly?: boolean;
}

// Internal extended types for the Atomic Seat Model
type RoomType = 'ROOM' | 'HALL';
type BenchMode = 'PAIRED' | 'ALTERNATING';
type ViewMode = 'PHYSICAL' | 'LOGICAL';

interface SeatConfig {
    id: string; // e.g., "A-1-1" (Col-Bench-Seat)
    colIndex: number;
    colLabel: string;
    benchIndex: number;
    seatIndex: number; // 1-based index within bench
    isActive: boolean;
    logicalRow: number;
    zoneId?: string; // Future proofing
}

export const LayoutConfig: React.FC<LayoutConfigProps> = ({ readOnly = false }) => {
    // --- Data State ---
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);

    const [selectedBlockId, setSelectedBlockId] = useState<string>("");
    const [selectedFloorId, setSelectedFloorId] = useState<string>("");
    const [selectedRoomId, setSelectedRoomId] = useState<string>("");

    // --- Configuration State ---
    const [config, setConfig] = useState({
        rows: 0,
        benchesPerRow: 0,
        seatsPerBench: 0,
        // Extended attributes
        roomType: 'ROOM' as RoomType,
        benchMode: 'PAIRED' as BenchMode
    });

    const [viewMode, setViewMode] = useState<ViewMode>('PHYSICAL');
    const [disabledSeatIds, setDisabledSeatIds] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(false);
    const [initialConfig, setInitialConfig] = useState<any>(null); // To detect changes
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Loading Effects ---

    useEffect(() => {
        const handleFullScreenChange = () => {
            if (!document.fullscreenElement) setIsFullScreen(false);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const toggleFullScreen = () => {
        if (!isFullScreen) {
            setIsFullScreen(true);
            if (containerRef.current) {
                containerRef.current.requestFullscreen().catch((err) => console.warn("Error attempting to enable full-screen mode:", err));
            }
        } else {
            setIsFullScreen(false);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch((err) => console.warn("Error attempting to exit full-screen mode:", err));
            }
        }
    };

    useEffect(() => { loadBlocks(); }, []);

    useEffect(() => {
        if (selectedBlockId) {
            loadFloors(Number(selectedBlockId));
            setSelectedFloorId("");
            setRooms([]);
        } else {
            setFloors([]);
            setRooms([]);
        }
    }, [selectedBlockId]);

    useEffect(() => {
        if (selectedFloorId && selectedBlockId) {
            loadRooms(Number(selectedBlockId), Number(selectedFloorId));
            setSelectedRoomId("");
        } else {
            setRooms([]);
        }
    }, [selectedFloorId, selectedBlockId]);

    // When room is selected, load its config
    useEffect(() => {
        if (selectedRoomId) {
            const room = rooms.find(r => r.RoomID === Number(selectedRoomId));
            if (room) {
                // Initialize Config
                const newConfig = {
                    rows: room.TotalRows,
                    benchesPerRow: room.BenchesPerRow,
                    seatsPerBench: room.SeatsPerBench,
                    roomType: 'ROOM' as RoomType, // Default for now until backend supports
                    benchMode: 'PAIRED' as BenchMode
                };
                setConfig(newConfig);
                setInitialConfig(newConfig);
                setDisabledSeatIds(new Set()); // Reset disabled seats
            }
        } else {
            setConfig({ rows: 0, benchesPerRow: 0, seatsPerBench: 0, roomType: 'ROOM', benchMode: 'PAIRED' });
            setInitialConfig(null);
            setDisabledSeatIds(new Set());
        }
    }, [selectedRoomId, rooms]);

    // --- Data Fetching ---

    const loadBlocks = async () => {
        try {
            const response: any = await structureService.getBlocks({ limit: 100 });
            const data = response.data || response;
            if (Array.isArray(data)) {
                setBlocks(data);
                if (data.length > 0 && !selectedBlockId) setSelectedBlockId(data[0].BlockID.toString());
            } else setBlocks([]);
        } catch (error) {
            console.error("Failed to load blocks", error);
            toast.error("Failed to load building blocks");
        }
    };

    const loadFloors = async (blockId: number) => {
        try {
            const response: any = await structureService.getFloors({ blockId, limit: 100 });
            setFloors(Array.isArray(response.data || response) ? (response.data || response) : []);
        } catch (error) { console.error("Failed to load floors", error); }
    };

    const loadRooms = async (blockId: number, floorId: number) => {
        try {
            const response: any = await structureService.getRooms({ blockId, floorId });
            setRooms(Array.isArray(response) ? response : (response.data || []));
        } catch (error) { console.error("Failed to load rooms", error); }
    };

    // --- Logic: Atomic Seat Generation ---
    const generatedSeats = useMemo(() => {
        const seats: SeatConfig[] = [];
        if (!selectedRoomId || config.rows === 0) return seats;

        for (let r = 0; r < config.rows; r++) {
            const colLabel = String.fromCharCode(65 + r); // A, B, C...

            for (let b = 0; b < config.benchesPerRow; b++) {
                for (let s = 1; s <= config.seatsPerBench; s++) {
                    const seatId = `${colLabel}-${b + 1}-${s}`;
                    const isActive = !disabledSeatIds.has(seatId);

                    // Logical Row Calculation
                    // If Paired: All seats in bench are same logical row (roughly) -> Actually usually row depends on bench index
                    // If Alternating: Odd seats = One row, Even seats = Next row
                    let logicalRow = (b * 2) + 1; // Default simplistic mapping: Bench 1 -> Row 1, Bench 2 -> Row 3... (Visual rows)

                    if (config.benchMode === 'ALTERNATING') {
                        logicalRow = (b * 2) + (s % 2 === 0 ? 2 : 1);
                    } else {
                        logicalRow = b + 1; // Standard: Bench 1 is Row 1, Bench 2 is Row 2
                    }

                    seats.push({
                        id: seatId,
                        colIndex: r,
                        colLabel,
                        benchIndex: b,
                        seatIndex: s,
                        isActive,
                        logicalRow: logicalRow
                    });
                }
            }
        }
        return seats;
    }, [config, disabledSeatIds, selectedRoomId]);

    const activeSeatCount = generatedSeats.filter(s => s.isActive).length;

    // --- Actions ---

    const toggleSeat = (seatId: string) => {
        if (readOnly) return;
        const newSet = new Set(disabledSeatIds);
        if (newSet.has(seatId)) {
            newSet.delete(seatId);
        } else {
            newSet.add(seatId);
        }
        setDisabledSeatIds(newSet);
    };

    const handleSave = async () => {
        if (!selectedRoomId) return;

        if (activeSeatCount === 0) {
            toast.error("Layout must have at least one active seat.");
            return;
        }

        const room = rooms.find(r => r.RoomID === Number(selectedRoomId));
        if (!room) return;

        if (activeSeatCount > room.Capacity) {
            toast.error(`Configuration exceeds room capacity (${room.Capacity} seats). Please increase room capacity first.`);
            return;
        }

        setLoading(true);
        try {
            // Note: We are currently saving the GRID dimensions.
            // The disabled seats and advanced mode need backend support to be persisted.
            // For now, we save the base structure.
            await structureService.updateRoomLayout(Number(selectedRoomId), {
                ...room,
                TotalRows: config.rows,
                BenchesPerRow: config.benchesPerRow,
                SeatsPerBench: config.seatsPerBench
            });
            toast.success("Seating layout structure updated successfully");
            setInitialConfig(config);
            loadRooms(Number(selectedBlockId), Number(selectedFloorId));
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to save layout");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (initialConfig) {
            setConfig(initialConfig);
            setDisabledSeatIds(new Set());
            toast.success("Layout reset to saved state");
        }
    };

    const isDirty = initialConfig && (
        config.rows !== initialConfig.rows ||
        config.benchesPerRow !== initialConfig.benchesPerRow ||
        config.seatsPerBench !== initialConfig.seatsPerBench ||
        config.roomType !== initialConfig.roomType ||
        config.benchMode !== initialConfig.benchMode ||
        disabledSeatIds.size > 0
    );

    return (
        <div className="flex flex-col gap-8 pb-12 relative">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="flex items-center gap-5 z-10 w-full">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                        <Layout size={24} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Room Layout Designer</h3>
                        <p className="text-slate-500 font-medium">Configure seating arrangements and bench grids</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 items-start relative">
                {/* CONFIGURATION PANEL (LEFT) */}
                <div className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-[140px] transition-all z-10">
                    <Card className="border border-slate-200 shadow-xl shadow-slate-200/50 bg-white/95 backdrop-blur-xl">
                        <CardHeader className="flex gap-3 bg-slate-50/50 border-b border-slate-100 p-6">
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-indigo-600">
                                <MonitorPlay size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Configuration</h3>
                                <p className="text-xs text-slate-500 font-medium">Define room parameters</p>
                            </div>
                        </CardHeader>

                        <CardBody className="p-6 flex flex-col gap-8">
                            {/* Location Selectors */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5"><Building2 size={12} /> Building Block</label>
                                    <Autocomplete
                                        aria-label="Select Building"
                                        placeholder="Search building..."
                                        variant="bordered"
                                        selectedKey={selectedBlockId}
                                        onSelectionChange={(k) => setSelectedBlockId(k as string)}
                                        inputProps={{ classNames: { inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl data-[hover=true]:bg-slate-100 group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg group-data-[focus=true]:ring-2 ring-indigo-500/20 transition-all", input: "!text-slate-700 !font-bold" } }}
                                        popoverProps={{ classNames: { content: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl" } }}
                                    >
                                        {blocks.map(b => <AutocompleteItem key={b.BlockID} textValue={b.BlockName}>{b.BlockName}</AutocompleteItem>)}
                                    </Autocomplete>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5"><Layers size={12} /> Floor</label>
                                        <Autocomplete
                                            isDisabled={!selectedBlockId}
                                            aria-label="Select Floor"
                                            placeholder="Floor..."
                                            variant="bordered"
                                            selectedKey={selectedFloorId}
                                            onSelectionChange={(k) => setSelectedFloorId(k as string)}
                                            inputProps={{ classNames: { inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl data-[hover=true]:bg-slate-100 group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg group-data-[focus=true]:ring-2 ring-indigo-500/20 transition-all", input: "!text-slate-700 !font-bold" } }}
                                            popoverProps={{ classNames: { content: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl" } }}
                                        >
                                            {floors.map(f => <AutocompleteItem key={f.FloorID} textValue={`Floor ${f.FloorNumber}`}>{`Floor ${f.FloorNumber}`}</AutocompleteItem>)}
                                        </Autocomplete>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5"><Armchair size={12} /> Room</label>
                                        <Autocomplete
                                            isDisabled={!selectedFloorId}
                                            aria-label="Select Room"
                                            placeholder="Room..."
                                            variant="bordered"
                                            selectedKey={selectedRoomId}
                                            onSelectionChange={(k) => setSelectedRoomId(k as string)}
                                            inputProps={{ classNames: { inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl data-[hover=true]:bg-slate-100 group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg group-data-[focus=true]:ring-2 ring-indigo-500/20 transition-all", input: "!text-slate-700 !font-bold" } }}
                                            popoverProps={{ classNames: { content: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl" } }}
                                        >
                                            {rooms.map(r => <AutocompleteItem key={r.RoomID} textValue={r.RoomCode}>{r.RoomCode || r.RoomName}</AutocompleteItem>)}
                                        </Autocomplete>
                                    </div>
                                </div>
                            </div>

                            <Divider className="opacity-50" />

                            {selectedRoomId ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                    {/* A. Room Type & Bench Mode */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-slate-700">Room Strategy</h4>
                                            {isDirty && <Chip size="sm" color="warning" variant="flat" className="h-5 text-[10px] font-bold">Modified</Chip>}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Room Type</label>
                                                <Select
                                                    selectedKeys={[config.roomType]}
                                                    onChange={(e) => setConfig({ ...config, roomType: e.target.value as RoomType })}
                                                    variant="bordered"
                                                    classNames={{
                                                        trigger: "bg-slate-50 border-none shadow-inner rounded-xl h-11 data-[hover=true]:bg-slate-100 pr-2",
                                                        popoverContent: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg",
                                                        selectorIcon: "right-3"
                                                    }}
                                                >
                                                    <SelectItem key="ROOM" startContent={<Grid3X3 size={14} />}>Classroom</SelectItem>
                                                    <SelectItem key="HALL" startContent={<Layout size={14} />}>Exam Hall</SelectItem>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Bench Mode</label>
                                                <Select
                                                    selectedKeys={[config.benchMode]}
                                                    onChange={(e) => setConfig({ ...config, benchMode: e.target.value as BenchMode })}
                                                    variant="bordered"
                                                    classNames={{
                                                        trigger: "bg-slate-50 border-none shadow-inner rounded-xl h-11 data-[hover=true]:bg-slate-100 pr-2",
                                                        popoverContent: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg",
                                                        selectorIcon: "right-3"
                                                    }}
                                                >
                                                    <SelectItem key="PAIRED" startContent={<CheckCircle2 size={14} />}>Standard</SelectItem>
                                                    <SelectItem key="ALTERNATING" startContent={<Spline size={14} />}>Split Logic</SelectItem>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* B. Grid Dimensions */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-700">Grid Dimensions</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Columns</label>
                                                <Input type="number" min={1} value={config.rows.toString()} onValueChange={(v) => setConfig({ ...config, rows: Number(v) })} classNames={{ inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg transition-all", input: "!font-bold text-slate-700" }} />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Benches/Col</label>
                                                <Input type="number" min={1} value={config.benchesPerRow.toString()} onValueChange={(v) => setConfig({ ...config, benchesPerRow: Number(v) })} classNames={{ inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg transition-all", input: "!font-bold text-slate-700" }} />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Seats/Bench</label>
                                            <Input type="number" min={1} value={config.seatsPerBench.toString()} onValueChange={(v) => setConfig({ ...config, seatsPerBench: Number(v) })} classNames={{ inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg transition-all", input: "!font-bold text-slate-700" }} startContent={<Hash size={14} className="text-slate-400" />} />
                                        </div>
                                    </div>

                                    {/* Capacity Summary */}
                                    <div className={`mt-2 p-4 rounded-2xl border flex items-center justify-between group transition-colors ${activeSeatCount > (rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0) ? 'bg-red-50 border-red-200' : 'bg-gradient-to-br from-slate-50 to-indigo-50/30 border-slate-200'}`}>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Active Capacity</span>
                                            <span className="text-[10px] font-medium text-slate-400">Max: {rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0}</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-3xl font-black ${activeSeatCount > (rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0) ? 'text-red-600' : 'text-indigo-600'}`}>{activeSeatCount}</span>
                                            <span className="text-xs font-bold uppercase text-indigo-400">Seats</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {!readOnly && (
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <Button variant="flat" color="danger" isDisabled={!isDirty || loading} onPress={handleReset} startContent={<RotateCcw size={16} />} className="h-12 font-semibold rounded-xl">Reset</Button>
                                            <Button color="primary" isLoading={loading} isDisabled={!isDirty || activeSeatCount === 0} onPress={handleSave} startContent={<Save size={18} />} className="h-12 font-bold shadow-lg shadow-indigo-500/20 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:to-indigo-600">Save Layout</Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center text-center gap-4 text-slate-400 opacity-60">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center"><Layout size={24} /></div>
                                    <p className="text-sm font-medium">Select a room to begin configuration.</p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* VISUALIZATION PANEL (RIGHT) */}
                <div
                    ref={containerRef}
                    className={`${isFullScreen ? 'fixed inset-0 z-[100] rounded-none h-screen w-screen' : 'flex-1 min-h-[800px] rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5'} flex flex-col bg-[#0F172A] relative transition-all duration-500 overflow-hidden`}
                >
                    {/* Navbar */}
                    <div className="relative z-20 flex justify-between items-center p-6 border-b border-white/5 bg-[#0F172A]/90 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] ${selectedRoomId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                            <div>
                                <h3 className="text-white font-bold tracking-tight text-sm">Layout Designer <span className="text-xs font-normal text-slate-500 ml-2 border border-slate-700 px-2 py-0.5 rounded-full">{config.roomType} / {config.benchMode}</span></h3>
                                <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
                                    {selectedRoomId ? `Editing: ${rooms.find(r => r.RoomID === Number(selectedRoomId))?.RoomCode}` : 'No Room Selected'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* View Toggle */}
                            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                                <button onClick={() => setViewMode('PHYSICAL')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${viewMode === 'PHYSICAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    <Eye size={12} /> Physical
                                </button>
                                <button onClick={() => setViewMode('LOGICAL')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${viewMode === 'LOGICAL' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    <Spline size={12} /> Logical
                                </button>
                            </div>

                            <Tooltip content={isFullScreen ? "Exit Full Screen" : "Enter Full Screen"} closeDelay={0}>
                                <button onClick={toggleFullScreen} className="p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 relative overflow-auto custom-scrollbar p-12 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-5">
                        {/* Background Grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none" />

                        {!selectedRoomId ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <Grid3X3 size={80} className="text-white mb-4" />
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Select Room</h3>
                            </div>
                        ) : (
                            <div className="min-w-min mx-auto pb-24">
                                {/* Teacher Desk */}
                                <div className="flex flex-col items-center gap-4 mb-16">
                                    <div className="w-80 h-20 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl flex items-center justify-center relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-indigo-500/5" />
                                        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] group-hover:text-indigo-400 transition-colors">Teacher's Podium</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                        <ChevronRight className="rotate-90" size={12} /> Front <ChevronRight className="rotate-90" size={12} />
                                    </div>
                                </div>

                                {/* Seating Layout */}
                                <div className="flex gap-12 justify-center">
                                    {Array.from({ length: config.rows }).map((_, r) => {
                                        const colLabel = String.fromCharCode(65 + r);
                                        return (
                                            <div key={r} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${r * 50}ms` }}>
                                                {/* Col Header */}
                                                <div className="w-full text-center mb-2">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-bold shadow-xl">{colLabel}</span>
                                                </div>

                                                {/* Benches in Column */}
                                                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-[2rem] flex flex-col gap-4">
                                                    {Array.from({ length: config.benchesPerRow }).map((_, b) => (
                                                        <div key={b} className="relative group/bench">

                                                            {/* Bench Container */}
                                                            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl p-3 shadow-lg hover:border-indigo-500/30 transition-colors">
                                                                {/* Desk Surface */}
                                                                <div className="h-1.5 w-full bg-slate-700 rounded-full mb-3 opacity-50" />

                                                                {/* Seats */}
                                                                <div className="flex gap-3 justify-center">
                                                                    {Array.from({ length: config.seatsPerBench }).map((_, s) => {
                                                                        const seatIndex = s + 1;
                                                                        const seatId = `${colLabel}-${b + 1}-${seatIndex}`;
                                                                        const isActive = !disabledSeatIds.has(seatId);

                                                                        // Calculated logical data
                                                                        let logicalRow = b + 1;
                                                                        if (config.benchMode === 'ALTERNATING') logicalRow = (b * 2) + (seatIndex % 2 === 0 ? 2 : 1);

                                                                        return (
                                                                            <Tooltip key={seatIndex} content={
                                                                                <div className="px-2 py-1">
                                                                                    <div className="font-black text-sm text-white mb-0.5 shadow-black drop-shadow-md">{seatId}</div>
                                                                                    <div className={`text-[11px] font-medium ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>Status: {isActive ? 'Active' : 'Inactive'}</div>
                                                                                    {viewMode === 'LOGICAL' && <div className="text-[10px] text-indigo-400 mt-0.5">Logical Row: {logicalRow}</div>}
                                                                                </div>
                                                                            } closeDelay={0}>
                                                                                <div
                                                                                    onClick={() => toggleSeat(seatId)}
                                                                                    className={`
                                                                                        w-10 h-10 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-200 relative overflow-hidden group/seat
                                                                                        ${isActive
                                                                                            ? (viewMode === 'LOGICAL'
                                                                                                ? (logicalRow % 2 === 0 ? "bg-emerald-900/20 border-emerald-600/50 text-emerald-400" : "bg-blue-900/20 border-blue-600/50 text-blue-400")
                                                                                                : "bg-slate-900 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]")
                                                                                            : "bg-slate-900/50 border-slate-800 text-slate-700 hover:border-red-500/50 hover:text-red-500"}
                                                                                    `}
                                                                                >
                                                                                    {isActive ? (
                                                                                        <span className="text-[10px] font-bold font-mono z-10">{seatIndex}</span>
                                                                                    ) : (
                                                                                        <Ban size={14} strokeWidth={3} />
                                                                                    )}

                                                                                    {/* Active Glow */}
                                                                                    {isActive && <div className="absolute inset-0 bg-current opacity-0 group-hover/seat:opacity-10 transition-opacity" />}
                                                                                </div>
                                                                            </Tooltip>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Bench ID Label */}
                                                            <div className="absolute -left-10 top-1/2 -translate-y-1/2 text-xs font-black text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-wider">
                                                                B{b + 1}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Legend Footer */}
                    <div className="bg-[#0F172A] border-t border-white/5 p-4 flex justify-between items-center text-[10px] text-slate-500 font-medium uppercase tracking-wider relative z-20">
                        <div className="flex gap-6">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-900 border border-indigo-500/30" /> Active Seat</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-900/50 border border-slate-800" /> Inactive (Click to toggle)</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-800 border border-slate-700" /> Bench Container</div>
                        </div>
                        <div>
                            Values: {config.benchMode === 'ALTERNATING' ? 'Split-Bench Logic Enabled' : 'Standard Logic'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
