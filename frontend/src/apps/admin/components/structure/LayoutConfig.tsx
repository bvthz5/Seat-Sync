import React, { useState, useEffect } from 'react';
import { Autocomplete, AutocompleteItem, Input, Button, Card, CardBody, CardHeader, Divider, Tooltip, Chip } from '@heroui/react';
import { Armchair, Save, RotateCcw, MonitorPlay, AlertTriangle, Grid3X3, Building2, Layers, Layout, MapPin, ChevronRight, Hash } from 'lucide-react';
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

    // --- Loading Effects ---

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
        <div className="flex flex-col gap-6 h-full pb-8">
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

            <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[700px]">
                {/* Left Panel: Configuration */}
                <div className="w-full xl:w-[400px] flex flex-col gap-6 shrink-0">
                    <Card className="border border-slate-200 shadow-lg bg-white/90 backdrop-blur-xl h-full">
                        <CardHeader className="flex gap-3 bg-slate-50/80 border-b border-slate-100 p-6">
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
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Building2 size={12} /> Building Block
                                        </label>
                                        <Autocomplete
                                            aria-label="Select Building Block"
                                            placeholder="Search building..."
                                            selectedKey={selectedBlockId}
                                            onSelectionChange={(key: React.Key | null) => setSelectedBlockId(key as string)}
                                            variant="bordered"
                                            inputProps={{
                                                classNames: {
                                                    inputWrapper: "h-14 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl transition-all pl-4",
                                                    input: "text-slate-800 font-bold text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                                }
                                            }}
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
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Layers size={12} /> Floor
                                        </label>
                                        <Autocomplete
                                            aria-label="Select Floor"
                                            placeholder="Search floor..."
                                            isDisabled={!selectedBlockId}
                                            selectedKey={selectedFloorId}
                                            onSelectionChange={(key: React.Key | null) => setSelectedFloorId(key as string)}
                                            variant="bordered"
                                            inputProps={{
                                                classNames: {
                                                    inputWrapper: "h-14 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl transition-all pl-4",
                                                    input: "text-slate-800 font-bold text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                                }
                                            }}
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
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Armchair size={12} /> Room
                                        </label>
                                        <Autocomplete
                                            aria-label="Select Room"
                                            placeholder="Search room..."
                                            isDisabled={!selectedFloorId}
                                            selectedKey={selectedRoomId}
                                            onSelectionChange={(key: React.Key | null) => setSelectedRoomId(key as string)}
                                            variant="bordered"
                                            inputProps={{
                                                classNames: {
                                                    inputWrapper: `h-14 rounded-xl transition-all pl-4 border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 ${selectedRoomId ? 'bg-blue-50 border-blue-200' : 'bg-white'}`,
                                                    input: "text-slate-800 font-bold text-sm bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                                }
                                            }}
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
                                                <label htmlFor="config-rows" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Rows</label>
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
                                                <label htmlFor="config-benches" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Cols / Row</label>
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
                                    <div className="mt-2 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between group cursor-default">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Calculated Capacity</span>
                                            <span className="text-[10px] text-slate-400 font-medium">Auto-updated based on grid</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-indigo-600 group-hover:scale-110 transition-transform">{totalSeats}</span>
                                            <span className="text-xs font-bold text-indigo-400 uppercase">Seats</span>
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

                {/* Right Panel: Preview */}
                <div className="flex-1 h-full min-h-[600px] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/10 border border-slate-200 bg-slate-900 ring-1 ring-slate-900/5">
                    {/* Preview Navbar */}
                    <div className="bg-slate-900/90 backdrop-blur-md p-4 px-6 flex justify-between items-center border-b border-slate-800/50 sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <div className="relative flex h-3 w-3">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${selectedRoomId ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${selectedRoomId ? 'bg-emerald-500' : 'bg-slate-600'}`}></span>
                            </div>
                            <div>
                                <span className="text-white font-bold tracking-wide text-sm block leading-none">Live Simulation</span>
                                <span className="text-[10px] text-slate-500 font-mono mt-1 block tracking-wider uppercase">
                                    {selectedRoomId ? `Monitoring: Room ${selectedRoomId}` : 'Standby Mode'}
                                </span>
                            </div>
                        </div>

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

                    {/* Canvas */}
                    <div className="flex-1 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] relative overflow-hidden flex flex-col">
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-900/95 to-[#0B0F19]" />

                        <div className="relative z-10 flex-1 overflow-auto p-12 custom-scrollbar flex flex-col items-center">
                            {/* Front of Room Indicator */}
                            <div className="w-full max-w-2xl flex flex-col items-center mb-16 relative shrink-0">
                                <div className="w-48 h-12 bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg border border-slate-700/50 shadow-xl flex items-center justify-center mb-2 relative group cursor-help">
                                    <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Teacher's Desk</span>
                                    <div className="absolute -bottom-1 w-24 h-1 bg-slate-800/50 blur-sm rounded-full" />
                                </div>
                                <div className="flex items-center gap-2 opacity-30 text-slate-500">
                                    <ChevronRight size={14} className="rotate-90" />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Front of Room</span>
                                    <ChevronRight size={14} className="rotate-90" />
                                </div>
                            </div>

                            {!selectedRoomId || totalSeats === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-slate-700 gap-6 opacity-30 animate-pulse">
                                    <Grid3X3 size={80} strokeWidth={0.5} />
                                    <p className="text-sm font-bold tracking-widest uppercase">Grid System Offline</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-8 items-center justify-start pb-24 w-full">
                                    {/* Render Rows */}
                                    {Array.from({ length: config.rows }).map((_, rIndex) => {
                                        const rowLabel = String.fromCharCode(65 + rIndex);
                                        return (
                                            <div key={rIndex} className="flex gap-4 md:gap-8 items-center animate-in zoom-in slide-in-from-bottom-4 duration-500 fill-mode-backwards w-full justify-center group/row" style={{ animationDelay: `${rIndex * 50}ms` }}>

                                                {/* Row Label (Left) */}
                                                <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/30 shadow-lg shrink-0 group-hover/row:bg-indigo-500/10 group-hover/row:border-indigo-500/30 transition-all">
                                                    <span className="text-slate-500 text-xs font-bold font-mono group-hover/row:text-indigo-400">{rowLabel}</span>
                                                </div>

                                                {/* Benches in Row */}
                                                <div className="flex gap-4 md:gap-8 px-6 py-4 bg-slate-800/20 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-slate-800/40 transition-all duration-300 backdrop-blur-sm shadow-md">
                                                    {Array.from({ length: config.benchesPerRow }).map((_, bIndex) => (
                                                        <div key={bIndex} className="flex flex-col gap-2 items-center">
                                                            {/* Desk Surface */}
                                                            <div className="w-full h-1.5 bg-slate-700/80 rounded-full mb-1 shadow-sm" />

                                                            <div className="flex gap-2 p-1.5 bg-slate-900/40 rounded-xl shadow-inner border border-white/5">
                                                                {/* Seats in Bench */}
                                                                {Array.from({ length: config.seatsPerBench }).map((_, sIndex) => {
                                                                    const seatNumber = sIndex + 1;
                                                                    const fullSeatCode = `${rowLabel}${seatNumber}`;
                                                                    return (
                                                                        <Tooltip key={sIndex} content={`Row ${rowLabel} - Seat ${seatNumber}`} size="sm" color="foreground" delay={0} closeDelay={0}>
                                                                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center hover:bg-indigo-600 hover:text-white hover:border-indigo-500 hover:scale-110 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all cursor-pointer group/seat relative select-none">
                                                                                <span className="text-[10px] md:text-xs font-bold font-mono text-indigo-400 group-hover/seat:text-white transition-colors">
                                                                                    {fullSeatCode}
                                                                                </span>
                                                                                {/* Status Dot */}
                                                                                <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-indigo-500/30 group-hover/seat:bg-white/50" />
                                                                            </div>
                                                                        </Tooltip>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Row Label (Right) */}
                                                <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700/30 shadow-lg shrink-0 opacity-50 group-hover/row:opacity-100 transition-opacity">
                                                    <span className="text-slate-500 text-xs font-bold font-mono">{rowLabel}</span>
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
        </div>
    );
};
