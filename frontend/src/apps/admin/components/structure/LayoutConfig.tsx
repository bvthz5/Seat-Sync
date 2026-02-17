import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Autocomplete, AutocompleteItem, Input, Button, Card, CardBody, CardHeader, Divider, Tooltip, Chip, Switch, Select, SelectItem, Badge } from '@heroui/react';
import { Trash2, MousePointer2, CheckCircle2, RotateCcw, Save, Layers, Building2, Armchair, Layout, Check, X, Shield, Plus, Grid3X3, Spline, ArrowRight, ArrowLeft, MonitorPlay, AlertTriangle, MapPin, ChevronRight, Hash, Maximize2, Minimize2, Eye, EyeOff, Ban } from 'lucide-react';
import { structureService } from '../../services/structureService';
import { Block, Floor, Room, Zone } from '../../types/collegeStructure';
import { toast } from '../../../../utils/toast';

interface LayoutConfigProps {
    readOnly?: boolean;
}

// Internal extended types for the Atomic Seat Model
type RoomType = 'ROOM' | 'HALL';
type BenchMode = 'PAIRED' | 'ALTERNATING';
type ViewMode = 'PHYSICAL' | 'LOGICAL' | 'ZONE_EDIT';

// Removed local Zone interface as it is now imported

interface SeatConfig {
    id: string; // e.g., "A-1-1" (Col-Bench-Seat)
    colIndex: number;
    colLabel: string;
    benchIndex: number;
    seatIndex: number; // 1-based index within bench
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
        rows: 0,
        benchesPerRow: 0,
        seatsPerBench: 0,
        // Extended attributes
        roomType: 'ROOM' as RoomType,
        benchMode: 'PAIRED' as BenchMode
    });

    const [viewMode, setViewMode] = useState<ViewMode>('PHYSICAL');
    const [disabledSeatIds, setDisabledSeatIds] = useState<Set<string>>(new Set());

    // Zone Management State
    const [zones, setZones] = useState<Zone[]>([]);
    const [seatZoneMap, setSeatZoneMap] = useState<Map<string, number>>(new Map());
    const [seatIdMap, setSeatIdMap] = useState<Map<string, number>>(new Map());
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
    // Removed unused selectedSeatIds state and handleAssignZone function

    // Zone Creation Inputs
    const [newZoneName, setNewZoneName] = useState("");
    const [newZoneCode, setNewZoneCode] = useState("");
    const [newZoneColor, setNewZoneColor] = useState("blue");

    const [loading, setLoading] = useState(false);
    const [initialConfig, setInitialConfig] = useState<any>(null); // To detect changes
    const [initialSeatZoneMap, setInitialSeatZoneMap] = useState<Map<string, number> | null>(null);
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

    // When room is selected, load its config and layout
    useEffect(() => {
        const fetchRoomDetails = async () => {
            if (selectedRoomId) {
                try {
                    setLoading(true);
                    const data = await structureService.getRoomLayout(Number(selectedRoomId));
                    const room = data.room;

                    const newConfig = {
                        rows: room.TotalRows,
                        benchesPerRow: room.BenchesPerRow,
                        seatsPerBench: room.SeatsPerBench,
                        roomType: ((room as any).RoomType || 'ROOM') as RoomType,
                        benchMode: ((room as any).BenchMode || 'PAIRED') as BenchMode
                    };
                    setConfig(newConfig);
                    setInitialConfig(newConfig);

                    // Populate Seat State
                    const newDisabledSet = new Set<string>();
                    const newZoneMap = new Map<string, number>();

                    if (data.seats) {
                        data.seats.forEach((s: any) => {
                            // Ensure RowLabel is trimmed to match frontend generation (A, B, C...)
                            const rowLabel = s.RowLabel ? s.RowLabel.trim() : '';
                            const seatId = `${rowLabel}-${s.BenchNumber}-${s.SeatNumber}`;

                            console.log('📍 Loading Seat:', { seatId, IsActive: s.IsActive, ZoneID: s.ZoneID });

                            if (s.IsActive === false) newDisabledSet.add(seatId);
                            if (s.ZoneID) {
                                newZoneMap.set(seatId, Number(s.ZoneID));
                                console.log('✅ Mapped Zone:', seatId, '→ Zone', s.ZoneID);
                            }
                        });
                    }

                    console.log('🗺️ Total Zone Mappings:', newZoneMap.size, Array.from(newZoneMap.entries()));

                    setDisabledSeatIds(newDisabledSet);
                    setSeatZoneMap(newZoneMap);
                    setInitialSeatZoneMap(newZoneMap);

                    // Populate Seat ID Map (Essential for handleSave)
                    const newSeatIdMap = new Map<string, number>();
                    if (data.seats) {
                        data.seats.forEach((s: any) => {
                            const rowLabel = s.RowLabel ? s.RowLabel.trim() : '';
                            const seatId = `${rowLabel}-${s.BenchNumber}-${s.SeatNumber}`;
                            newSeatIdMap.set(seatId, s.SeatID);
                        });
                    }
                    setSeatIdMap(newSeatIdMap);

                    // Populate Zones
                    if (data.zones) {
                        console.log('🎨 Zones Loaded:', data.zones);
                        setZones(data.zones);
                    } else {
                        setZones([]);
                    }

                } catch (error) {
                    console.error("Failed to load room layout", error);
                    toast.error("Failed to load room layout");
                } finally {
                    setLoading(false);
                }
            } else {
                setConfig({ rows: 0, benchesPerRow: 0, seatsPerBench: 0, roomType: 'ROOM', benchMode: 'PAIRED' });
                setInitialConfig(null);
                setInitialSeatZoneMap(null);
                setDisabledSeatIds(new Set());
                setSeatZoneMap(new Map());
                setZones([]);
            }
        };

        fetchRoomDetails();
    }, [selectedRoomId]);

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
                    const zoneId = seatZoneMap.get(seatId);

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
                        logicalRow: logicalRow,
                        zoneId
                    });
                }
            }
        }
        return seats;
    }, [config, disabledSeatIds, selectedRoomId, seatZoneMap]);

    const activeSeatCount = generatedSeats.filter(s => s.isActive).length;

    // --- Actions ---

    const toggleSeat = (seatId: string) => {
        if (readOnly) return;

        if (viewMode === 'ZONE_EDIT') {
            if (!selectedZoneId) {
                toast.error("Please select a zone to paint seats.");
                return;
            }

            const newMap = new Map(seatZoneMap);
            const currentZone = newMap.get(seatId);

            if (currentZone === selectedZoneId) {
                // Toggle off if clicking the same zone
                newMap.delete(seatId);
            } else {
                // Paint with new zone
                newMap.set(seatId, selectedZoneId);
            }
            setSeatZoneMap(newMap);
            return;
        }

        const newSet = new Set(disabledSeatIds);
        if (newSet.has(seatId)) {
            newSet.delete(seatId);
        } else {
            newSet.add(seatId);
        }
        setDisabledSeatIds(newSet);
    };

    const handleAddZone = async () => {
        if (!selectedRoomId || !newZoneName || !newZoneCode) return;
        try {
            setLoading(true);
            const newZone = await structureService.createZone(Number(selectedRoomId), {
                ZoneCode: newZoneCode,
                ZoneName: newZoneName,
                Color: newZoneColor
            });
            setZones([...zones, newZone]);
            setNewZoneName("");
            setNewZoneCode("");
            setSelectedZoneId(newZone.ZoneID); // Auto-select for painting
            toast.success("Zone created and selected for painting");
        } catch (error) {
            console.error("Failed to create zone", error);
            toast.error("Failed to create zone");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteZone = async (zoneId: number) => {
        try {
            setLoading(true);
            await structureService.deleteZone(zoneId);
            setZones(zones.filter(z => z.ZoneID !== zoneId));

            // Remove zone assignments locally
            const newMap = new Map(seatZoneMap);
            let changed = false;
            for (const [seatId, zid] of newMap.entries()) {
                if (zid === zoneId) {
                    newMap.delete(seatId);
                    changed = true;
                }
            }
            if (changed) setSeatZoneMap(newMap);

            toast.success("Zone deleted");
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete zone");
        } finally {
            setLoading(false);
        }
    };

    const handleAutoZone4Quadrants = async () => {
        if (!selectedRoomId || config.rows === 0 || config.benchesPerRow === 0) {
            toast.error("Please configure room dimensions first");
            return;
        }

        try {
            setLoading(true);

            // Define 4 zones with distinct colors
            const zoneDefinitions = [
                { name: 'Zone A (Top-Left)', code: 'A', color: 'blue' },
                { name: 'Zone B (Top-Right)', code: 'B', color: 'red' },
                { name: 'Zone C (Bottom-Left)', code: 'C', color: 'green' },
                { name: 'Zone D (Bottom-Right)', code: 'D', color: 'yellow' }
            ];

            // FIRST: Fetch all existing zones from the server to avoid duplicates
            const allZones = await structureService.getZones(Number(selectedRoomId));
            console.log('🔍 Existing zones in room:', allZones);

            // Try to reuse existing zones or create new ones
            const createdZones: Zone[] = [];
            for (const zoneDef of zoneDefinitions) {
                // Check if zone with this code already exists
                const existingZone = allZones.find(z => z.ZoneCode === zoneDef.code);

                if (existingZone) {
                    console.log('♻️ Reusing existing zone:', zoneDef.code, existingZone.ZoneID);
                    createdZones.push(existingZone);
                } else {
                    // Create new zone only if it doesn't exist
                    console.log('➕ Creating new zone:', zoneDef.code);
                    const newZone = await structureService.createZone(Number(selectedRoomId), {
                        ZoneCode: zoneDef.code,
                        ZoneName: zoneDef.name,
                        Color: zoneDef.color
                    });
                    createdZones.push(newZone);
                }
            }

            // Update zones state with fresh list from server
            setZones(await structureService.getZones(Number(selectedRoomId)));

            // Calculate midpoints for quadrant division
            const rowMidpoint = Math.ceil(config.rows / 2);
            const benchMidpoint = Math.ceil(config.benchesPerRow / 2);

            // Assign seats to zones based on quadrants
            const newZoneMap = new Map<string, number>();

            generatedSeats.forEach(seat => {
                const isTopHalf = seat.colIndex < rowMidpoint;
                const isLeftHalf = seat.benchIndex < benchMidpoint;

                let zoneIndex: number;
                if (isTopHalf && isLeftHalf) {
                    zoneIndex = 0; // Zone A (Top-Left)
                } else if (isTopHalf && !isLeftHalf) {
                    zoneIndex = 1; // Zone B (Top-Right)
                } else if (!isTopHalf && isLeftHalf) {
                    zoneIndex = 2; // Zone C (Bottom-Left)
                } else {
                    zoneIndex = 3; // Zone D (Bottom-Right)
                }

                const zone = createdZones[zoneIndex];
                if (zone && seat.isActive) {
                    newZoneMap.set(seat.id, zone.ZoneID);
                }
            });

            setSeatZoneMap(newZoneMap);
            toast.success(`Auto-zoned into 4 quadrants with ${newZoneMap.size} seats assigned`);

        } catch (error: any) {
            console.error("Failed to auto-zone", error);
            toast.error(error.response?.data?.message || "Failed to auto-zone");
        } finally {
            setLoading(false);
        }
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
            // 1. Update Layout Structure
            const updatedRoom = await structureService.updateRoomLayout(Number(selectedRoomId), {
                ...room,
                TotalRows: config.rows,
                BenchesPerRow: config.benchesPerRow,
                SeatsPerBench: config.seatsPerBench,
                RoomType: config.roomType, // Save RoomType
                BenchMode: config.benchMode // Save BenchMode
            });

            // 2. Persist Seat Statuses & Zones
            const dimensionsChanged =
                room.TotalRows !== config.rows ||
                room.BenchesPerRow !== config.benchesPerRow ||
                room.SeatsPerBench !== config.seatsPerBench;


            if (!dimensionsChanged) {
                // Push updates for IsActive and ZoneID
                // Build seat updates from current state
                const updates: any[] = [];

                // Generate all possible seat IDs based on current config (A, B, C...)
                for (let r = 0; r < config.rows; r++) {
                    const colLabel = String.fromCharCode(65 + r);
                    for (let b = 0; b < config.benchesPerRow; b++) {
                        for (let s = 0; s < config.seatsPerBench; s++) {
                            const seatIndex = s + 1;
                            const seatId = `${colLabel}-${b + 1}-${seatIndex}`;
                            const dbSeatId = seatIdMap.get(seatId);

                            if (dbSeatId) {
                                const isActive = !disabledSeatIds.has(seatId);
                                const zoneId = seatZoneMap.get(seatId);

                                updates.push({
                                    SeatID: dbSeatId,
                                    IsActive: isActive,
                                    ZoneID: zoneId || null // Send null if undefined to clear zone
                                });
                            }
                        }
                    }
                }

                console.log('💾 Saving seat updates:', updates.length, 'seats');
                console.log('  - Disabled seats:', disabledSeatIds.size);
                console.log('  - Zone assignments:', seatZoneMap.size);
                console.log('  - Sample updates:', updates.slice(0, 3));

                if (updates.length > 0) {
                    await structureService.updateSeatZones(Number(selectedRoomId), updates);
                }
            } else {
                // If dimensions changed, seats were reset to Active/NoZone.
                // We should warn user or just accept it.
                // The new seats don't have IDs in our map yet, so we can't update them.
                // We just refresh.
                if (disabledSeatIds.size > 0 || seatZoneMap.size > 0) {
                    toast.success("Layout dimensions changed. Seat statuses and zones were reset.");
                }
            }

            toast.success("Seating layout updated successfully");
            setInitialConfig(config);

            // Refresh logic and reset initial states
            const data = await structureService.getRoomLayout(Number(selectedRoomId));
            console.log('🔄 Reloaded room data after save:', {
                seatsCount: data.seats?.length,
                zonesCount: data.zones?.length,
                sampleSeats: data.seats?.slice(0, 3)
            });

            const newSeatIdMap = new Map<string, number>();
            const currentZoneMap = new Map<string, number>(); // Capture current state for initial

            if (data.seats) {
                data.seats.forEach((s: any) => {
                    const rowLabel = s.RowLabel ? s.RowLabel.trim() : '';
                    const seatId = `${rowLabel}-${s.BenchNumber}-${s.SeatNumber}`;
                    newSeatIdMap.set(seatId, s.SeatID);
                    if (s.ZoneID) {
                        currentZoneMap.set(seatId, s.ZoneID);
                        console.log('🔄 Re-mapping zone after save:', seatId, '→', s.ZoneID);
                    }
                });
            }

            console.log('🔄 Populated currentZoneMap size:', currentZoneMap.size, 'from', data.seats?.length, 'seats');
            console.log('🔄 Sample zone mappings:', Array.from(currentZoneMap.entries()).slice(0, 5));

            setSeatIdMap(newSeatIdMap);

            if (dimensionsChanged) {
                console.log('⚠️ Dimensions changed - clearing zone map');
                setSeatZoneMap(new Map());
                setInitialSeatZoneMap(new Map());
                setDisabledSeatIds(new Set());
            } else {
                // Sync with server state
                console.log('✅ Dimensions unchanged - syncing zone map with server state');
                console.log('✅ Setting seatZoneMap to currentZoneMap with size:', currentZoneMap.size);
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

        const configChanged =
            config.rows !== initialConfig.rows ||
            config.benchesPerRow !== initialConfig.benchesPerRow ||
            config.seatsPerBench !== initialConfig.seatsPerBench ||
            config.roomType !== initialConfig.roomType ||
            config.benchMode !== initialConfig.benchMode ||
            disabledSeatIds.size > 0; // Simplified for disabled seats, assuming start empty or consistent

        if (configChanged) return true;

        // Check Zone Map Changes
        if (!initialSeatZoneMap) return seatZoneMap.size > 0;
        if (seatZoneMap.size !== initialSeatZoneMap.size) return true;

        for (const [key, val] of seatZoneMap) {
            if (initialSeatZoneMap.get(key) !== val) return true;
        }

        return false;
    }, [config, initialConfig, disabledSeatIds, seatZoneMap, initialSeatZoneMap]);

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
                                    <span id="lbl-building" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                        <Building2 size={12} /> Building Block
                                    </span>
                                    <Autocomplete
                                        aria-labelledby="lbl-building"
                                        aria-label="Building Block"
                                        name="building"
                                        placeholder="Search building..."
                                        variant="bordered"
                                        selectedKey={selectedBlockId}
                                        onSelectionChange={(k) => setSelectedBlockId(k as string)}
                                        inputProps={{
                                            classNames: { inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl data-[hover=true]:bg-slate-100 group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg group-data-[focus=true]:ring-2 ring-indigo-500/20 transition-all", input: "!text-slate-700 !font-bold" }
                                        }}
                                        listboxProps={{
                                            emptyContent: "No buildings found"
                                        }}
                                        popoverProps={{ classNames: { content: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl" } }}
                                    >
                                        {blocks.map(b => <AutocompleteItem key={b.BlockID} textValue={b.BlockName}>{b.BlockName}</AutocompleteItem>)}
                                    </Autocomplete>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <span id="lbl-floor" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Layers size={12} /> Floor
                                        </span>
                                        <Autocomplete
                                            aria-labelledby="lbl-floor"
                                            aria-label="Floor"
                                            name="floor"
                                            isDisabled={!selectedBlockId}
                                            placeholder="Floor..."
                                            variant="bordered"
                                            selectedKey={selectedFloorId}
                                            onSelectionChange={(k) => setSelectedFloorId(k as string)}
                                            inputProps={{
                                                classNames: { inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl data-[hover=true]:bg-slate-100 group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg group-data-[focus=true]:ring-2 ring-indigo-500/20 transition-all", input: "!text-slate-700 !font-bold" }
                                            }}
                                            popoverProps={{ classNames: { content: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl" } }}
                                        >
                                            {floors.map(f => <AutocompleteItem key={f.FloorID} textValue={`Floor ${f.FloorNumber}`}>{`Floor ${f.FloorNumber}`}</AutocompleteItem>)}
                                        </Autocomplete>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span id="lbl-room" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                            <Armchair size={12} /> Room
                                        </span>
                                        <Autocomplete
                                            aria-labelledby="lbl-room"
                                            aria-label="Room"
                                            name="room"
                                            isDisabled={!selectedFloorId}
                                            placeholder="Room..."
                                            variant="bordered"
                                            selectedKey={selectedRoomId}
                                            onSelectionChange={(k) => setSelectedRoomId(k as string)}
                                            inputProps={{
                                                classNames: { inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl data-[hover=true]:bg-slate-100 group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg group-data-[focus=true]:ring-2 ring-indigo-500/20 transition-all", input: "!text-slate-700 !font-bold" }
                                            }}
                                            popoverProps={{ classNames: { content: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-2xl" } }}
                                        >
                                            {rooms.map(r => <AutocompleteItem key={r.RoomID} textValue={r.RoomCode}>{r.RoomCode || r.RoomName}</AutocompleteItem>)}
                                        </Autocomplete>
                                    </div>
                                </div>
                            </div>

                            <Divider className="opacity-50" />

                            {selectedRoomId ? (
                                <div className="space-in fade-in slide-in-from-bottom-2">

                                    {viewMode === 'ZONE_EDIT' ? (
                                        // --- ZONE MANAGER UI ---
                                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                    <Shield size={16} className="text-indigo-500" />
                                                    Zone Management
                                                </h4>
                                                <Button
                                                    size="sm"
                                                    variant="light"
                                                    className="h-6 text-[10px] font-bold text-slate-500 hover:text-indigo-600 px-2"
                                                    startContent={<ArrowLeft size={12} />}
                                                    onPress={() => setViewMode('LOGICAL')}
                                                >
                                                    Back to Config
                                                </Button>
                                            </div>

                                            {/* Auto-Zone for Halls */}
                                            {config.roomType === 'HALL' && (
                                                <div className="p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200 shadow-sm space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-purple-100 rounded-lg">
                                                            <Grid3X3 size={16} className="text-purple-600" />
                                                        </div>
                                                        <div>
                                                            <h5 className="text-xs font-bold text-purple-700 uppercase tracking-wide">Quick Auto-Zone</h5>
                                                            <p className="text-[10px] text-purple-600/70">Exam Hall Mode</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-purple-600/80 leading-relaxed">
                                                        Automatically divide this hall into <span className="font-bold">4 equal quadrants</span> (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
                                                    </p>
                                                    <Button
                                                        id="auto-zone-btn"
                                                        size="lg"
                                                        isLoading={loading}
                                                        className="w-full font-bold text-white shadow-lg shadow-purple-500/30 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl"
                                                        onPress={handleAutoZone4Quadrants}
                                                        startContent={<Grid3X3 size={20} />}
                                                    >
                                                        Auto-Zone (4 Quadrants)
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Create Zone */}
                                            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Plus size={12} /> Create New Zone
                                                </h5>
                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <span id="lbl-zone-name" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Zone Name</span>
                                                        <Input
                                                            aria-labelledby="lbl-zone-name"
                                                            aria-label="Zone Name"
                                                            name="zoneName"
                                                            size="sm"
                                                            placeholder="e.g. Front Row"
                                                            value={newZoneName}
                                                            onValueChange={setNewZoneName}
                                                            classNames={{
                                                                inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg ring-1 ring-slate-200 group-data-[focus=true]:ring-indigo-500 transition-all",
                                                                input: "font-semibold text-slate-700 placeholder:text-slate-400"
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <span id="lbl-zone-code" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Code</span>
                                                            <Input
                                                                aria-labelledby="lbl-zone-code"
                                                                aria-label="Zone Code"
                                                                name="zoneCode"
                                                                size="sm"
                                                                placeholder="e.g. Z1"
                                                                value={newZoneCode}
                                                                onValueChange={setNewZoneCode}
                                                                classNames={{
                                                                    inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg ring-1 ring-slate-200 group-data-[focus=true]:ring-indigo-500 transition-all",
                                                                    input: "font-semibold text-slate-700 placeholder:text-slate-400"
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span id="lbl-zone-color" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Color</span>
                                                            <Select
                                                                aria-labelledby="lbl-zone-color"
                                                                aria-label="Zone Color"
                                                                name="zoneColor"
                                                                size="sm"
                                                                placeholder="Select color"
                                                                selectedKeys={[newZoneColor]}
                                                                onChange={(e) => setNewZoneColor(e.target.value)}
                                                                classNames={{
                                                                    trigger: "bg-slate-50 border-none shadow-inner rounded-xl h-10 group-data-[focus=true]:bg-white ring-1 ring-slate-200",
                                                                    popoverContent: "bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl rounded-xl"
                                                                }}
                                                            >
                                                                <SelectItem key="blue" textValue="Blue" startContent={<div className="w-3 h-3 rounded-full bg-blue-500" />}>Blue</SelectItem>
                                                                <SelectItem key="red" textValue="Red" startContent={<div className="w-3 h-3 rounded-full bg-red-500" />}>Red</SelectItem>
                                                                <SelectItem key="green" textValue="Green" startContent={<div className="w-3 h-3 rounded-full bg-green-500" />}>Green</SelectItem>
                                                                <SelectItem key="yellow" textValue="Yellow" startContent={<div className="w-3 h-3 rounded-full bg-yellow-500" />}>Yellow</SelectItem>
                                                                <SelectItem key="purple" textValue="Purple" startContent={<div className="w-3 h-3 rounded-full bg-purple-500" />}>Purple</SelectItem>
                                                            </Select>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        id="add-zone-btn"
                                                        size="md"
                                                        className="w-full font-bold text-white shadow-lg shadow-indigo-500/30 bg-indigo-600 hover:bg-indigo-700 rounded-xl mt-2"
                                                        onPress={handleAddZone}
                                                        startContent={<Plus size={18} />}
                                                    >
                                                        Add Zone
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Existing Zones */}
                                            <div className="space-y-3">
                                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                                    <Layers size={12} /> Existing Zones
                                                </h5>

                                                {zones.length === 0 ? (
                                                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                                                        <p className="text-xs font-semibold text-slate-400 mb-1">No zones created</p>
                                                        <p className="text-[10px] text-slate-300">Add a zone above to get started</p>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                                        {zones.map(z => (
                                                            <div
                                                                key={z.ZoneID}
                                                                className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all duration-200
                                                                    ${selectedZoneId === z.ZoneID
                                                                        ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500 shadow-md shadow-indigo-100'
                                                                        : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
                                                                onClick={() => setSelectedZoneId(z.ZoneID)}
                                                                role="button"
                                                                tabIndex={0}
                                                                aria-selected={selectedZoneId === z.ZoneID}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    {(() => {
                                                                        const color = z.Color?.toLowerCase() || 'blue';
                                                                        const bgMap: Record<string, string> = {
                                                                            blue: 'bg-blue-100 border-blue-200',
                                                                            red: 'bg-red-100 border-red-200',
                                                                            green: 'bg-green-100 border-green-200',
                                                                            yellow: 'bg-yellow-100 border-yellow-200',
                                                                            purple: 'bg-purple-100 border-purple-200',
                                                                            orange: 'bg-orange-100 border-orange-200',
                                                                            teal: 'bg-teal-100 border-teal-200',
                                                                        };
                                                                        const dotMap: Record<string, string> = {
                                                                            blue: 'bg-blue-500',
                                                                            red: 'bg-red-500',
                                                                            green: 'bg-green-500',
                                                                            yellow: 'bg-yellow-500',
                                                                            purple: 'bg-purple-500',
                                                                            orange: 'bg-orange-500',
                                                                            teal: 'bg-teal-500',
                                                                        };
                                                                        return (
                                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${bgMap[color] || bgMap['blue']}`}>
                                                                                <div className={`w-3 h-3 rounded-full ring-2 ring-white ${dotMap[color] || dotMap['blue']}`} />
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-xs font-bold ${selectedZoneId === z.ZoneID ? 'text-indigo-700' : 'text-slate-700'}`}>{z.ZoneName}</span>
                                                                        <span className="text-[10px] text-slate-400 font-mono font-medium tracking-tight">Code: {z.ZoneCode}</span>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    isIconOnly
                                                                    size="sm"
                                                                    variant="light"
                                                                    className="text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                                                                    onPress={(e) => {
                                                                        e.continuePropagation(); // Prevent selecting the zone when deleting
                                                                        handleDeleteZone(z.ZoneID);
                                                                    }}
                                                                    aria-label={`Delete zone ${z.ZoneName}`}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={`p-4 rounded-xl border transition-all duration-300 ${selectedZoneId ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-500/20' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className={`p-2 rounded-lg ${selectedZoneId ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                                        <MousePointer2 size={16} />
                                                    </div>
                                                    <div>
                                                        <h6 className={`text-xs font-bold uppercase tracking-wider mb-1 ${selectedZoneId ? 'text-indigo-700' : 'text-slate-500'}`}>
                                                            {selectedZoneId ? 'Painting Mode Active' : 'Select a Zone'}
                                                        </h6>
                                                        <p className="text-[10px] text-slate-500 leading-relaxed">
                                                            {selectedZoneId
                                                                ? "Click any seat on the grid to paint it with the selected zone color."
                                                                : "Select a zone from the list above to start painting seats."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Save Button for Zone Edit */}
                                            <Button
                                                color="primary"
                                                isLoading={loading}
                                                isDisabled={!isDirty || activeSeatCount === 0}
                                                onPress={handleSave}
                                                startContent={<Save size={18} />}
                                                className="w-full h-12 font-bold shadow-lg shadow-indigo-500/20 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:to-indigo-600 mt-2"
                                            >
                                                Save Zone Layout
                                            </Button>
                                        </div>
                                    ) : (
                                        // --- CONFIGURATION UI ---
                                        <div className="space-y-6">
                                            {/* A. Room Type & Bench Mode */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-slate-700">Room Strategy</h4>
                                                    {isDirty && <Chip size="sm" color="warning" variant="flat" className="h-5 text-[10px] font-bold">Modified</Chip>}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <span id="lbl-room-type" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Room Type</span>
                                                        <Select
                                                            aria-labelledby="lbl-room-type"
                                                            aria-label="Room Type"
                                                            id="room-type-select"
                                                            name="roomType"
                                                            selectedKeys={[config.roomType]}
                                                            onChange={(e) => setConfig({ ...config, roomType: e.target.value as RoomType })}
                                                            variant="bordered"
                                                            classNames={{
                                                                trigger: "bg-slate-50 border-none shadow-inner rounded-xl h-11 data-[hover=true]:bg-slate-100 pr-2",
                                                                popoverContent: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg",
                                                                selectorIcon: "right-3"
                                                            }}
                                                        >
                                                            <SelectItem key="ROOM" startContent={<Grid3X3 size={14} />} textValue="Classroom">Classroom</SelectItem>
                                                            <SelectItem key="HALL" startContent={<Layout size={14} />} textValue="Exam Hall">Exam Hall</SelectItem>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <span id="lbl-bench-mode" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Bench Mode</span>
                                                        <Select
                                                            aria-labelledby="lbl-bench-mode"
                                                            aria-label="Bench Mode"
                                                            id="bench-mode-select"
                                                            name="benchMode"
                                                            selectedKeys={[config.benchMode]}
                                                            onChange={(e) => setConfig({ ...config, benchMode: e.target.value as BenchMode })}
                                                            variant="bordered"
                                                            classNames={{
                                                                trigger: "bg-slate-50 border-none shadow-inner rounded-xl h-11 data-[hover=true]:bg-slate-100 pr-2",
                                                                popoverContent: "bg-white/80 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg",
                                                                selectorIcon: "right-3"
                                                            }}
                                                        >
                                                            <SelectItem key="PAIRED" startContent={<CheckCircle2 size={14} />} textValue="Standard">Standard</SelectItem>
                                                            <SelectItem key="ALTERNATING" startContent={<Spline size={14} />} textValue="Split Logic">Split Logic</SelectItem>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* B. Grid Dimensions */}
                                            <div className="space-y-4">
                                                <h4 className="text-sm font-bold text-slate-700">Grid Dimensions</h4>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <span id="lbl-columns" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Columns</span>
                                                        <Input
                                                            aria-labelledby="lbl-columns"
                                                            aria-label="Columns"
                                                            id="columns-input"
                                                            name="columns"
                                                            type="number"
                                                            min={1}
                                                            value={config.rows.toString()}
                                                            onValueChange={(v) => setConfig({ ...config, rows: Number(v) })}
                                                            classNames={{
                                                                inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg transition-all",
                                                                input: "!font-bold text-slate-700"
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <span id="lbl-benches-col" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Benches/Col</span>
                                                        <Input
                                                            aria-labelledby="lbl-benches-col"
                                                            aria-label="Benches per Column"
                                                            id="benches-per-row-input"
                                                            name="benchesPerRow"
                                                            type="number"
                                                            min={1}
                                                            value={config.benchesPerRow.toString()}
                                                            onValueChange={(v) => setConfig({ ...config, benchesPerRow: Number(v) })}
                                                            classNames={{
                                                                inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg transition-all",
                                                                input: "!font-bold text-slate-700"
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <span id="lbl-seats-bench" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Seats/Bench</span>
                                                    <Input
                                                        aria-labelledby="lbl-seats-bench"
                                                        aria-label="Seats per Bench"
                                                        id="seats-per-bench-input"
                                                        name="seatsPerBench"
                                                        type="number"
                                                        min={1}
                                                        value={config.seatsPerBench.toString()}
                                                        onValueChange={(v) => setConfig({ ...config, seatsPerBench: Number(v) })}
                                                        classNames={{
                                                            label: "text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1",
                                                            inputWrapper: "bg-slate-50 border-none shadow-inner rounded-xl group-data-[focus=true]:bg-white group-data-[focus=true]:shadow-lg transition-all",
                                                            input: "!font-bold text-slate-700"
                                                        }}
                                                        startContent={<Hash size={14} className="text-slate-400" />}
                                                    />
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

                                            {/* Hall Mode Navigation */}
                                            {config.roomType === 'HALL' && (
                                                <div className="space-y-3 mt-4">
                                                    {isDirty && (
                                                        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-700 animate-in fade-in slide-in-from-bottom-2">
                                                            <AlertTriangle size={16} className="shrink-0" />
                                                            <p className="text-[10px] font-bold uppercase tracking-wide leading-tight">
                                                                Please save seat layout before configuring zones
                                                            </p>
                                                        </div>
                                                    )}
                                                    <Button
                                                        className="w-full font-bold shadow-sm bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100"
                                                        size="lg"
                                                        endContent={<ArrowRight size={16} />}
                                                        onPress={() => setViewMode('ZONE_EDIT')}
                                                    >
                                                        Next: Configure Zones
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            {!readOnly && (
                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    <Button variant="flat" color="danger" isDisabled={!isDirty || loading} onPress={handleReset} startContent={<RotateCcw size={16} />} className="h-12 font-semibold rounded-xl">Reset</Button>
                                                    <Button color="primary" isLoading={loading} isDisabled={!isDirty || activeSeatCount === 0} onPress={handleSave} startContent={<Save size={18} />} className="h-12 font-bold shadow-lg shadow-indigo-500/20 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:to-indigo-600">Save Layout</Button>
                                                </div>
                                            )}
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
                    className={`${isFullScreen ? 'fixed inset-0 z-[100] rounded-none h-screen w-screen' : 'flex-1 xl:h-[calc(100vh-220px)] xl:min-h-[700px] rounded-3xl border border-slate-200 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5'} flex flex-col bg-[#0F172A] relative transition-all duration-500 overflow-hidden`}
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
                                <button onClick={() => setViewMode('ZONE_EDIT')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${viewMode === 'ZONE_EDIT' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                                    <Shield size={12} /> Zones
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

                                                                        const zoneId = seatZoneMap.get(seatId);

                                                                        // DEBUG: Log zone lookup for first seat of first bench
                                                                        if (b === 0 && s === 0) {
                                                                            console.log('🔍 Sample Seat Rendering:', {
                                                                                seatId,
                                                                                zoneId,
                                                                                seatZoneMapSize: seatZoneMap.size,
                                                                                viewMode,
                                                                                zonesCount: zones.length
                                                                            });
                                                                        }

                                                                        // Calculate styles based on ViewMode
                                                                        let seatClass = "w-10 h-10 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all duration-200 relative overflow-hidden group/seat";

                                                                        if (isActive) {
                                                                            // ACTIVE SEAT STYLING
                                                                            const hasZone = !!zoneId;
                                                                            const showZoneColor = viewMode === 'ZONE_EDIT' || (viewMode === 'PHYSICAL' && hasZone);

                                                                            if (showZoneColor) {
                                                                                const zone = zones.find(z => z.ZoneID === zoneId);
                                                                                seatClass += " shadow-sm font-bold text-xs";

                                                                                if (zone) {
                                                                                    const colorMap: Record<string, string> = {
                                                                                        blue: "bg-blue-500/20 border-blue-500/50 text-blue-300 hover:bg-blue-500/30",
                                                                                        red: "bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30",
                                                                                        green: "bg-green-500/20 border-green-500/50 text-green-300 hover:bg-green-500/30",
                                                                                        yellow: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300 hover:bg-yellow-500/30",
                                                                                        purple: "bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30",
                                                                                        orange: "bg-orange-500/20 border-orange-500/50 text-orange-300 hover:bg-orange-500/30",
                                                                                        teal: "bg-teal-500/20 border-teal-500/50 text-teal-300 hover:bg-teal-500/30",
                                                                                    };
                                                                                    const zoneColor = zone.Color || 'blue';
                                                                                    const zoneColorClass = colorMap[zoneColor.toLowerCase()] || colorMap['blue'];
                                                                                    seatClass += ` ${zoneColorClass}`;
                                                                                } else if (viewMode === 'PHYSICAL') {
                                                                                    // Default Physical (No Zone)
                                                                                    seatClass += " bg-slate-900 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]";
                                                                                } else {
                                                                                    // Zone Edit (No Zone)
                                                                                    seatClass += " bg-slate-800 border-slate-700 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-slate-700";
                                                                                }

                                                                            } else if (viewMode === 'LOGICAL') {
                                                                                if (logicalRow % 2 === 0) seatClass += " bg-emerald-900/20 border-emerald-600/50 text-emerald-400";
                                                                                else seatClass += " bg-blue-900/20 border-blue-600/50 text-blue-400";
                                                                            } else {
                                                                                // Fallback (Physical No Zone)
                                                                                seatClass += " bg-slate-900 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:border-indigo-500 hover:text-white shadow-[0_0_15px_rgba(99,102,241,0.15)]";
                                                                            }
                                                                        } else {
                                                                            // Inactive
                                                                            seatClass += " bg-slate-900/50 border-slate-800 text-slate-700 hover:border-red-500/50 hover:text-red-500";
                                                                        }

                                                                        return (
                                                                            <Tooltip key={seatIndex} content={
                                                                                <div className="px-2 py-1">
                                                                                    <div className="font-black text-sm text-white mb-0.5 shadow-black drop-shadow-md">{seatId}</div>
                                                                                    <div className={`text-[11px] font-medium ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>Status: {isActive ? 'Active' : 'Inactive'}</div>
                                                                                    {viewMode === 'LOGICAL' && <div className="text-[10px] text-indigo-400 mt-0.5">Logical Row: {logicalRow}</div>}
                                                                                    {zoneId && <div className="text-[10px] text-amber-400 mt-0.5">Zone: {zones.find(z => z.ZoneID === zoneId)?.ZoneName || zoneId}</div>}
                                                                                </div>
                                                                            } closeDelay={0}>
                                                                                <div
                                                                                    onClick={() => toggleSeat(seatId)}
                                                                                    className={seatClass}
                                                                                >
                                                                                    {isActive ? (
                                                                                        <div className="flex flex-col items-center justify-center z-10">
                                                                                            {viewMode === 'ZONE_EDIT' && zoneId ? (
                                                                                                <>
                                                                                                    <span className="text-[9px] font-black opacity-70">{zones.find(z => z.ZoneID === zoneId)?.ZoneCode || seatIndex}</span>
                                                                                                    <span className="text-[6px] font-medium opacity-50">{seatIndex}</span>
                                                                                                </>
                                                                                            ) : (
                                                                                                <span>{seatIndex}</span>
                                                                                            )}
                                                                                        </div>
                                                                                    ) : (
                                                                                        <Ban size={14} strokeWidth={3} />
                                                                                    )}

                                                                                    {isActive && !zoneId && viewMode !== 'ZONE_EDIT' && <div className="absolute inset-0 bg-current opacity-0 group-hover/seat:opacity-10 transition-opacity" />}
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
                            Values: {config.benchMode === 'ALTERNATING' ? 'Split-Bench Logic Enabled' : 'Standard Logic'} • Zones Loaded: {zones.length}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
