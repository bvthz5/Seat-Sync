import React, { useState, useEffect, useRef } from 'react';
import { Autocomplete, AutocompleteItem, Input, Button, Card, CardBody, CardHeader, Divider, Tooltip, Chip } from '@heroui/react';
import { Armchair, Save, RotateCcw, MonitorPlay, AlertTriangle, Grid3X3, Building2, Layers, Layout, MapPin, ChevronRight, Hash, Maximize2, Minimize2 } from 'lucide-react';
import { structureService } from '../../services/structureService';
import { Block, Floor, Room } from '../../types/collegeStructure';
import { toast } from '../../../../utils/toast';

interface LayoutConfigProps {
    readOnly?: boolean;
}

export const LayoutConfig: React.FC<LayoutConfigProps> = ({ readOnly = false }) => {
    // --- State ---
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);

    const [selectedBlockId, setSelectedBlockId] = useState<string>("");
    const [selectedFloorId, setSelectedFloorId] = useState<string>("");
    const [selectedRoomId, setSelectedRoomId] = useState<string>("");

    // Config state
    const [config, setConfig] = useState({
        rows: 0,
        benchesPerRow: 0,
        seatsPerBench: 0
    });

    const [loading, setLoading] = useState(false);
    const [initialConfig, setInitialConfig] = useState<any>(null); // To detect changes
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Loading Effects ---

    // Handle Full Screen Changes
    useEffect(() => {
        const handleFullScreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullScreen(false);
            }
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const toggleFullScreen = () => {
        if (!isFullScreen) {
            setIsFullScreen(true);
            // Request full screen on the specific element to bypass parent transforms
            if (containerRef.current) {
                containerRef.current.requestFullscreen().catch((err) => {
                    console.warn("Error attempting to enable full-screen mode:", err);
                });
            }
        } else {
            setIsFullScreen(false);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch((err) => {
                    console.warn("Error attempting to exit full-screen mode:", err);
                });
            }
        }
    };

    useEffect(() => {
        loadBlocks();
    }, []);

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
                const newConfig = {
                    rows: room.TotalRows,
                    benchesPerRow: room.BenchesPerRow,
                    seatsPerBench: room.SeatsPerBench
                };
                setConfig(newConfig);
                setInitialConfig(newConfig);
            }
        } else {
            setConfig({ rows: 0, benchesPerRow: 0, seatsPerBench: 0 });
            setInitialConfig(null);
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
            } else {
                setBlocks([]);
            }
        } catch (error) {
            console.error("Failed to load blocks", error);
            toast.error("Failed to load building blocks");
        }
    };

    const loadFloors = async (blockId: number) => {
        try {
            const response: any = await structureService.getFloors({ blockId, limit: 100 });
            const data = response.data || response;
            setFloors(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to load floors", error);
        }
    };

    const loadRooms = async (blockId: number, floorId: number) => {
        try {
            // Backend requires both blockId and floorId for /api/rooms
            const response: any = await structureService.getRooms({ blockId, floorId });
            setRooms(Array.isArray(response) ? response : (response.data || []));
        } catch (error) {
            console.error("Failed to load rooms", error);
        }
    };

    // --- Actions ---

    const handleSave = async () => {
        if (!selectedRoomId) return;

        if (config.rows <= 0 || config.benchesPerRow <= 0 || config.seatsPerBench <= 0) {
            toast.error("All layout parameters must be greater than zero.");
            return;
        }

        const room = rooms.find(r => r.RoomID === Number(selectedRoomId));
        if (!room) return;

        const maxCapacity = room.Capacity || 0;
        const totalConfigured = config.rows * config.benchesPerRow * config.seatsPerBench;

        if (totalConfigured > maxCapacity) {
            toast.error(`Configuration exceeds room capacity (${maxCapacity} seats). Please increase room capacity first.`);
            return;
        }

        setLoading(true);
        try {
            await structureService.updateRoomLayout(Number(selectedRoomId), {
                ...room,
                TotalRows: config.rows,
                BenchesPerRow: config.benchesPerRow,
                SeatsPerBench: config.seatsPerBench
            });
            toast.success("Seating layout updated successfully");
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
            toast.success("Layout reset to saved state");
        }
    };

    // --- Render Helpers ---

    const totalSeats = config.rows * config.benchesPerRow * config.seatsPerBench;
    const isDirty = initialConfig && (
        config.rows !== initialConfig.rows ||
        config.benchesPerRow !== initialConfig.benchesPerRow ||
        config.seatsPerBench !== initialConfig.seatsPerBench
    );

    return (
        <div className="flex flex-col gap-8 pb-12 relative">
            {/* Page Title / Header */}
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
                {/* Left Panel: Configuration (Sticky) */}
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

                            {/* 1. Location Selection */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex flex-col gap-2 w-full">
                                        <label htmlFor="block-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Building2 size={12} /> Building Block
                                        </label>
                                        <Autocomplete
                                            inputProps={{
                                                id: "block-select",
                                                classNames: {
                                                    inputWrapper: "h-14 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl transition-all pl-4",
                                                    input: "text-slate-800 font-bold text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                                }
                                            }}
                                            aria-label="Select Building Block"
                                            placeholder="Search building..."
                                            selectedKey={selectedBlockId}
                                            onSelectionChange={(key: React.Key | null) => setSelectedBlockId(key as string)}
                                            variant="bordered"
                                            listboxProps={{
                                                itemClasses: {
                                                    base: "rounded-lg data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-600 px-3 py-2 my-1 gap-3",
                                                    title: "font-medium",
                                                    description: "text-xs text-slate-400"
                                                }
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "rounded-xl border border-slate-100 shadow-2xl min-w-[300px]"
                                                }
                                            }}
                                        >
                                            {blocks.map(b => (
                                                <AutocompleteItem key={b.BlockID.toString()} textValue={b.BlockName}>
                                                    <div className="flex gap-3 items-center">
                                                        <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-data-[hover=true]:bg-white group-data-[hover=true]:text-indigo-500 transition-colors">
                                                            <Building2 size={18} />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-slate-800 text-sm group-data-[hover=true]:text-indigo-700">{b.BlockName}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono group-data-[hover=true]:text-indigo-400">ID: {b.BlockID}</span>
                                                        </div>
                                                    </div>
                                                </AutocompleteItem>
                                            ))}
                                        </Autocomplete>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="floor-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Layers size={12} /> Floor
                                        </label>
                                        <Autocomplete
                                            inputProps={{
                                                id: "floor-select",
                                                classNames: {
                                                    inputWrapper: "h-14 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl transition-all pl-4",
                                                    input: "text-slate-800 font-bold text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                                }
                                            }}
                                            aria-label="Select Floor"
                                            placeholder="Search floor..."
                                            isDisabled={!selectedBlockId}
                                            selectedKey={selectedFloorId}
                                            onSelectionChange={(key: React.Key | null) => setSelectedFloorId(key as string)}
                                            variant="bordered"
                                            listboxProps={{
                                                itemClasses: {
                                                    base: "rounded-lg data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-600 px-3 py-2 my-1 gap-3",
                                                }
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "rounded-xl border border-slate-100 shadow-2xl min-w-[200px]"
                                                }
                                            }}
                                        >
                                            {floors.map(f => (
                                                <AutocompleteItem key={f.FloorID.toString()} textValue={`Floor ${f.FloorNumber}`}>
                                                    <div className="flex gap-3 items-center">
                                                        <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-data-[hover=true]:bg-white group-data-[hover=true]:text-indigo-500 transition-colors">
                                                            <Layers size={18} />
                                                        </div>
                                                        <div className="flex flex-col justify-center">
                                                            <span className="font-bold text-slate-800 text-sm group-data-[hover=true]:text-indigo-700">Floor {f.FloorNumber}</span>
                                                        </div>
                                                    </div>
                                                </AutocompleteItem>
                                            ))}
                                        </Autocomplete>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor="room-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Armchair size={12} /> Room
                                        </label>
                                        <Autocomplete
                                            inputProps={{
                                                id: "room-select",
                                                classNames: {
                                                    inputWrapper: `h-14 rounded-xl transition-all pl-4 border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 ${selectedRoomId ? 'bg-blue-50 border-blue-200' : 'bg-white'}`,
                                                    input: "text-slate-800 font-bold text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                                }
                                            }}
                                            aria-label="Select Room"
                                            placeholder="Search room..."
                                            isDisabled={!selectedFloorId}
                                            selectedKey={selectedRoomId}
                                            onSelectionChange={(key: React.Key | null) => setSelectedRoomId(key as string)}
                                            variant="bordered"
                                            listboxProps={{
                                                itemClasses: {
                                                    base: "rounded-lg data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-600 px-3 py-2 my-1 gap-3",
                                                }
                                            }}
                                            popoverProps={{
                                                classNames: {
                                                    content: "rounded-xl border border-slate-100 shadow-2xl min-w-[200px]"
                                                }
                                            }}
                                        >
                                            {rooms.map(r => (
                                                <AutocompleteItem key={r.RoomID.toString()} textValue={r.RoomCode || r.RoomName || `Room ${r.RoomID}`}>
                                                    <div className="flex gap-3 items-center">
                                                        <div className="p-2 rounded-lg bg-slate-100 text-slate-500 group-data-[hover=true]:bg-white group-data-[hover=true]:text-indigo-500 transition-colors">
                                                            <Armchair size={18} />
                                                        </div>
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="font-bold text-slate-800 text-sm group-data-[hover=true]:text-indigo-700">{r.RoomCode || r.RoomName || `Room ${r.RoomID}`}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono group-data-[hover=true]:text-indigo-400">Capacity: {r.Capacity}</span>
                                                        </div>
                                                    </div>
                                                </AutocompleteItem>
                                            ))}
                                        </Autocomplete>
                                    </div>
                                </div>
                            </div>

                            <Divider className="opacity-50" />

                            {/* 2. Grid Dimensions */}
                            {selectedRoomId ? (
                                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">2</div>
                                            <h4 className="text-sm font-bold text-slate-700">Grid Dimensions</h4>
                                        </div>
                                        {isDirty && <Chip size="sm" color="warning" variant="flat" className="text-[10px] font-bold h-6">Unsaved Changes</Chip>}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label htmlFor="config-rows" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Columns (A, B...)</label>
                                                <Input
                                                    id="config-rows"
                                                    name="config-rows"
                                                    type="number"
                                                    placeholder="0"
                                                    min={1}
                                                    value={config.rows.toString()}
                                                    onValueChange={(v) => setConfig({ ...config, rows: Number(v) })}
                                                    classNames={{
                                                        inputWrapper: "h-12 bg-white border-1 border-slate-200 hover:border-blue-400 focus-within:border-blue-600 rounded-xl shadow-sm transition-all",
                                                        input: "text-lg font-bold text-slate-800 text-center bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                                                    }}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label htmlFor="config-benches" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Benches / Column</label>
                                                <Input
                                                    id="config-benches"
                                                    name="config-benches"
                                                    type="number"
                                                    placeholder="0"
                                                    min={1}
                                                    value={config.benchesPerRow.toString()}
                                                    onValueChange={(v) => setConfig({ ...config, benchesPerRow: Number(v) })}
                                                    classNames={{
                                                        inputWrapper: "h-12 bg-white border-1 border-slate-200 hover:border-blue-400 focus-within:border-blue-600 rounded-xl shadow-sm transition-all",
                                                        input: "text-lg font-bold text-slate-800 text-center bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="config-seats" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Seats Per Bench</label>
                                            <div className="relative">
                                                <Input
                                                    id="config-seats"
                                                    name="config-seats"
                                                    type="number"
                                                    placeholder="0"
                                                    min={1}
                                                    value={config.seatsPerBench.toString()}
                                                    onValueChange={(v) => setConfig({ ...config, seatsPerBench: Number(v) })}
                                                    classNames={{
                                                        inputWrapper: "h-12 bg-white border-1 border-slate-200 hover:border-blue-400 focus-within:border-blue-600 rounded-xl shadow-sm transition-all pl-12",
                                                        input: "text-lg font-bold text-slate-800 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                                                    }}
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                    <Hash size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary Card */}
                                    <div className={`mt-2 p-4 rounded-2xl border flex items-center justify-between group cursor-default transition-colors ${totalSeats > (rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0) ? 'bg-red-50 border-red-200' : 'bg-gradient-to-br from-slate-50 to-indigo-50/30 border-slate-200/60'}`}>
                                        <div className="flex flex-col">
                                            <span className={`text-xs font-bold uppercase tracking-widest ${totalSeats > (rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0) ? 'text-red-500' : 'text-slate-500'}`}>Calculated Capacity</span>
                                            <span className={`text-[10px] font-medium ${totalSeats > (rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0) ? 'text-red-400' : 'text-slate-400'}`}>
                                                Max Allowed: {rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-3xl font-black transition-transform group-hover:scale-110 ${totalSeats > (rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0) ? 'text-red-600' : 'text-indigo-600'}`}>{totalSeats}</span>
                                            <span className={`text-xs font-bold uppercase ${totalSeats > (rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0) ? 'text-red-400' : 'text-indigo-400'}`}>Seats</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {!readOnly && (
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <Button
                                                variant="flat"
                                                color="danger"
                                                isDisabled={!isDirty || loading}
                                                onPress={handleReset}
                                                startContent={<RotateCcw size={16} />}
                                                className="h-12 font-semibold rounded-xl"
                                            >
                                                Reset
                                            </Button>
                                            <Button
                                                color="primary"
                                                isLoading={loading}
                                                isDisabled={!isDirty || totalSeats === 0}
                                                onPress={handleSave}
                                                startContent={<Save size={18} />}
                                                className="h-12 font-bold shadow-lg shadow-indigo-500/20 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:to-indigo-600"
                                            >
                                                Save Layout
                                            </Button>
                                        </div>
                                    )}

                                    {/* Warning */}
                                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-3">
                                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                                        <p className="text-[11px] text-amber-800/80 leading-relaxed font-medium">
                                            <strong>Caution:</strong> Saving changes will regenerate all seat numbers (e.g., A1-L, A1-R). Active exam allocations may be lost.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center text-center gap-4 text-slate-400 opacity-60">
                                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Layout size={24} />
                                    </div>
                                    <p className="text-sm font-medium">Please select a room above to<br />begin configuration.</p>
                                </div>
                            )}

                        </CardBody>
                    </Card>
                </div>

                {/* Right Panel: Preview (Redesigned) */}
                <div
                    ref={containerRef}
                    className={`${isFullScreen ? 'fixed inset-0 z-[100] rounded-none h-screen w-screen' : 'flex-1 min-h-[800px] rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5'} flex flex-col bg-[#0B0F19] relative transition-all duration-500`}
                >
                    {/* Background Grid Effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.2)_1px,transparent_1px)] bg-[length:40px_40px] pointer-events-none" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />

                    {/* Preview Navbar */}
                    <div className="relative z-20 flex justify-between items-center p-6 border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                            <div>
                                <h3 className="text-white font-bold tracking-tight text-sm">Live Simulation</h3>
                                <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
                                    {selectedRoomId ? `Monitoring: Room ${rooms.find(r => r.RoomID === Number(selectedRoomId))?.RoomCode || 'Unknown'}` : 'Offline'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Full Screen Toggle */}
                            <Tooltip content={isFullScreen ? "Exit Full Screen (Esc)" : "Enter Full Screen"} closeDelay={0}>
                                <button
                                    onClick={toggleFullScreen}
                                    className="p-2 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all outline-none focus:ring-2 focus:ring-indigo-500/50"
                                >
                                    {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                            </Tooltip>

                            {/* Legend */}
                            <div className="bg-slate-800/50 rounded-full px-4 py-1.5 border border-slate-700/50 flex gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-slate-700 rounded-sm border border-slate-600" />
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Desk</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-indigo-500/20 rounded-sm border border-indigo-500/50" />
                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seat</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Canvas Area */}
                    <div className="flex-1 relative flex flex-col z-10 p-12 overflow-x-auto custom-scrollbar">
                        <div className="w-full h-full flex flex-col min-w-min">

                            {/* Teacher's Desk & Front Indicator */}
                            <div className="mb-16 flex flex-col items-center gap-4 shrink-0 mx-auto">
                                <div className="w-64 h-16 rounded-2xl bg-gradient-to-b from-[#1E293B] to-[#0F172A] border border-white/10 shadow-2xl flex items-center justify-center relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Teacher's Desk</span>
                                </div>
                                <div className="flex items-center gap-3 opacity-40">
                                    <ChevronRight className="rotate-90 text-slate-500" size={14} />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Front of Room</span>
                                    <ChevronRight className="rotate-90 text-slate-500" size={14} />
                                </div>
                            </div>

                            {/* Seating Grid */}
                            {!selectedRoomId || totalSeats === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-6 mx-auto">
                                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                                        <Grid3X3 size={64} className="text-slate-400" strokeWidth={1} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">No Layout Configured</p>
                                </div>
                            ) : (
                                <div className="flex flex-row gap-12 items-start mx-auto pb-24">
                                    {/* Render COLUMNS (Based on config.rows which generates A, B, C...) */}
                                    {Array.from({ length: config.rows }).map((_, colIndex) => {
                                        const colLabel = String.fromCharCode(65 + colIndex); // A, B, C...

                                        return (
                                            <div key={colIndex} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${colIndex * 100}ms` }}>

                                                {/* Column Container */}
                                                <div className="relative p-2 pb-6 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02]">
                                                    {/* Column Label */}
                                                    <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center text-xs font-bold text-slate-500 shadow-xl">
                                                        {colLabel}
                                                    </div>

                                                    <div className="flex flex-col gap-4 px-2">
                                                        {/* Render BENCHES Vertically (Based on config.benchesPerRow) */}
                                                        {Array.from({ length: config.benchesPerRow }).map((_, benchIndex) => (
                                                            <div key={benchIndex} className="relative group/bench">
                                                                {/* Bench Shape */}
                                                                <div className="bg-[#1E293B] border border-white/5 rounded-2xl p-2.5 shadow-lg group-hover/bench:border-indigo-500/30 group-hover/bench:shadow-indigo-500/10 transition-all duration-300">
                                                                    {/* Desk Surface Visual */}
                                                                    <div className="h-1.5 w-full bg-[#334155] rounded-full mb-2 opacity-50" />

                                                                    <div className="flex gap-2.5">
                                                                        {/* Seats */}
                                                                        {Array.from({ length: config.seatsPerBench }).map((_, seatIndex) => {
                                                                            // Calculate continuous seat number for this column
                                                                            // Previous benches in this column * seats per bench + current seat index + 1
                                                                            const seatNum = (benchIndex * config.seatsPerBench) + seatIndex + 1;
                                                                            const seatCode = `${colLabel}${seatNum}`;

                                                                            return (
                                                                                <Tooltip key={seatIndex} content={`Seat ${seatCode}`} closeDelay={0}>
                                                                                    <div className="w-10 h-10 rounded-lg bg-[#0F172A] border border-indigo-500/20 flex items-center justify-center hover:bg-indigo-600 hover:border-indigo-500 hover:scale-110 cursor-pointer transition-all group/seat shadow-inner relative overflow-hidden">
                                                                                        <span className="text-[10px] font-bold font-mono text-indigo-400 group-hover/seat:text-white transition-colors relative z-10">
                                                                                            {seatCode}
                                                                                        </span>
                                                                                        {/* Glow effect */}
                                                                                        <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover/seat:opacity-100 transition-opacity" />
                                                                                    </div>
                                                                                </Tooltip>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Bottom Column Label */}
                                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center text-xs font-bold text-slate-500 shadow-xl">
                                                        {colLabel}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};
