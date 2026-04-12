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
type BenchMode = 'PAIRED' | 'ALTERNATING';
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
        seatsPerBench: 2,
        roomType: 'ROOM' as RoomType,
        benchMode: 'PAIRED' as BenchMode
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

    const [loading, setLoading] = useState(false);
    const [initialConfig, setInitialConfig] = useState<any>(null); 
    const [initialSeatZoneMap, setInitialSeatZoneMap] = useState<Map<string, number> | null>(null);
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
                        try { parsedRowLayout = JSON.parse(parsedRowLayout); } catch(e) { parsedRowLayout = []; }
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
                        roomType: (room.RoomType || 'ROOM') as RoomType,
                        benchMode: (room.BenchMode || 'PAIRED') as BenchMode
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
                setConfig({ rowLayout: [], seatsPerBench: 2, roomType: 'ROOM', benchMode: 'PAIRED' });
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
        } catch (error) {}
    };

    const loadRooms = async (blockId: number, floorId: number) => {
        try {
            const response: any = await structureService.getRooms({ blockId, floorId });
            setRooms(Array.isArray(response) ? response : (response.data || []));
        } catch (error) {}
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

                    let logicalRow = (b * 2) + 1; 
                    if (config.benchMode === 'ALTERNATING') {
                        logicalRow = (b * 2) + (s % 2 === 0 ? 2 : 1);
                    } else {
                        logicalRow = b + 1;
                    }

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
        setConfig({...config, rowLayout: [...config.rowLayout, lastBenchCount]});
    };

    const handleRemoveRow = (index: number) => {
        const newLayout = [...config.rowLayout];
        newLayout.splice(index, 1);
        setConfig({...config, rowLayout: newLayout});
    };

    const handleBenchCountChange = (index: number, value: number) => {
        const newLayout = [...config.rowLayout];
        newLayout[index] = value;
        setConfig({...config, rowLayout: newLayout});
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



    const handleSave = async () => {
        if (!selectedRoomId) return;

        const room = rooms.find(r => r.RoomID === Number(selectedRoomId));
        if (!room) return;

        if (capacityCount > room.Capacity) {
            toast.error(`Configuration exceeds room capacity (${room.Capacity} seats). Please increase room capacity.`);
            return;
        }

        setLoading(true);
        try {
            const isLayoutSame = initialConfig && JSON.stringify(config.rowLayout) === JSON.stringify(initialConfig.rowLayout) && config.seatsPerBench === initialConfig.seatsPerBench;

            // 1. Update Layout Structure
            await structureService.updateRoomLayout(Number(selectedRoomId), { ...room, RowLayout: config.rowLayout as any,
                SeatsPerBench: config.seatsPerBench,
                TotalRows: config.rowLayout.length, // Include this to prevent breaking backend logic if it needs it temporarily
                BenchesPerRow: config.rowLayout.length > 0 ? config.rowLayout[0] : 0,
                RoomType: config.roomType,
                BenchMode: config.benchMode
            } as any);

            // 2. Sent Seat Updates
            if (isLayoutSame) {
                const updates: any[] = [];
                config.rowLayout.forEach((benches, r) => {
                    const colLabel = String.fromCharCode(65 + r);
                    for (let b = 0; b < benches; b++) {
                        for (let s = 0; s < config.seatsPerBench; s++) {
                            const seatIndex = s + 1;
                            const seatId = `${colLabel}-${b + 1}-${seatIndex}`;
                            const dbSeatId = seatIdMap.get(seatId);

                            if (dbSeatId) {
                                updates.push({
                                    SeatID: dbSeatId,
                                    IsActive: !disabledSeatIds.has(seatId),
                                    ZoneID: seatZoneMap.get(seatId) || null
                                });
                            }
                        }
                    }
                });

                if (updates.length > 0) {
                    await structureService.updateSeatZones(Number(selectedRoomId), updates);
                }
            } else {
                if (disabledSeatIds.size > 0 || seatZoneMap.size > 0) {
                    toast.success("Layout dimensions changed. Seat statuses and zones resetted by server.");
                }
            }

            toast.success("Seating layout updated successfully");
            setInitialConfig(config);

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

            if (!isLayoutSame) {
                setSeatZoneMap(new Map());
                setInitialSeatZoneMap(new Map());
                setDisabledSeatIds(new Set());
            } else {
                setSeatZoneMap(currentZoneMap);
                setInitialSeatZoneMap(currentZoneMap);
            }

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
            if (initialSeatZoneMap) setSeatZoneMap(new Map(initialSeatZoneMap));
            toast.success("Layout reset to saved state");
        }
    };

    const isDirty = useMemo(() => {
        if (!initialConfig) return false;
        if (JSON.stringify(config.rowLayout) !== JSON.stringify(initialConfig.rowLayout) ||
            config.seatsPerBench !== initialConfig.seatsPerBench ||
            config.roomType !== initialConfig.roomType ||
            config.benchMode !== initialConfig.benchMode ||
            disabledSeatIds.size > 0) return true;

        if (!initialSeatZoneMap) return seatZoneMap.size > 0;
        if (seatZoneMap.size !== initialSeatZoneMap.size) return true;

        for (const [key, val] of seatZoneMap) {
            if (initialSeatZoneMap.get(key) !== val) return true;
        }
        return false;
    }, [config, initialConfig, disabledSeatIds, seatZoneMap, initialSeatZoneMap]);

    return (
        <div className="flex flex-col gap-8 pb-12 relative">
            <Modal isOpen={showZoneModal} onClose={() => setShowZoneModal(false)} size="sm" classNames={{ backdrop: "bg-slate-900/50 backdrop-blur-sm", base: "bg-white border border-slate-200 shadow-2xl" }}>
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1 text-slate-800">Auto-Zone Room</ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-slate-500 mb-2">Evenly divide the room into zones column-by-column.</p>
                        <Input type="number" label="Number of Zones" labelPlacement="outside" min={2} max={6} value={selectedZoneCount.toString()} onValueChange={(val) => setSelectedZoneCount(Number(val))} classNames={{ inputWrapper: "bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm" }} />
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
                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                                        <Building size={16} className="text-indigo-500" /> Building Block
                                    </label>
                                    <Autocomplete aria-label="Building Block" placeholder="Select a block..." size="md" variant="bordered" selectedKey={selectedBlockId} onSelectionChange={(k) => setSelectedBlockId(k as string)} popoverProps={{ classNames: { content: "bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" } }} inputProps={{ classNames: { inputWrapper: "bg-white hover:bg-slate-50 transition-colors shadow-sm" } }}>
                                        {blocks.map(b => <AutocompleteItem key={b.BlockID} textValue={b.BlockName} className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">{b.BlockName}</AutocompleteItem>)}
                                    </Autocomplete>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                                            <Layers size={16} className="text-indigo-500" /> Floor
                                        </label>
                                        <Autocomplete aria-label="Floor" placeholder="Select floor..." isDisabled={!selectedBlockId} size="md" variant="bordered" selectedKey={selectedFloorId} onSelectionChange={(k) => setSelectedFloorId(k as string)} popoverProps={{ classNames: { content: "bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" } }} inputProps={{ classNames: { inputWrapper: "bg-white hover:bg-slate-50 transition-colors shadow-sm" } }}>
                                            {floors.map(f => <AutocompleteItem key={f.FloorID} textValue={`Floor ${f.FloorNumber}`} className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">{`Floor ${f.FloorNumber}`}</AutocompleteItem>)}
                                        </Autocomplete>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                                            <DoorOpen size={16} className="text-indigo-500" /> Room
                                        </label>
                                        <Autocomplete aria-label="Room" placeholder="Select room..." isDisabled={!selectedFloorId} size="md" variant="bordered" selectedKey={selectedRoomId} onSelectionChange={(k) => setSelectedRoomId(k as string)} popoverProps={{ classNames: { content: "bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" } }} inputProps={{ classNames: { inputWrapper: "bg-white hover:bg-slate-50 transition-colors shadow-sm" } }}>
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                                                        <Box size={16} className="text-indigo-500" /> Room Type
                                                    </label>
                                                    <Select aria-label="Room Type" placeholder="Select Type..." size="md" variant="bordered" selectedKeys={[config.roomType]} onChange={(e) => setConfig({ ...config, roomType: e.target.value as RoomType })} classNames={{ trigger: "bg-white hover:bg-slate-50 transition-colors shadow-sm", popoverContent: "bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" }}>
                                                        <SelectItem key="ROOM" className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">Classroom</SelectItem>
                                                        <SelectItem key="HALL" className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">Exam Hall</SelectItem>
                                                    </Select>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 px-1">
                                                        <Grid size={16} className="text-indigo-500" /> Bench Mode
                                                    </label>
                                                    <Select aria-label="Bench Mode" placeholder="Select Mode..." size="md" variant="bordered" selectedKeys={[config.benchMode]} onChange={(e) => setConfig({ ...config, benchMode: e.target.value as BenchMode })} classNames={{ trigger: "bg-white hover:bg-slate-50 transition-colors shadow-sm", popoverContent: "bg-white border border-slate-200 shadow-xl rounded-xl z-50 p-1" }}>
                                                        <SelectItem key="PAIRED" className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">Standard</SelectItem>
                                                        <SelectItem key="ALTERNATING" className="text-slate-700 data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-700">Split Logic</SelectItem>
                                                    </Select>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Row Configuration</h4>
                                                    <Button size="sm" variant="flat" color="primary" startContent={<Plus size={14}/>} onPress={handleAddRow}>Add Row</Button>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 max-h-[250px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                                                    {config.rowLayout.map((benches, i) => (
                                                        <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-lg border shadow-sm">
                                                            <div className="w-8 h-8 rounded-md bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                                                {String.fromCharCode(65 + i)}
                                                            </div>
                                                            <div className="flex-1 flex gap-2 items-center">
                                                                <span id={`bench-label-${i}`} className="text-[10px] uppercase font-bold text-slate-500">Benches:</span>
                                                                <Input aria-labelledby={`bench-label-${i}`} size="sm" type="number" min={1} value={benches.toString()} onValueChange={(val) => handleBenchCountChange(i, Number(val))} classNames={{ inputWrapper: "bg-slate-50 hover:bg-slate-100 transition-colors shadow-none border border-slate-200" }} className="w-20" />
                                                            </div>
                                                            <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleRemoveRow(i)}><Minus size={14}/></Button>
                                                        </div>
                                                    ))}
                                                    {config.rowLayout.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No rows defined</p>}
                                                </div>
                                                <Input label="Seats Per Bench" labelPlacement="outside" size="sm" variant="bordered" type="number" min={1} value={config.seatsPerBench.toString()} onValueChange={(v) => setConfig({...config, seatsPerBench: Number(v)})} classNames={{ inputWrapper: "bg-white hover:bg-slate-50 transition-colors" }} />
                                            </div>

                                            <div className={`p-4 rounded-xl border flex justify-between items-center bg-gradient-to-br from-slate-50 to-indigo-50/50`}>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Capacity</span>
                                                    <span className="text-[10px] text-slate-400">Max: {rooms.find(r => r.RoomID === Number(selectedRoomId))?.Capacity || 0}</span>
                                                </div>
                                                <div className="text-2xl font-black text-indigo-600">{capacityCount}</div>
                                            </div>
                                        </div>

                                    {!readOnly && (
                                        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                                            <Button variant="flat" color="danger" isDisabled={!isDirty || loading} onPress={handleReset} startContent={<RotateCcw size={16} />}>Reset</Button>
                                            <Button color="primary" isLoading={loading} isDisabled={!isDirty || capacityCount === 0} onPress={handleSave} startContent={<Save size={18} />}>Save</Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-10 text-center opacity-50"><Armchair size={48} className="mx-auto mb-4"/><p className="text-sm font-medium">Select a room</p></div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* VISUAL EDITOR */}
                <div ref={containerRef} className={`${isFullScreen ? 'fixed inset-0 z-[100] h-screen w-screen rounded-none' : 'flex-1 xl:h-[calc(100vh-220px)] xl:min-h-[700px] rounded-3xl border border-slate-200'} flex flex-col bg-[#0F172A] relative transition-all relative overflow-hidden`}>
                    
                    <div className="relative z-20 flex justify-between items-center p-6 border-b border-white/5 bg-[#0F172A]/90 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] ${selectedRoomId ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                            <div>
                                <h3 className="text-white font-bold tracking-tight text-sm">3D Visual Map</h3>
                                <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
                                    {selectedRoomId ? `Editing: ${rooms.find(r => r.RoomID === Number(selectedRoomId))?.RoomCode}` : 'No Room'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                            <Button size="sm" className={viewMode === 'PHYSICAL' ? 'bg-indigo-600 text-white' : 'bg-transparent text-slate-400 font-bold uppercase text-[10px]'} onPress={() => setViewMode('PHYSICAL')} startContent={<Eye size={14}/>}>View</Button>
                            <Button size="sm" className={viewMode === 'DISABLE' ? 'bg-red-600 text-white' : 'bg-transparent text-slate-400 font-bold uppercase text-[10px]'} onPress={() => setViewMode('DISABLE')} startContent={<Ban size={14}/>}>Disable</Button>
                            <Button size="sm" className="bg-transparent text-amber-500 font-bold uppercase text-[10px] hover:bg-amber-600 hover:text-white" onPress={() => setShowZoneModal(true)} startContent={<Grid3X3 size={14}/>}>Auto-Zone</Button>
                            <Tooltip content="Toggle Fullscreen">
                                <Button isIconOnly variant="light" size="sm" className="text-slate-400 hover:text-white ml-2" onPress={toggleFullScreen}>
                                    {isFullScreen ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                                </Button>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-auto p-12 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:40px_40px]">
                        {!selectedRoomId ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20">
                                <Grid3X3 size={80} className="text-white mb-4" />
                                <h3 className="text-2xl font-bold text-white uppercase tracking-widest">Select Room To Edit</h3>
                            </div>
                        ) : (
                            <div className="min-w-min mx-auto pb-24">
                                <div className="flex flex-col items-center gap-4 mb-16">
                                    <div className="w-80 h-20 bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden">
                                        <div className="absolute top-0 inset-x-0 h-[1px] bg-indigo-500/50" />
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Front Blackboard</span>
                                    </div>
                                </div>

                                <div className="flex gap-12 justify-center">
                                    {config.rowLayout.map((benches, r) => {
                                        const colLabel = String.fromCharCode(65 + r);
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
                                                                        const seatId = `${colLabel}-${b + 1}-${seatIndex}`;
                                                                        const isActive = !disabledSeatIds.has(seatId);
                                                                        const zoneId = seatZoneMap.get(seatId);
                                                                        
                                                                        let seatCls = "w-10 h-10 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-200 text-xs font-bold relative group/seat shadow-sm ";

                                                                        if (isActive) {
                                                                            if (viewMode === 'PHYSICAL' && zoneId) {
                                                                                if (zoneId) {
                                                                                    const z = zones.find(zn => zn.ZoneID === zoneId);
                                                                                    if (z) {
                                                                                        switch(z.Color?.toLowerCase()) {
                                                                                            case 'red': seatCls += "bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30"; break;
                                                                                            case 'green': seatCls += "bg-green-500/20 border-green-500/50 text-green-300 hover:bg-green-500/30"; break;
                                                                                            case 'yellow': seatCls += "bg-yellow-500/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/30"; break;
                                                                                            case 'purple': seatCls += "bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30"; break;
                                                                                            default: seatCls += "bg-blue-500/20 border-blue-500/50 text-blue-300 hover:bg-blue-500/30"; break;
                                                                                        }
                                                                                    } else {
                                                                                        seatCls += "bg-slate-800 border-slate-700 text-slate-500";
                                                                                    }
                                                                                } else {
                                                                                    seatCls += "bg-slate-800 border-slate-700 text-slate-500 hover:border-indigo-500";
                                                                                }
                                                                            } else if (viewMode === 'DISABLE') {
                                                                                seatCls += "bg-indigo-900 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]";
                                                                            } else {
                                                                                seatCls += "bg-slate-900 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white";
                                                                            }
                                                                        } else {
                                                                            seatCls += "bg-slate-900/50 border-slate-800 text-slate-700 opacity-50 hover:border-red-500/50";
                                                                        }

                                                                        return (
                                                                            <Tooltip key={seatId} content={`${seatId} ${!isActive ? '(Disabled)' : ''}`}>
                                                                                <div className={seatCls} onClick={() => toggleSeat(seatId)}>
                                                                                    {isActive ? (
                                                                                        zoneId ? (
                                                                                            <span className="opacity-90">{zones.find(zn => zn.ZoneID === zoneId)?.ZoneCode}</span>
                                                                                        ) : (
                                                                                            <span>{seatIndex}</span>
                                                                                        )
                                                                                    ) : <Ban size={14}/>}
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
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
