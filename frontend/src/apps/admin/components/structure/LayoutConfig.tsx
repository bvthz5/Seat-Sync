import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Autocomplete, AutocompleteItem, Input, Button, Card, CardBody, CardHeader, Divider, Tooltip, Chip, Switch, Select, SelectItem, Badge, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Trash2, MousePointer2, CheckCircle2, RotateCcw, Save, Layers, Building, Building2, Armchair, Layout, Check, X, Shield, Plus, Grid3X3, Spline, ArrowRight, ArrowLeft, MonitorPlay, AlertTriangle, MapPin, ChevronRight, Hash, Maximize2, Minimize2, Eye, Ban, Minus, DoorOpen, Box, Grid } from 'lucide-react';
import { structureService } from '../../services/structureService';
import { Block, Floor, Room, Zone } from '../../types/collegeStructure';
import { toast } from '../../../../utils/toast';

interface LayoutConfigProps {
    readOnly?: boolean;
}

type RoomType = 'ROOM' | 'HALL';
type ViewMode = 'PHYSICAL' | 'LOGICAL' | 'DISABLE';

interface SeatConfig {
    id: string;
    colIndex: number;
    colLabel: string;
    benchIndex: number;
    seatIndex: number;
    isActive: boolean;
    logicalRow: number;
    zoneId?: number;
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
        rowLayout: [] as number[],
        seatsPerBench: 1,
        roomType: 'ROOM' as RoomType
    });

    const [viewMode, setViewMode] = useState<ViewMode>('PHYSICAL');
    const [showZoneModal, setShowZoneModal] = useState(false);
    const [selectedZoneCount, setSelectedZoneCount] = useState(4);
    const [disabledSeatIds, setDisabledSeatIds] = useState<Set<string>>(new Set());

    // Zone Management State
    const [zones, setZones] = useState<Zone[]>([]);
    const [seatZoneMap, setSeatZoneMap] = useState<Map<string, number>>(new Map());
    const [seatIdMap, setSeatIdMap] = useState<Map<string, number>>(new Map());
    // Cleaned up manual zone states

    const [isSaved, setIsSaved] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialConfig, setInitialConfig] = useState<any>(null);
    const [initialSeatZoneMap, setInitialSeatZoneMap] = useState<Map<string, number> | null>(null);
    const [initialDisabledSeatIds, setInitialDisabledSeatIds] = useState<Set<string>>(new Set());
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

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
                containerRef.current.requestFullscreen().catch((err) => console.warn(err));
            }
        } else {
            setIsFullScreen(false);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch((err) => console.warn(err));
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

    useEffect(() => {
        const fetchRoomDetails = async () => {
            if (selectedRoomId) {
                try {
                    setLoading(true);

                    const data = await structureService.getRoomLayout(Number(selectedRoomId));
                    const room = data.room;

                    let parsedRowLayout = (room as any).RowLayout;
                    if (typeof parsedRowLayout === 'string') {
                        try { parsedRowLayout = JSON.parse(parsedRowLayout); } catch (e) { parsedRowLayout = []; }
                    }
                    if (!Array.isArray(parsedRowLayout)) {
                        if (room.TotalRows && room.BenchesPerRow) {
                            parsedRowLayout = Array(room.TotalRows).fill(room.BenchesPerRow);
                        } else {
                            parsedRowLayout = [];
                        }
                    }

                    const newConfig = {
                        rowLayout: parsedRowLayout,
                        seatsPerBench: room.SeatsPerBench || 2,
                        roomType: (room.RoomType || 'ROOM') as RoomType
                    };
                    setConfig(newConfig);
                    setInitialConfig(newConfig);

                    const newDisabledSet = new Set<string>();
                    const newZoneMap = new Map<string, number>();
                    const newSeatIdMap = new Map<string, number>();

                    if (data.seats) {
                        data.seats.forEach((s: any) => {
                            const rowLabel = s.RowLabel ? s.RowLabel.trim() : '';
                            const seatId = `${rowLabel}-${s.BenchNumber}-${s.SeatNumber}`;
                            newSeatIdMap.set(seatId, s.SeatID);
                            if (s.IsActive === false) newDisabledSet.add(seatId);
                            if (s.ZoneID) {
                                newZoneMap.set(seatId, Number(s.ZoneID));
                            }
                        });
                    }

                    setDisabledSeatIds(newDisabledSet);
                    setInitialDisabledSeatIds(new Set(newDisabledSet)); // baseline for dirty check
                    setSeatZoneMap(newZoneMap);
                    setInitialSeatZoneMap(newZoneMap);
                    setSeatIdMap(newSeatIdMap);
                    setZones(data.zones || []);

                } catch (error) {
                    toast.error("Failed to load room layout");
                } finally {
                    setLoading(false);
                }
            } else {
                setConfig({ rowLayout: [], seatsPerBench: 2, roomType: 'ROOM' });
                setInitialConfig(null);
                setInitialSeatZoneMap(null);
                setDisabledSeatIds(new Set());
                setSeatZoneMap(new Map());
                setZones([]);
            }
        };

        fetchRoomDetails();
    }, [selectedRoomId]);

    const loadBlocks = async () => {
        try {
            const response: any = await structureService.getBlocks({ limit: 100 });
            const data = response.data || response;
            if (Array.isArray(data)) {
                setBlocks(data);
                if (data.length > 0 && !selectedBlockId) setSelectedBlockId(data[0].BlockID.toString());
            } else setBlocks([]);
        } catch (error) {
            toast.error("Failed to load building blocks");
        }
    };

    const loadFloors = async (blockId: number) => {
        try {
            const response: any = await structureService.getFloors({ blockId, limit: 100 });
            setFloors(Array.isArray(response.data || response) ? (response.data || response) : []);
        } catch (error) { }
    };

    const loadRooms = async (blockId: number, floorId: number) => {
        try {
            const response: any = await structureService.getRooms({ blockId, floorId });
            setRooms(Array.isArray(response) ? response : (response.data || []));
        } catch (error) { }
    };

    const generatedSeats = useMemo(() => {
        const seats: SeatConfig[] = [];
        if (!selectedRoomId || !config.rowLayout.length) return seats;

        config.rowLayout.forEach((benches, r) => {
            const colLabel = String.fromCharCode(65 + r);

            for (let b = 0; b < benches; b++) {
                for (let s = 1; s <= config.seatsPerBench; s++) {
                    const seatId = `${colLabel}-${b + 1}-${s}`;
                    const isActive = !disabledSeatIds.has(seatId);
                    const zoneId = seatZoneMap.get(seatId);

                    const logicalRow = b + 1;

                    seats.push({
                        id: seatId,
                        colIndex: r,
                        colLabel,
                        benchIndex: b,
                        seatIndex: s,
                        isActive,
                        logicalRow,
                        zoneId
                    });
                }
            }
        });
        return seats;
    }, [config, disabledSeatIds, selectedRoomId, seatZoneMap]);

    const activeSeatCount = generatedSeats.filter(s => s.isActive).length;
    const capacityCount = config.rowLayout.reduce((acc, curr) => acc + (curr * config.seatsPerBench), 0);

    const toggleSeat = (seatId: string) => {
        if (readOnly) return;



        if (viewMode === 'DISABLE') {
            const newSet = new Set(disabledSeatIds);
            if (newSet.has(seatId)) {
                newSet.delete(seatId);
            } else {
                newSet.add(seatId);
                const newMap = new Map(seatZoneMap);
                newMap.delete(seatId);
                setSeatZoneMap(newMap);
            }
            setDisabledSeatIds(newSet);
            return;
        }
    };

    const handleAddRow = () => {

        const lastBenchCount = config.rowLayout.length > 0 ? config.rowLayout[config.rowLayout.length - 1] : 5;
        setConfig({ ...config, rowLayout: [...config.rowLayout, lastBenchCount] });
    };

    const handleRemoveRow = (index: number) => {
        setIsSaved(false);
        const newLayout = [...config.rowLayout];
        newLayout.splice(index, 1);
        setConfig({ ...config, rowLayout: newLayout });
    };

    const handleBenchCountChange = (index: number, value: number) => {
        const newLayout = [...config.rowLayout];
        newLayout[index] = value;
        setConfig({ ...config, rowLayout: newLayout });
    };

    const handleAutoZone = async () => {
        if (!selectedRoomId) return;
        try {
            setLoading(true);
            await structureService.autoZoneRoom(Number(selectedRoomId), selectedZoneCount);
            toast.success("Room auto-zoned successfully");
            setShowZoneModal(false);

            // Refresh logic - unmount and remount room
            const currentId = selectedRoomId;
            setSelectedRoomId("");
            setTimeout(() => setSelectedRoomId(currentId), 50);

        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to auto-zone room");
        } finally {
            setLoading(false);
        }
    };




    /**
     * autoSaveSeatStates — called by the debounce effect.
     * NEVER calls updateRoomLayout (never blocked by exam allocations).
     * Only persists seat enable/disable and zone assignments.
     */
    const autoSaveSeatStates = async () => {
        if (!selectedRoomId || seatIdMap.size === 0) return;

        // Internal guard: skip if nothing actually changed from saved baseline
        const disabledChanged = disabledSeatIds.size !== initialDisabledSeatIds.size ||
            [...disabledSeatIds].some(id => !initialDisabledSeatIds.has(id));
        const zonesChanged = seatZoneMap.size !== (initialSeatZoneMap?.size ?? 0) ||
            [...seatZoneMap.entries()].some(([k, v]) => initialSeatZoneMap?.get(k) !== v);
        if (!disabledChanged && !zonesChanged) return;

        try {
            const updates: any[] = [];
            config.rowLayout.forEach((benches, r) => {
                const colLabel = String.fromCharCode(65 + r);
                for (let b = 0; b < benches; b++) {
                    for (let s = 1; s <= config.seatsPerBench; s++) {
                        const seatId = `${colLabel}-${b + 1}-${s}`;
                        const dbSeatId = seatIdMap.get(seatId);
                        if (dbSeatId) {
                            updates.push({
                                SeatID: dbSeatId,
                                IsActive: !disabledSeatIds.has(seatId),
                                ZoneID: seatZoneMap.get(seatId) || null,
                            });
                        }
                    }
                }
            });
            if (updates.length > 0) {
                await structureService.updateSeatZones(Number(selectedRoomId), updates);
                setInitialDisabledSeatIds(new Set(disabledSeatIds));
                setInitialSeatZoneMap(new Map(seatZoneMap));
                setIsSaved(true);

                // Dispatch event for auto-refresh on Seating Plans
                window.dispatchEvent(new Event('ROOM_LAYOUT_UPDATED'));
                try {
                    const channel = new BroadcastChannel('seating_sync');
                    channel.postMessage({ type: 'ROOM_LAYOUT_UPDATED', roomId: selectedRoomId });
                } catch (e) { }
            }
        } catch (error: any) {
            console.warn('[auto-save] failed:', error?.response?.data?.message || error?.message);
        }
    };

    /**
     * handleSave — called by the explicit Save button.
     * Saves BOTH structural layout (updateRoomLayout) AND seat states.
     * May return 400 if room has future exam allocations AND layout changed.
     */
    const handleSave = async () => {
        if (!selectedRoomId) return;

        const layoutChanged = initialConfig &&
            (JSON.stringify(config.rowLayout) !== JSON.stringify(initialConfig.rowLayout) ||
                config.seatsPerBench !== initialConfig.seatsPerBench);

        setLoading(true);
        try {
            if (layoutChanged) {
                await structureService.updateRoomLayout(Number(selectedRoomId), {
                    RowLayout: config.rowLayout,
                    SeatsPerBench: config.seatsPerBench,
                    TotalRows: config.rowLayout.length,
                    BenchesPerRow: config.rowLayout.length > 0 ? config.rowLayout[0] : 0,
                } as any);
            }

            // Persist seat states
            const updates: any[] = [];
            config.rowLayout.forEach((benches, r) => {
                const colLabel = String.fromCharCode(65 + r);
                for (let b = 0; b < benches; b++) {
                    for (let s = 1; s <= config.seatsPerBench; s++) {
                        const seatId = `${colLabel}-${b + 1}-${s}`;
                        const dbSeatId = seatIdMap.get(seatId);
                        if (dbSeatId) {
                            updates.push({
                                SeatID: dbSeatId,
                                IsActive: !disabledSeatIds.has(seatId),
                                ZoneID: seatZoneMap.get(seatId) || null,
                            });
                        }
                    }
                }
            });
            if (updates.length > 0) {
                await structureService.updateSeatZones(Number(selectedRoomId), updates);
            }

            toast.success('Layout saved successfully');
            
            window.dispatchEvent(new Event('ROOM_LAYOUT_UPDATED'));
            try {
                const channel = new BroadcastChannel('seating_sync');
                channel.postMessage({ type: 'ROOM_LAYOUT_UPDATED', roomId: selectedRoomId });
            } catch (e) { }

            setIsSaved(true);
            setInitialConfig(config);
            setInitialDisabledSeatIds(new Set(disabledSeatIds));

            const data = await structureService.getRoomLayout(Number(selectedRoomId));
            const newSeatIdMap = new Map<string, number>();
            const currentZoneMap = new Map<string, number>();
            if (data.seats) {
                data.seats.forEach((s: any) => {
                    const rowLabel = s.RowLabel ? s.RowLabel.trim() : '';
                    const seatId = `${rowLabel}-${s.BenchNumber}-${s.SeatNumber}`;
                    newSeatIdMap.set(seatId, s.SeatID);
                    if (s.ZoneID) currentZoneMap.set(seatId, s.ZoneID);
                });
            }
            setSeatIdMap(newSeatIdMap);

            if (layoutChanged) {
                setSeatZoneMap(new Map());
                setInitialSeatZoneMap(new Map());
                setDisabledSeatIds(new Set());
            } else {
                setSeatZoneMap(currentZoneMap);
                setInitialSeatZoneMap(currentZoneMap);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to save layout');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (initialConfig) {
            setConfig(initialConfig);
            setDisabledSeatIds(new Set(initialDisabledSeatIds));
            if (initialSeatZoneMap) setSeatZoneMap(new Map(initialSeatZoneMap));
            toast.success("Layout reset to saved state");
        }
    };

    const isDirty = useMemo(() => {
        if (!initialConfig) return false;
        if (JSON.stringify(config.rowLayout) !== JSON.stringify(initialConfig.rowLayout) ||
            config.seatsPerBench !== initialConfig.seatsPerBench) return true;
        if (disabledSeatIds.size !== initialDisabledSeatIds.size) return true;
        for (const id of disabledSeatIds) {
            if (!initialDisabledSeatIds.has(id)) return true;
        }
        if (!initialSeatZoneMap) return seatZoneMap.size > 0;
        if (seatZoneMap.size !== initialSeatZoneMap.size) return true;
        for (const [key, val] of seatZoneMap) {
            if (initialSeatZoneMap.get(key) !== val) return true;
        }
        return false;
    }, [config, initialConfig, disabledSeatIds, initialDisabledSeatIds, seatZoneMap, initialSeatZoneMap]);

    // ── Auto-save: watches ONLY seat state, never layout dims ──
    // Depends directly on the state values — no computed memo needed.
    // autoSaveSeatStates has its own guard to skip if nothing really changed.
    useEffect(() => {
        if (!selectedRoomId || seatIdMap.size === 0) return;
        const timer = setTimeout(() => { autoSaveSeatStates(); }, 1000);
        return () => clearTimeout(timer);
    }, [disabledSeatIds, seatZoneMap, selectedRoomId]);


    return (
        <div className="flex flex-col gap-8 pb-12 relative">
            <Modal isOpen={showZoneModal} onClose={() => setShowZoneModal(false)} size="sm" classNames={{ backdrop: "bg-slate-900/50 backdrop-blur-sm", base: "bg-white border border-slate-200 shadow-2xl" }}>
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 text-slate-800">Auto-Zone Room</ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-slate-500 mb-2">Evenly divide the room into zones column-by-column.</p>
                        <Input name="custom-input" type="number" label="Number of Zones" labelPlacement="outside" min={2} max={6} value={selectedZoneCount.toString()} onValueChange={(val) => setSelectedZoneCount(Number(val))} classNames={{ inputWrapper: "bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm" }} />
                    </ModalBody>
                    <ModalFooter>
                        <Button color="danger" variant="light" onPress={() => setShowZoneModal(false)}>Cancel</Button>
                        <Button color="primary" onPress={handleAutoZone} isLoading={loading}>Execute</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div className="flex items-center gap-5 z-10 w-full">
                    <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                        <Layout size={24} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Room Layout Designer</h3>
                        <p className="text-slate-500 font-medium">Configure manual room entry and 3D visual mapping</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 items-start relative">
                <div className="w-full xl:w-[400px] shrink-0 xl:sticky xl:top-[140px] transition-all z-10">
                    <Card className="border border-slate-200 shadow-xl shadow-slate-200/50 bg-white/95 backdrop-blur-xl">
                        <CardHeader className="flex gap-3 bg-slate-50/50 border-b border-slate-100 p-6">
                            <div className="p-2 bg-white rounded-lg border border-slate-200 text-indigo-600">
                                <MonitorPlay size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Layout Builder</h3>
                                <p className="text-xs text-slate-500 font-medium">Manual row & bench entry</p>
                            </div>
                        </CardHeader>

                        <CardBody className="p-6 flex flex-col gap-8">
                            <div className="space-y-5">
                                <div className="flex flex-col gap-2">
                                    <div className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                                        <Building size={16} className="text-indigo-500" /> Building Block
                                    </div>
                                    <Autocomplete id="select-block" aria-label="Building Block" placeholder="Select a block..." size="md" variant="bordered" selectedKey={selectedBlockId} onSelectionChange={(k) => setSelectedBlockId(k as string)} popoverProps={{ classNames: { content: "bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" } }} inputProps={{ classNames: { inputWrapper: "bg-white hover:bg-slate-50 transition-colors shadow-sm" } }}>
                                        {blocks.map(b => <AutocompleteItem key={b.BlockID} textValue={b.BlockName} className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">{b.BlockName}</AutocompleteItem>)}
                                    </Autocomplete>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                                            <Layers size={16} className="text-indigo-500" /> Floor
                                        </div>
                                        <Autocomplete id="select-floor" aria-label="Floor" placeholder="Select floor..." isDisabled={!selectedBlockId} size="md" variant="bordered" selectedKey={selectedFloorId} onSelectionChange={(k) => setSelectedFloorId(k as string)} popoverProps={{ classNames: { content: "bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" } }} inputProps={{ classNames: { inputWrapper: "bg-white hover:bg-slate-50 transition-colors shadow-sm" } }}>
                                            {floors.map(f => <AutocompleteItem key={f.FloorID} textValue={`Floor ${f.FloorNumber}`} className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">{`Floor ${f.FloorNumber}`}</AutocompleteItem>)}
                                        </Autocomplete>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                                            <DoorOpen size={16} className="text-indigo-500" /> Room
                                        </div>
                                        <Autocomplete id="select-room" aria-label="Room" placeholder="Select room..." isDisabled={!selectedFloorId} size="md" variant="bordered" selectedKey={selectedRoomId} onSelectionChange={(k) => setSelectedRoomId(k as string)} popoverProps={{ classNames: { content: "bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" } }} inputProps={{ classNames: { inputWrapper: "bg-white hover:bg-slate-50 transition-colors shadow-sm" } }}>
                                            {rooms.map(r => <AutocompleteItem key={r.RoomID} textValue={r.RoomCode || r.RoomName || 'Room'} className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">{r.RoomCode || r.RoomName}</AutocompleteItem>)}
                                        </Autocomplete>
                                    </div>
                                </div>
                            </div>

                            <Divider className="opacity-50" />

                            {selectedRoomId ? (
                                <div className="space-y-6">
                                    {/* Auto Zone removed ZONE_EDIT branch, just showing generic config now */}
                                    <div className="space-y-6">

                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Row Configuration</h4>
                                                <Button size="sm" variant="flat" color="primary" startContent={<Plus size={14} />} onPress={handleAddRow}>Add Row</Button>
                                            </div>
                                            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 max-h-[250px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                                                {config.rowLayout.map((benches, i) => (
                                                    <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
                                                        <div className="w-8 h-8 rounded-md bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                                            {String.fromCharCode(65 + i)}
                                                        </div>
                                                        <div className="flex-1 flex gap-2 items-center">
                                                            <span id={`bench-label-${i}`} className="text-[10px] uppercase font-bold text-slate-500">Benches:</span>
                                                            <Input name="custom-input" aria-labelledby={`bench-label-${i}`} size="sm" type="number" min={1} value={benches.toString()} onValueChange={(val) => handleBenchCountChange(i, Number(val))} classNames={{ inputWrapper: "bg-slate-50 hover:bg-slate-100 transition-colors shadow-none border border-slate-200" }} className="w-20" />
                                                        </div>
                                                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleRemoveRow(i)}><Minus size={14} /></Button>
                                                    </div>
                                                ))}
                                                {config.rowLayout.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No rows defined</p>}
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Benches</span>
                                                <span className="font-mono font-bold text-slate-800">{config.rowLayout.reduce((acc, curr) => acc + curr, 0)}</span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Seats Per Bench</span>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button onClick={() => setConfig({ ...config, seatsPerBench: 1 })} className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${config.seatsPerBench === 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>Single (1)</button>
                                                    <button onClick={() => setConfig({ ...config, seatsPerBench: 2 })} className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${config.seatsPerBench === 2 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>Dual (2)</button>
                                                </div>
                                            </div>
                                            <Divider className="my-1" />
                                            <div className="flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">Final Capacity</span>
                                                    <span className="text-[10px] text-slate-400">Auto-calculated from layout</span>
                                                </div>
                                                <span className="text-2xl font-black text-indigo-600">{capacityCount}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {!readOnly && (
                                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                                            <Button variant="flat" color="danger" isDisabled={!isDirty || loading} onPress={handleReset} startContent={<RotateCcw size={16} />}>Reset</Button>
                                            <Button className={!isSaved ? "animate-pulse" : ""} color={isSaved ? "success" : "primary"} isLoading={loading} isDisabled={!isDirty || capacityCount === 0} onPress={handleSave} startContent={!isSaved ? <Save size={18} /> : null}>{isSaved ? "Saved ✓" : "Save"}</Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-10 text-center opacity-50"><Armchair size={48} className="mx-auto mb-4" /><p className="text-sm font-medium">Select a room</p></div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* VISUAL EDITOR */}
                <div ref={containerRef} className={`${isFullScreen ? 'fixed inset-0 z-[100] h-screen w-screen rounded-none' : 'flex-1 xl:h-[calc(100vh-220px)] xl:min-h-[700px] rounded-3xl border border-indigo-900/40'} flex flex-col relative transition-all overflow-hidden`} style={{ background: 'linear-gradient(145deg, #0f1c3a 0%, #111d3d 40%, #0e1830 70%, #131e3f 100%)' }}>

                    {/* ── Header ── */}
                    <div className="relative z-20 flex justify-between items-center px-6 py-3.5 border-b border-white/8"
                        style={{ background: 'rgba(10,18,50,0.85)', backdropFilter: 'blur(16px)' }}>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className={`w-2.5 h-2.5 rounded-full ${selectedRoomId ? 'bg-emerald-400' : 'bg-slate-600'}`}
                                    style={selectedRoomId ? { boxShadow: '0 0 0 3px rgba(52,211,153,0.18), 0 0 10px rgba(52,211,153,0.55)' } : {}} />
                                {selectedRoomId && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-25" />}
                            </div>
                            <div>
                                <h3 className="text-sm font-black tracking-tight" style={{ background: 'linear-gradient(90deg,#c7d2fe,#a5b4fc,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>3D Visual Map</h3>
                                <p className="text-[10px] font-mono tracking-widest uppercase mt-0.5 text-indigo-400/60">
                                    {selectedRoomId ? `Editing: ${rooms.find(r => r.RoomID === Number(selectedRoomId))?.RoomCode}` : 'No room selected'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/8" style={{ background: 'rgba(99,102,241,0.06)' }}>
                            <Button size="sm" onPress={() => setViewMode('PHYSICAL')} startContent={<Eye size={13}/>}
                                className={viewMode === 'PHYSICAL' ? 'text-white font-bold uppercase text-[10px]' : 'bg-transparent text-indigo-400/70 font-bold uppercase text-[10px] hover:text-indigo-200'}
                                style={viewMode === 'PHYSICAL' ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 14px rgba(99,102,241,0.5)' } : {}}>View</Button>
                            <Button size="sm" onPress={() => setViewMode('DISABLE')} startContent={<Ban size={13}/>}
                                className={viewMode === 'DISABLE' ? 'text-white font-bold uppercase text-[10px]' : 'bg-transparent text-rose-400/70 font-bold uppercase text-[10px] hover:text-rose-300'}
                                style={viewMode === 'DISABLE' ? { background: 'linear-gradient(135deg,#be123c,#9f1239)', boxShadow: '0 0 14px rgba(244,63,94,0.4)' } : {}}>Disable</Button>
                            <Button size="sm" className="bg-transparent text-amber-400/80 font-bold uppercase text-[10px] hover:text-amber-300 hover:bg-amber-400/10" onPress={() => setShowZoneModal(true)} startContent={<Grid3X3 size={13}/>}>Auto-Zone</Button>
                            <div className="w-px h-4 bg-white/10 mx-0.5" />
                            <Tooltip content="Toggle Fullscreen">
                                <Button isIconOnly variant="light" size="sm" className="text-indigo-400/60 hover:text-white" onPress={toggleFullScreen}>
                                    {isFullScreen ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
                                </Button>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-auto p-12" style={{
                        backgroundImage: 'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
                        backgroundSize: '36px 36px',
                    }}>
                        {!selectedRoomId ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <Grid3X3 size={80} className="text-white mb-4" />
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Select Room To Edit</h3>
                            </div>
                        ) : (
                            <div className="min-w-min mx-auto pb-24">
                                {/* ── Blackboard ── */}
                                <div className="flex flex-col items-center mb-10">
                                    <div className="w-full max-w-4xl h-14 rounded-2xl flex items-center justify-center relative overflow-hidden"
                                        style={{
                                            background: 'linear-gradient(180deg,#1a1f3a 0%,#131730 55%,#0f1228 100%)',
                                            border: '1.5px solid rgba(129,140,248,0.25)',
                                            boxShadow: '0 4px 24px rgba(0,0,0,0.45), 0 0 40px rgba(99,102,241,0.05), inset 0 1px 0 rgba(129,140,248,0.12)',
                                        }}>
                                        <div className="absolute top-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)' }} />
                                        <span className="text-[11px] font-black uppercase tracking-[0.4em] select-none" style={{ color: 'rgba(165,180,252,0.5)', textShadow: '0 0 20px rgba(99,102,241,0.2)' }}>✦ Front Blackboard ✦</span>
                                        <div className="absolute bottom-0 left-0 right-0 h-[2.5px]" style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.5),rgba(139,92,246,0.4),transparent)' }} />
                                    </div>
                                    <div className="w-4/5 h-3 -mt-0.5" style={{ background: 'radial-gradient(ellipse,rgba(99,102,241,0.08) 0%,transparent 70%)' }} />
                                </div>

                                {/* Bench Pillars — one pill per column (A, B, C…) */}
                                <div className="flex gap-8 justify-center items-start flex-wrap">
                                    {config.rowLayout.map((benches, r) => {
                                        const colLetter = String.fromCharCode(65 + r);
                                        const colLetterLower = colLetter.toLowerCase();

                                        return (
                                            <div key={r} className="flex flex-col items-center gap-3">
                                                {/* Column header */}
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-xl font-black tracking-[0.3em] select-none"
                                                        style={{ background: 'linear-gradient(180deg,#a5b4fc 0%,#818cf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 0 10px rgba(129,140,248,0.6))' }}>
                                                        {colLetter}
                                                    </span>
                                                    <span className="w-6 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,transparent,#818cf8,transparent)' }} />
                                                </div>

                                                {/* Pill container */}
                                                <div className="relative rounded-[2rem] flex flex-col gap-2.5 transition-all duration-300"
                                                    style={{
                                                        minWidth: '72px',
                                                        padding: '18px 16px',
                                                        background: 'linear-gradient(175deg, rgba(99,102,241,0.12) 0%, rgba(15,28,74,0.7) 100%)',
                                                        border: '1px solid rgba(129,140,248,0.2)',
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                                                        backdropFilter: 'blur(8px)',
                                                    }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(129,140,248,0.5)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.4), 0 0 20px rgba(99,102,241,0.12), inset 0 1px 0 rgba(255,255,255,0.08)'; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(129,140,248,0.2)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'; }}
                                                >
                                                    <div className="absolute top-2.5 left-4 right-4 h-px pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent)' }} />

                                                    {Array.from({ length: benches }).map((_, b) => {
                                                        const benchNum = b + 1;
                                                        const isDual = config.seatsPerBench === 2;

                                                        const makeSeatCell = (seatIndex: number) => {
                                                            const seatId = `${colLetter}-${benchNum}-${seatIndex}`;
                                                            const isActive = !disabledSeatIds.has(seatId);
                                                            const zoneId = seatZoneMap.get(seatId);
                                                            const seatLabel = isDual
                                                                ? `${colLetterLower}${benchNum}${seatIndex === 1 ? 'l' : 'r'}`
                                                                : `${colLetterLower}${benchNum}`;

                                                            const base = isDual
                                                                ? 'w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 text-[10px] font-bold select-none border '
                                                                : 'w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-150 text-[11px] font-bold select-none border ';
                                                            let seatCls = base;
                                                            let seatStyle: React.CSSProperties = {};

                                                            if (!isActive) {
                                                                seatCls += 'opacity-20 cursor-not-allowed ';
                                                                seatStyle = { background: 'repeating-linear-gradient(45deg,#111d3a,#111d3a 3px,#0e1830 3px,#0e1830 6px)', borderColor: 'rgba(255,255,255,0.05)', color: '#334155' };
                                                            } else if (viewMode === 'DISABLE') {
                                                                seatCls += 'hover:scale-110 active:scale-95 ';
                                                                seatStyle = { background: 'linear-gradient(135deg,#3730a3,#4338ca)', borderColor: '#818cf8', color: '#e0e7ff', boxShadow: '0 0 16px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' };
                                                            } else if (viewMode === 'PHYSICAL' && zoneId) {
                                                                const z = zones.find(zn => zn.ZoneID === zoneId);
                                                                const zoneMap: Record<string, React.CSSProperties> = {
                                                                    red:    { background: 'linear-gradient(135deg,#7f1d1d,#991b1b)', borderColor: '#f87171', color: '#fecaca', boxShadow: '0 0 14px rgba(248,113,113,0.35)' },
                                                                    green:  { background: 'linear-gradient(135deg,#14532d,#166534)', borderColor: '#4ade80', color: '#bbf7d0', boxShadow: '0 0 14px rgba(74,222,128,0.35)' },
                                                                    yellow: { background: 'linear-gradient(135deg,#713f12,#854d0e)', borderColor: '#fbbf24', color: '#fef08a', boxShadow: '0 0 14px rgba(251,191,36,0.35)' },
                                                                    purple: { background: 'linear-gradient(135deg,#4a1d96,#5b21b6)', borderColor: '#c084fc', color: '#e9d5ff', boxShadow: '0 0 14px rgba(192,132,252,0.35)' },
                                                                };
                                                                seatStyle = z ? (zoneMap[z.Color?.toLowerCase() ?? ''] ?? { background: 'linear-gradient(135deg,#1e3a8a,#1e40af)', borderColor: '#60a5fa', color: '#bfdbfe', boxShadow: '0 0 12px rgba(96,165,250,0.3)' }) : { background: '#0e1830', borderColor: 'rgba(255,255,255,0.08)', color: '#475569' };
                                                                seatCls += 'hover:scale-105 active:scale-95 ';
                                                            } else {
                                                                seatCls += 'hover:scale-110 active:scale-95 ';
                                                                seatStyle = { background: 'linear-gradient(135deg,rgba(99,102,241,0.18) 0%,rgba(15,28,74,0.85) 100%)', borderColor: 'rgba(129,140,248,0.3)', color: '#a5b4fc', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' };
                                                            }

                                                            return (
                                                                <Tooltip key={seatId} content={`${seatId}${!isActive ? ' · disabled' : ''}`}
                                                                    classNames={{ content: 'bg-slate-900/95 border border-indigo-500/30 text-indigo-200 rounded-lg text-[10px] font-mono px-2 py-1' }}>
                                                                    <div className={seatCls} style={seatStyle} onClick={() => toggleSeat(seatId)}>
                                                                        {isActive
                                                                            ? zoneId
                                                                                ? <span className="font-black text-[9px]">{zones.find(zn => zn.ZoneID === zoneId)?.ZoneCode}</span>
                                                                                : <span className="font-bold tracking-tight">{seatLabel}</span>
                                                                            : <Ban size={11} className="opacity-50" />}
                                                                    </div>
                                                                </Tooltip>
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
