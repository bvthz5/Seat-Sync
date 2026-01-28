import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Select, SelectItem, Checkbox, Tooltip, Autocomplete, AutocompleteItem } from '@heroui/react';
import { Plus, Edit, Ban, DoorOpen, Search, Building2, Layers, AlertCircle, AlertTriangle, CheckSquare, Copy } from 'lucide-react';
import { structureService } from '../../services/structureService';
import { Block, Floor, Room } from '../../types/collegeStructure';
import { toast } from '../../../../utils/toast';

interface RoomManagerProps {
    readOnly?: boolean;
}

export const RoomManager: React.FC<RoomManagerProps> = ({ readOnly = false }) => {
    // --- Data State ---
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [floors, setFloors] = useState<Floor[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(false);

    // --- Selection State ---
    const [selectedBlockId, setSelectedBlockId] = useState<string>("");
    const [selectedFloorId, setSelectedFloorId] = useState<string>("");

    // --- Pagination & Filter State ---
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [limit] = useState(10);

    // --- Modal State ---
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    // Form Data (Single)
    const [singleData, setSingleData] = useState({
        roomCode: '',
        capacity: 0,
        examUsable: true
    });

    // Form Data (Bulk)
    const [bulkData, setBulkData] = useState({
        prefix: 'LH',
        startNumber: 101,
        count: 5,
        capacity: 40
    });

    // --- Data Loading ---

    useEffect(() => {
        loadBlocks();
    }, []);

    useEffect(() => {
        if (selectedBlockId) {
            loadFloors(Number(selectedBlockId));
            setFloors([]);
            setSelectedFloorId("");
            setRooms([]);
        }
    }, [selectedBlockId]);

    useEffect(() => {
        if (selectedFloorId && selectedBlockId) {
            loadRooms(Number(selectedBlockId), Number(selectedFloorId), page, searchQuery, statusFilter);
        } else {
            setRooms([]);
        }
    }, [selectedFloorId, selectedBlockId, page, searchQuery, statusFilter]);

    const loadBlocks = async () => {
        try {
            // Fetching blocks with a high limit for the selector, or just first page
            const response = await structureService.getBlocks({ limit: 100 });
            const data = response && response.data ? response.data : (Array.isArray(response) ? response : []);
            setBlocks(data);
            if (data.length > 0 && !selectedBlockId) setSelectedBlockId(data[0].BlockID.toString());
        } catch (e) {
            console.error("Failed to load blocks", e);
        }
    };

    const loadFloors = async (blockId: number) => {
        try {
            const response = await structureService.getFloors({ blockId, limit: 100 });
            const data = response && response.data ? response.data : (Array.isArray(response) ? response : []);
            setFloors(data);
        } catch (e) {
            console.error("Failed to load floors", e);
        }
    };

    const loadRooms = async (blockId: number, floorId: number, currentPage = 1, search = "", status = "all") => {
        setLoading(true);
        try {
            const params: any = {
                floorId,
                blockId,
                page: currentPage,
                limit,
            };
            if (search) params.search = search;
            if (status !== "all") params.status = status;

            const response = await structureService.getRooms(params);
            if (response && response.data && Array.isArray(response.data)) {
                setRooms(response.data);
                setTotalPages(response.pages || 1);
                setTotalItems(response.total || response.data.length);
            } else if (Array.isArray(response)) {
                setRooms(response);
                setTotalPages(1);
                setTotalItems(response.length);
            } else {
                setRooms([]);
                setTotalPages(1);
                setTotalItems(0);
            }
        } catch (e) {
            toast.error("Failed to load rooms");
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers ---

    const handleOpen = (room?: Room) => {
        if (readOnly) return;
        if (room) {
            // Edit Mode
            setEditingRoom(room);
            setSingleData({
                roomCode: room.RoomCode || room.RoomName || '',
                capacity: room.Capacity || (room.TotalRows * room.BenchesPerRow * room.SeatsPerBench) || 0,
                examUsable: room.ExamUsable
            });
            setIsBulkMode(false);
        } else {
            // Create Mode
            setEditingRoom(null);
            setSingleData({ roomCode: '', capacity: 40, examUsable: true });
            setBulkData({ prefix: 'LH', startNumber: 101, count: 5, capacity: 40 });
            setIsBulkMode(false);
        }
        onOpen();
    };

    const handleDisable = async (id: number) => {
        if (readOnly) return;
        if (!confirm("Are you sure you want to disable this room? It will be hidden from new allocations.")) return;

        try {
            await structureService.disableRoom(id);
            toast.success("Room disabled successfully");
            loadRooms(Number(selectedBlockId), Number(selectedFloorId), page, searchQuery, statusFilter);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };



    // --- Columns ---
    const columns = [
        { name: "ROOM CODE", uid: "code" },
        { name: "CAPACITY", uid: "capacity" },
        { name: "EXAM READY", uid: "usable" },
        { name: "STATUS", uid: "status" },
        { name: "ACTIONS", uid: "actions" },
    ];

    // --- Advanced Bulk State ---
    type BulkModeType = 'auto' | 'list' | 'manual';
    const [bulkModeType, setBulkModeType] = useState<BulkModeType>('auto');
    const [listInput, setListInput] = useState(""); // For 'list' mode: "101, 102, 104"
    const [manualRooms, setManualRooms] = useState<{ code: string; capacity: number }[]>([
        { code: "", capacity: 60 }
    ]);
    const [previewRooms, setPreviewRooms] = useState<{ code: string; capacity: number }[]>([]);

    // --- Preview Generator ---
    useEffect(() => {
        if (!isOpen) return;
        if (!isBulkMode) {
            setPreviewRooms([]);
            return;
        }

        let generated: { code: string; capacity: number }[] = [];

        if (bulkModeType === 'auto') {
            for (let i = 0; i < bulkData.count; i++) {
                generated.push({
                    code: `${bulkData.prefix}-${bulkData.startNumber + i}`,
                    capacity: bulkData.capacity
                });
            }
        } else if (bulkModeType === 'list') {
            const numbers = listInput.split(',').map(s => s.trim()).filter(s => s);
            generated = numbers.map(num => ({
                code: `${bulkData.prefix}-${num}`,
                capacity: bulkData.capacity
            }));
        } else if (bulkModeType === 'manual') {
            generated = manualRooms.filter(r => r.code).map(r => ({
                code: r.code.startsWith(bulkData.prefix) ? r.code : `${bulkData.prefix}-${r.code}`,
                capacity: r.capacity
            }));
        }
        setPreviewRooms(generated);
    }, [bulkModeType, bulkData, listInput, manualRooms, isBulkMode, isOpen]);

    const handleManualRowChange = (index: number, field: 'code' | 'capacity', value: string | number) => {
        const newRows = [...manualRooms];
        newRows[index] = { ...newRows[index], [field]: value };
        setManualRooms(newRows);
    };

    const addManualRow = () => {
        setManualRooms([...manualRooms, { code: "", capacity: 60 }]);
    };

    const removeManualRow = (index: number) => {
        const newRows = manualRooms.filter((_, i) => i !== index);
        setManualRooms(newRows);
    };

    const handleSubmit = async (onClose: () => void) => {
        if (!selectedBlockId || !selectedFloorId) {
            toast.error("Location context missing");
            return;
        }

        try {
            if (isBulkMode && !editingRoom) {
                // Validate Preview
                if (previewRooms.length === 0) {
                    toast.error("No valid rooms to create");
                    return;
                }

                // Construct Payload from Preview
                const roomsPayload = previewRooms.map(r => ({
                    roomCode: r.code,
                    capacity: r.capacity
                }));

                await structureService.bulkCreateRooms({
                    blockId: Number(selectedBlockId),
                    floorId: Number(selectedFloorId),
                    rooms: roomsPayload
                });
                toast.success(`${roomsPayload.length} rooms created successfully`);

            } else {
                // SINGLE CREATE / UPDATE
                if (editingRoom) {
                    await structureService.updateRoom(editingRoom.RoomID, {
                        RoomCode: singleData.roomCode,
                        Capacity: singleData.capacity,
                        ExamUsable: singleData.examUsable
                    });
                    toast.success("Room updated");
                } else {
                    await structureService.createRoom({
                        BlockID: Number(selectedBlockId),
                        FloorID: Number(selectedFloorId),
                        RoomCode: singleData.roomCode,
                        Capacity: singleData.capacity,
                        ExamUsable: singleData.examUsable,
                        Status: 'Active'
                    });
                    toast.success("Room created");
                }
            }
            // Refresh
            loadRooms(Number(selectedBlockId), Number(selectedFloorId), page, searchQuery, statusFilter);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };


    return (
        <div className="flex flex-col gap-6">
            {/* Top Filter Section */}
            <div className="p-1 rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-sm relative overflow-visible z-20">
                <div className="bg-white/50 backdrop-blur-xl rounded-[20px] p-5 flex flex-col md:flex-row gap-6 justify-between items-end">

                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10" />

                    <div className="flex flex-col md:flex-row gap-5 w-full md:w-auto flex-1 z-10">
                        {/* Block Selector */}
                        <div className="flex flex-col gap-2 w-full md:w-72">
                            <label htmlFor="room-block-select-input" className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                                <Building2 size={12} strokeWidth={2.5} /> Building Block
                            </label>
                            <Autocomplete
                                id="room-block-select"
                                name="block-select"
                                aria-label="Select Block"
                                placeholder="Select building..."
                                variant="bordered"
                                selectedKey={selectedBlockId}
                                onSelectionChange={(key) => setSelectedBlockId(key ? key.toString() : "")}
                                classNames={{
                                    base: "max-w-full",
                                    selectorButton: "text-slate-400 hover:text-blue-600 transition-colors"
                                }}
                                inputProps={{
                                    id: "room-block-select-input",
                                    name: "block-select",
                                    classNames: {
                                        input: "text-base font-semibold text-slate-700 placeholder:text-slate-400",
                                        inputWrapper: "bg-white h-[52px] rounded-xl border-1 border-slate-200 data-[hover=true]:border-blue-300 group-data-[focus=true]:border-blue-500 group-data-[focus=true]:shadow-md shadow-sm transition-all duration-200"
                                    }
                                }}
                                listboxProps={{
                                    itemClasses: {
                                        base: "rounded-lg data-[hover=true]:bg-blue-50 data-[hover=true]:text-blue-600 px-3 py-2.5 transition-colors mb-0.5",
                                        title: "font-bold text-slate-700",
                                        description: "text-xs font-medium text-slate-400"
                                    }
                                }}
                                popoverProps={{
                                    offset: 10,
                                    classNames: {
                                        content: "bg-white p-1.5 border border-slate-100 shadow-2xl rounded-2xl min-w-[300px]"
                                    }
                                }}
                            >
                                {(blocks || []).map((b) => (
                                    <AutocompleteItem
                                        key={b.BlockID}
                                        textValue={b.BlockName}
                                        description={`${b.floorCount || 0} floors configured`}
                                        startContent={<Building2 size={18} className="text-slate-300 group-data-[hover=true]:text-blue-400" />}
                                    >
                                        {b.BlockName}
                                    </AutocompleteItem>
                                ))}
                            </Autocomplete>
                        </div>

                        {/* Floor Selector */}
                        <div className="flex flex-col gap-2 w-full md:w-72">
                            <label htmlFor="room-floor-select-input" className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 ml-1 ${!selectedBlockId ? 'text-slate-300' : 'text-slate-400'}`}>
                                <Layers size={12} strokeWidth={2.5} /> Floor Level
                            </label>
                            <Autocomplete
                                id="room-floor-select"
                                name="floor-select"
                                aria-label="Select Floor"
                                placeholder="Select floor..."
                                isDisabled={!selectedBlockId}
                                variant="bordered"
                                selectedKey={selectedFloorId}
                                onSelectionChange={(key) => setSelectedFloorId(key ? key.toString() : "")}
                                classNames={{
                                    base: "max-w-full",
                                    selectorButton: "text-slate-400 hover:text-blue-600 transition-colors"
                                }}
                                inputProps={{
                                    id: "room-floor-select-input",
                                    name: "floor-select",
                                    classNames: {
                                        input: "text-base font-semibold text-slate-700 placeholder:text-slate-400",
                                        inputWrapper: `h-[52px] rounded-xl border-1 transition-all duration-200 ${!selectedBlockId ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white border-slate-200 hover:border-blue-300 group-data-[focus=true]:border-blue-500 group-data-[focus=true]:shadow-md shadow-sm'}`
                                    }
                                }}
                                listboxProps={{
                                    itemClasses: {
                                        base: "rounded-lg data-[hover=true]:bg-indigo-50 data-[hover=true]:text-indigo-600 px-3 py-2.5 transition-colors mb-0.5",
                                        title: "font-bold text-slate-700",
                                    }
                                }}
                                popoverProps={{
                                    offset: 10,
                                    classNames: {
                                        content: "bg-white p-1.5 border border-slate-100 shadow-2xl rounded-2xl min-w-[240px]"
                                    }
                                }}
                            >
                                {(floors || []).map((f) => (
                                    <AutocompleteItem
                                        key={f.FloorID}
                                        textValue={`Floor ${f.FloorNumber}`}
                                        startContent={<Layers size={18} className="text-slate-300 group-data-[hover=true]:text-indigo-400" />}
                                    >
                                        {`Floor ${f.FloorNumber}`}
                                    </AutocompleteItem>
                                ))}
                            </Autocomplete>
                        </div>
                    </div>

                    {!readOnly && selectedFloorId && (
                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto z-10">
                            <Button
                                onPress={() => handleOpen()}
                                color="primary"
                                size="lg"
                                startContent={<Plus size={20} strokeWidth={2.5} />}
                                className="font-bold shadow-lg shadow-blue-600/20 rounded-xl h-[52px] px-8 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] transition-transform"
                            >
                                Add Room
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination & Filter Info */}
            {selectedFloorId && (
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                    <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                        <Input
                            id="rooms-search"
                            name="rooms-search"
                            placeholder="Search rooms..."
                            aria-label="Search rooms"
                            size="sm"
                            startContent={<Search size={18} className="text-slate-400" />}
                            className="max-w-xs"
                            variant="bordered"
                            value={searchQuery}
                            onValueChange={(v) => { setSearchQuery(v); setPage(1); }}
                            classNames={{
                                inputWrapper: "bg-white border-slate-200 shadow-sm rounded-xl h-11"
                            }}
                        />
                        <Select
                            id="rooms-status-filter"
                            name="rooms-status-filter"
                            placeholder="All Status"
                            aria-label="Filter rooms by status"
                            size="sm"
                            className="max-w-[150px]"
                            variant="bordered"
                            selectedKeys={[statusFilter]}
                            onSelectionChange={(keys) => { setStatusFilter(Array.from(keys)[0] as string); setPage(1); }}
                            classNames={{
                                trigger: "bg-white border-slate-200 shadow-sm rounded-xl h-11"
                            }}
                        >
                            <SelectItem key="all" textValue="All Status">All Status</SelectItem>
                            <SelectItem key="Active" textValue="Active">Active</SelectItem>
                            <SelectItem key="Inactive" textValue="Inactive">Inactive</SelectItem>
                        </Select>
                    </div>
                    <div className="text-sm font-medium text-slate-500">
                        Showing <span className="text-slate-900 font-bold">{(rooms?.length || 0) === 0 ? 0 : (page - 1) * limit + 1}</span> - <span className="text-slate-900 font-bold">{Math.min(page * limit, totalItems)}</span> of <span className="text-slate-900 font-bold">{totalItems}</span>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {!selectedFloorId ? (
                <div className="flex flex-col items-center justify-center py-24 bg-gradient-to-b from-white to-slate-50/50 rounded-3xl border border-dashed border-slate-300 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-100 mb-6 ring-4 ring-slate-50 z-10 group-hover:scale-105 transition-transform duration-300">
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                            <Building2 size={32} strokeWidth={1.5} />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2 z-10">Select Location Context</h3>
                    <p className="text-slate-500 max-w-sm text-center font-medium px-4 z-10">
                        Choose a <span className="text-blue-600 font-bold">Building Block</span> and <span className="text-indigo-600 font-bold">Floor Level</span> above to begin managing rooms.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <Table aria-label="Rooms table" classNames={{ wrapper: "bg-white shadow-sm border border-slate-200 rounded-2xl p-0 overflow-hidden", th: "bg-slate-50 text-slate-600 font-bold text-xs py-4 px-6 border-b border-slate-200 uppercase tracking-wider", td: "py-4 px-6 border-b border-slate-100 group-last:border-0", tr: "hover:bg-slate-50/80 transition-colors cursor-default" }}>
                        <TableHeader columns={columns}>{(column) => <TableColumn key={column.uid} align={column.uid === "actions" ? "end" : "start"}>{column.name}</TableColumn>}</TableHeader>
                        <TableBody items={rooms} isLoading={loading} emptyContent={<div className="py-12 flex flex-col items-center text-center"><Search className="text-slate-300 mb-3" size={32} /><p className="text-slate-500 font-medium">No rooms found.</p></div>}>
                            {(room) => (
                                <TableRow key={room.RoomID}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><DoorOpen size={20} /></div>
                                            <div><p className="font-bold text-slate-700 text-base">{room.RoomCode || room.RoomName}</p><p className="text-xs text-slate-400 font-mono">ID: {room.RoomID}</p></div>
                                        </div>
                                    </TableCell>
                                    <TableCell><span className="font-bold text-slate-700">{room.Capacity}</span></TableCell>
                                    <TableCell><Chip size="sm" variant="flat" color={room.ExamUsable ? "success" : "default"} startContent={room.ExamUsable ? <CheckSquare size={14} /> : undefined} classNames={{ content: "font-semibold" }}>{room.ExamUsable ? "Yes" : "No"}</Chip></TableCell>
                                    <TableCell><Chip size="sm" variant="dot" color={room.Status === 'Active' ? "success" : "danger"}>{room.Status}</Chip></TableCell>
                                    <TableCell>{!readOnly && (<div className="flex justify-end gap-2"><Tooltip content="Edit Room"><Button isIconOnly size="sm" variant="light" onPress={() => handleOpen(room)}><Edit size={18} className="text-slate-400 hover:text-blue-600" /></Button></Tooltip><Tooltip content="Disable Room"><Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDisable(room.RoomID)}><Ban size={18} className="text-slate-400 hover:text-red-600" /></Button></Tooltip></div>)}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Table Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="flat"
                                    isDisabled={page === 1}
                                    onPress={() => setPage(page - 1)}
                                    className="rounded-lg font-bold"
                                >
                                    Previous
                                </Button>
                                <div className="flex gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                        <Button
                                            key={p}
                                            size="sm"
                                            variant={page === p ? "solid" : "light"}
                                            color={page === p ? "primary" : "default"}
                                            onPress={() => setPage(p)}
                                            className={`w-8 h-8 min-w-0 rounded-lg font-bold transition-all ${page === p ? 'shadow-md shadow-blue-500/20' : ''}`}
                                        >
                                            {p}
                                        </Button>
                                    ))}
                                </div>
                                <Button
                                    size="sm"
                                    variant="flat"
                                    isDisabled={page === totalPages}
                                    onPress={() => setPage(page + 1)}
                                    className="rounded-lg font-bold"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" backdrop="blur" scrollBehavior="inside">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 border-b border-slate-100 px-8 py-6">
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{editingRoom ? "Edit Room Details" : "Add New Rooms"}</h2>
                                <p className="text-sm text-slate-500 font-normal">{editingRoom ? "Update capacity for this room." : "Configure advanced room generation options."}</p>
                            </ModalHeader>
                            <ModalBody className="px-8 py-8 gap-8">
                                {!editingRoom && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {/* Mode Selectors */}
                                        {[
                                            { id: 'auto', label: 'Auto Sequence', desc: 'Generate continuous range', icon: Layers },
                                            { id: 'list', label: 'Custom List', desc: 'Paste specific numbers', icon: CheckSquare },
                                            { id: 'manual', label: 'Manual Entry', desc: 'Full control per row', icon: Edit }
                                        ].map((m) => (
                                            <div
                                                key={m.id}
                                                onClick={() => { setIsBulkMode(true); setBulkModeType(m.id as any); }}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isBulkMode && bulkModeType === m.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-200'}`}
                                            >
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`p-2 rounded-lg ${isBulkMode && bulkModeType === m.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        <m.icon size={18} />
                                                    </div>
                                                    <span className={`font-bold ${isBulkMode && bulkModeType === m.id ? 'text-blue-700' : 'text-slate-700'}`}>{m.label}</span>
                                                </div>
                                                <p className="text-xs text-slate-500">{m.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!isBulkMode ? (
                                    // Single Room Form
                                    <div className="space-y-6 max-w-lg mx-auto w-full">
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="modal-room-code" className="text-sm font-semibold text-slate-700 ml-1">Room Code</label>
                                            <Input id="modal-room-code" name="roomCode" autoFocus aria-label="Room Code" placeholder="e.g. LH-201" variant="bordered" classNames={{ inputWrapper: "h-12 bg-white border-1 border-slate-300 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-500 rounded-xl shadow-sm px-4 transition-all", input: "text-base font-medium text-slate-800" }} value={singleData.roomCode} onValueChange={(v) => setSingleData({ ...singleData, roomCode: v })} />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="modal-room-capacity" className="text-sm font-semibold text-slate-700 ml-1">Capacity</label>
                                            <Input id="modal-room-capacity" name="capacity" type="number" aria-label="Capacity" placeholder="60" variant="bordered" classNames={{ inputWrapper: "h-12 bg-white border-1 border-slate-300 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-500 rounded-xl shadow-sm px-4 transition-all", input: "text-base font-medium text-slate-800" }} value={singleData.capacity.toString()} onValueChange={(v) => setSingleData({ ...singleData, capacity: Number(v) })} />
                                        </div>
                                        <div className="flex flex-col gap-3 pt-2">
                                            <span className="text-sm font-semibold text-slate-700 ml-1">Exam Compatibility</span>
                                            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                                                <button type="button" onClick={() => setSingleData({ ...singleData, examUsable: true })} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${singleData.examUsable ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Exam Ready</button>
                                                <button type="button" onClick={() => setSingleData({ ...singleData, examUsable: false })} className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${!singleData.examUsable ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>Not Suitable</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // Bulk Modes
                                    <div className="flex flex-col lg:flex-row gap-8">
                                        {/* Left: Check Controls */}
                                        <div className="flex-1 space-y-6">
                                            {/* Common Prefix & Capacity */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <label htmlFor="bulk-room-prefix" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Prefix</label>
                                                    <Input id="bulk-room-prefix" name="prefix" placeholder="LH" aria-label="Room Prefix" variant="bordered" classNames={{ inputWrapper: "h-10 bg-white border-slate-300 rounded-lg", input: "font-mono font-bold" }} value={bulkData.prefix} onValueChange={(v) => setBulkData({ ...bulkData, prefix: v })} />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <label htmlFor="bulk-room-capacity" className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Default Cap</label>
                                                    <Input id="bulk-room-capacity" name="bulkCapacity" type="number" aria-label="Default Capacity" placeholder="60" variant="bordered" classNames={{ inputWrapper: "h-10 bg-white border-slate-300 rounded-lg", input: "font-mono font-bold" }} value={bulkData.capacity.toString()} onValueChange={(v) => setBulkData({ ...bulkData, capacity: Number(v) })} />
                                                </div>
                                            </div>

                                            {/* Mode Specific Inputs */}
                                            {bulkModeType === 'auto' && (
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label htmlFor="bulk-start-number" className="text-sm font-semibold text-slate-700">Start Number</label>
                                                        <Input id="bulk-start-number" name="startNumber" type="number" aria-label="Start Number" placeholder="101" variant="bordered" classNames={{ inputWrapper: "bg-white border-slate-300 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-500 rounded-lg transition-all" }} value={bulkData.startNumber.toString()} onValueChange={(v) => setBulkData({ ...bulkData, startNumber: Number(v) })} />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <label htmlFor="bulk-room-count" className="text-sm font-semibold text-slate-700">Count (How many?)</label>
                                                        <Input id="bulk-room-count" name="count" type="number" aria-label="Room Count" placeholder="5" variant="bordered" classNames={{ inputWrapper: "bg-white border-slate-300 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-500 rounded-lg transition-all" }} value={bulkData.count.toString()} onValueChange={(v) => setBulkData({ ...bulkData, count: Number(v) })} />
                                                    </div>
                                                </div>
                                            )}

                                            {bulkModeType === 'list' && (
                                                <div className="flex flex-col gap-1.5">
                                                    <label htmlFor="bulk-room-list" className="text-sm font-semibold text-slate-700 flex justify-between">
                                                        Room Numbers
                                                        <span className="text-xs font-normal text-slate-500">Comma separated</span>
                                                    </label>
                                                    <textarea
                                                        id="bulk-room-list"
                                                        name="roomList"
                                                        className="w-full h-32 p-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono text-sm resize-none"
                                                        placeholder="101, 102, 105, 108"
                                                        value={listInput}
                                                        onChange={(e) => setListInput(e.target.value)}
                                                    />
                                                </div>
                                            )}

                                            {bulkModeType === 'manual' && (
                                                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {manualRooms.map((row, idx) => (
                                                        <div key={idx} className="flex gap-2 items-center">
                                                            <div className="w-8 text-xs text-slate-400 font-mono text-center">{idx + 1}</div>
                                                            <Input size="sm" aria-label="Room Code" placeholder="101" variant="bordered" classNames={{ inputWrapper: "bg-white border-slate-300 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-500 transition-all" }} value={row.code} onValueChange={(v) => handleManualRowChange(idx, 'code', v)} />
                                                            <Input type="number" aria-label="Room Capacity" size="sm" placeholder="Cap" variant="bordered" classNames={{ base: "w-24", inputWrapper: "bg-white border-slate-300 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-500 transition-all" }} value={row.capacity.toString()} onValueChange={(v) => handleManualRowChange(idx, 'capacity', Number(v))} />
                                                            <button onClick={() => removeManualRow(idx)} className="text-slate-400 hover:text-red-500"><Ban size={16} /></button>
                                                        </div>
                                                    ))}
                                                    <Button size="sm" variant="flat" fullWidth onPress={addManualRow} startContent={<Plus size={16} />}>Add Row</Button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right: Preview Terminal */}
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Preview</span>
                                                <Chip size="sm" color={previewRooms.length > 0 ? "success" : "default"} variant="flat" className="h-6 gap-1 font-mono text-xs">
                                                    {previewRooms.length} Rooms
                                                </Chip>
                                            </div>
                                            <div className="flex-1 bg-slate-900 rounded-2xl p-4 shadow-inner ring-4 ring-slate-100 overflow-hidden flex flex-col">
                                                <div className="flex items-center gap-2 mb-3 text-slate-500 text-xs border-b border-slate-800 pb-2 font-mono">
                                                    <div className="w-8">#</div>
                                                    <div className="flex-1">CODE</div>
                                                    <div className="w-16 text-right">CAP</div>
                                                </div>
                                                <div className="overflow-y-auto flex-1 custom-scrollbar space-y-1">
                                                    {previewRooms.length > 0 ? (
                                                        previewRooms.map((r, i) => (
                                                            <div key={i} className="flex items-center gap-2 font-mono text-sm group hover:bg-slate-800/50 rounded px-1 transition-colors">
                                                                <span className="w-8 text-slate-600 text-xs select-none">{String(i + 1).padStart(2, '0')}</span>
                                                                <span className="flex-1 text-emerald-400 font-semibold">{r.code}</span>
                                                                <span className="w-16 text-right text-blue-300">{r.capacity}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs text-center p-4">
                                                            <Search size={24} className="mb-2 opacity-50" />
                                                            Configure settings to generate preview
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter className="border-t border-slate-100 px-8 py-6">
                                <Button color="danger" variant="light" onPress={onClose} className="font-semibold text-slate-500">Cancel</Button>
                                <Button color="primary" className="font-bold shadow-lg shadow-blue-500/20 rounded-xl h-11 px-6 text-white" onPress={() => handleSubmit(onClose)} isDisabled={loading || (isBulkMode && previewRooms.length === 0)}>
                                    {editingRoom ? "Update Room" : (isBulkMode ? `Create ${previewRooms.length} Rooms` : "Create Room")}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};
