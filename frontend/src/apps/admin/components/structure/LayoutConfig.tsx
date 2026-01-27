import React, { useState, useEffect } from 'react';
import { Select, SelectItem, Input, Button, Card, CardBody, CardHeader, Divider } from '@heroui/react';
import { Armchair, Save, RotateCcw, MonitorPlay, AlertTriangle, Grid3X3 } from 'lucide-react';
import { structureService } from '../../services/structureService';
import { Block, Floor, Room } from '../../types/collegeStructure';
import { toast } from '../../../../utils/toast';

interface LayoutConfigProps {
    readOnly?: boolean;
}

export const LayoutConfig: React.FC<LayoutConfigProps> = ({ readOnly = false }) => {
    // Selection state
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

    // --- Loading Data ---

    useEffect(() => {
        loadBlocks();
    }, []);

    useEffect(() => {
        if (selectedBlockId) {
            loadFloors(Number(selectedBlockId));
            setSelectedFloorId("");
            setRooms([]);
        }
    }, [selectedBlockId]);

    useEffect(() => {
        if (selectedFloorId) {
            loadRooms(Number(selectedFloorId));
            setSelectedRoomId("");
        } else {
            setRooms([]);
        }
    }, [selectedFloorId]);

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
                setInitialConfig(newConfig); // Store initial to enable "Reset" if dirty
            }
        } else {
            setConfig({ rows: 0, benchesPerRow: 0, seatsPerBench: 0 });
            setInitialConfig(null);
        }
    }, [selectedRoomId, rooms]);

    const loadBlocks = async () => {
        const data = await structureService.getBlocks();
        setBlocks(data);
        if (data.length > 0 && !selectedBlockId) setSelectedBlockId(data[0].BlockID.toString());
    };

    const loadFloors = async (blockId: number) => {
        const data = await structureService.getFloors(blockId);
        setFloors(data);
    };

    const loadRooms = async (floorId: number) => {
        const data = await structureService.getRooms(floorId);
        setRooms(data);
    };

    // --- Actions ---

    const handleSave = async () => {
        if (!selectedRoomId) return;

        // Validation logic
        if (config.rows <= 0 || config.benchesPerRow <= 0 || config.seatsPerBench <= 0) {
            toast.error("All layout parameters must be greater than zero.");
            return;
        }

        const room = rooms.find(r => r.RoomID === Number(selectedRoomId));
        if (!room) return;

        setLoading(true);
        try {
            await structureService.updateRoomLayout(Number(selectedRoomId), {
                ...room, // Preserve name, status etc.
                TotalRows: config.rows,
                BenchesPerRow: config.benchesPerRow,
                SeatsPerBench: config.seatsPerBench
            });
            toast.success("Seating layout updated successfully");
            setInitialConfig(config); // Update snapshot
            // Refresh room data to be safe
            loadRooms(Number(selectedFloorId));
        } catch (error: any) {
            toast.error("Failed to save layout");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        if (initialConfig) {
            setConfig(initialConfig);
            toast.success("Layout reset to last saved state");
        }
    };

    // --- Render Logic ---

    const totalSeats = config.rows * config.benchesPerRow * config.seatsPerBench;
    const isDirty = initialConfig && (
        config.rows !== initialConfig.rows ||
        config.benchesPerRow !== initialConfig.benchesPerRow ||
        config.seatsPerBench !== initialConfig.seatsPerBench
    );

    return (
        <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[600px]">
            {/* Left Panel: Configuration */}
            <div className="w-full xl:w-1/3 flex flex-col gap-6">
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="flex gap-3 bg-slate-50 border-b border-slate-100 p-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm text-slate-600">
                            <MonitorPlay size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Layout Configuration</h3>
                            <p className="text-xs text-slate-500">Select a room and define its grid</p>
                        </div>
                    </CardHeader>
                    <CardBody className="p-6 flex flex-col gap-5">
                        {/* Selectors */}
                        <div className="grid grid-cols-2 gap-3">
                            <Select
                                label="Block"
                                variant="bordered"
                                size="sm"
                                selectedKeys={selectedBlockId ? [selectedBlockId] : []}
                                onSelectionChange={(k) => setSelectedBlockId(Array.from(k)[0] as string)}
                            >
                                {blocks.map(b => <SelectItem key={b.BlockID}>{b.BlockName}</SelectItem>)}
                            </Select>
                            <Select
                                label="Floor"
                                variant="bordered"
                                size="sm"
                                isDisabled={!selectedBlockId}
                                selectedKeys={selectedFloorId ? [selectedFloorId] : []}
                                onSelectionChange={(k) => setSelectedFloorId(Array.from(k)[0] as string)}
                            >
                                {floors.map(f => <SelectItem key={f.FloorID}>{`Floor ${f.FloorNumber}`}</SelectItem>)}
                            </Select>
                        </div>
                        <Select
                            label="Target Room"
                            variant="bordered"
                            color="primary"
                            isDisabled={!selectedFloorId}
                            selectedKeys={selectedRoomId ? [selectedRoomId] : []}
                            onSelectionChange={(k) => setSelectedRoomId(Array.from(k)[0] as string)}
                            startContent={<Armchair size={16} className="text-slate-500" />}
                        >
                            {rooms.map(r => <SelectItem key={r.RoomID}>{r.RoomCode || r.RoomName || `Room ${r.RoomID}`}</SelectItem>)}
                        </Select>

                        <Divider className="my-2" />

                        {/* Dimensions Inputs */}
                        {!selectedRoomId ? (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                Select a room to configure layout
                            </div>
                        ) : (
                            <div className={`flex flex-col gap-4 ${readOnly ? 'opacity-80 pointer-events-none' : ''}`}>
                                <Input
                                    type="number"
                                    label="Rows per Room"
                                    placeholder="e.g. 5"
                                    value={config.rows.toString()}
                                    onValueChange={(v) => setConfig({ ...config, rows: Number(v) })}
                                    endContent={<div className="text-xs text-slate-400 font-mono">ROWS</div>}
                                    variant="bordered"
                                    min={1}
                                />
                                <Input
                                    type="number"
                                    label="Benches per Row"
                                    placeholder="e.g. 4"
                                    value={config.benchesPerRow.toString()}
                                    onValueChange={(v) => setConfig({ ...config, benchesPerRow: Number(v) })}
                                    endContent={<div className="text-xs text-slate-400 font-mono">COLS</div>}
                                    variant="bordered"
                                    min={1}
                                />
                                <Input
                                    type="number"
                                    label="Seats per Bench"
                                    placeholder="e.g. 2"
                                    value={config.seatsPerBench.toString()}
                                    onValueChange={(v) => setConfig({ ...config, seatsPerBench: Number(v) })}
                                    endContent={<div className="text-xs text-slate-400 font-mono">SEATS</div>}
                                    variant="bordered"
                                    description="Usually 2 students per bench"
                                    min={1}
                                />

                                {/* Total Summary */}
                                <div className="mt-2 bg-slate-100/50 p-4 rounded-xl border border-dashed border-slate-300 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-slate-600">Total Capacity</span>
                                    <span className="text-2xl font-black text-blue-600 tracking-tight">{totalSeats}</span>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!readOnly && selectedRoomId && (
                            <div className="flex gap-3 justify-end mt-2 animate-in fade-in slide-in-from-bottom-2">
                                <Button
                                    variant="flat"
                                    color="danger"
                                    isDisabled={!isDirty || loading}
                                    onPress={handleReset}
                                    startContent={<RotateCcw size={16} />}
                                >
                                    Reset
                                </Button>
                                <Button
                                    color="primary"
                                    isLoading={loading}
                                    isDisabled={!isDirty || totalSeats === 0}
                                    onPress={handleSave}
                                    startContent={<Save size={18} />}
                                    className="font-semibold shadow-lg shadow-blue-500/20"
                                >
                                    Save Layout
                                </Button>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Info Card */}
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-800 text-sm">
                    <AlertTriangle className="shrink-0 text-blue-500" size={20} />
                    <p className="leading-relaxed opacity-90">
                        Changing the layout will <strong>regenerate all seat numbers</strong> (e.g., A1-L, A1-R).
                        This will impact any existing seating allocations for this room.
                        Proceed with caution during active exam cycles.
                    </p>
                </div>
            </div>

            {/* Right Panel: Preview */}
            <div className="w-full xl:w-2/3 h-full min-h-[500px] flex flex-col">
                <div className="bg-slate-900 rounded-t-2xl p-4 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-white font-medium tracking-wide">Live Preview</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-white/10 rounded-sm border border-white/20" />
                            <span>Empty Bench</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-emerald-500/20 rounded-sm border border-emerald-500/50" />
                            <span>Valid Seat</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-slate-950 rounded-b-2xl p-8 overflow-auto border border-slate-800 shadow-inner relative">
                    {/* Blackboard Area */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-slate-700 rounded-b-lg shadow-[0_0_15px_rgba(255,255,255,0.1)] mb-8" />
                    <div className="flex justify-center mb-8">
                        <span className="text-slate-600 text-xs uppercase tracking-[0.2em] font-medium">Front of Room (Blackboard)</span>
                    </div>

                    {!selectedRoomId || totalSeats === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
                            <Grid3X3 size={48} strokeWidth={1} />
                            <p>Configure rows and benches to generate preview</p>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col gap-6 items-center pb-12">
                            {/* Render Rows */}
                            {Array.from({ length: config.rows }).map((_, rIndex) => (
                                <div key={rIndex} className="flex gap-4 items-center animate-in zoom-in duration-300" style={{ animationDelay: `${rIndex * 50}ms` }}>
                                    {/* Row Label */}
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold font-mono border border-slate-700 shadow-lg">
                                        {String.fromCharCode(65 + rIndex)}
                                    </div>

                                    {/* Benches in Row */}
                                    <div className="flex gap-4 md:gap-8 p-3 bg-slate-900/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                        {Array.from({ length: config.benchesPerRow }).map((_, bIndex) => (
                                            <div key={bIndex} className="flex gap-1 p-1.5 bg-slate-800 rounded-lg shadow-inner">
                                                {/* Seats in Bench */}
                                                {Array.from({ length: config.seatsPerBench }).map((_, sIndex) => (
                                                    <div key={sIndex} className="w-6 h-6 md:w-8 md:h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] md:text-xs text-emerald-400/80 font-mono hover:bg-emerald-500/20 transition-all cursor-default">
                                                        {sIndex + 1}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
