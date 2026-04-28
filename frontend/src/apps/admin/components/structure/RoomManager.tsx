import React, { useEffect, useState, useRef } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Select, SelectItem, Checkbox, Tooltip, Autocomplete, AutocompleteItem } from '@heroui/react';
import { Plus, Edit, Ban, DoorOpen, Search, Building2, Layers, AlertCircle, AlertTriangle, CheckSquare, Copy, ChevronLeft, ChevronRight, FileSpreadsheet, UploadCloud, Download, CheckCircle2, Trash2 } from 'lucide-react';  
import { structureService } from '../../services/structureService';
import * as XLSX from 'xlsx';
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
    const [statusFilter, setStatusFilter] = useState("Active");  // Default to Active as per requirement
    const [limit] = useState(10);

    // --- Modal State ---
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    // Form Data (Single)
    const [singleData, setSingleData] = useState({
        roomCode: '',
        TotalCapacity: 40,
        OverrideCap: null as number | null,
        examUsable: true
    });

    // Form Data (Bulk)
    const [bulkData, setBulkData] = useState({
        prefix: 'LH',
        startNumber: 101,
        count: 5,
        TotalCapacity: 40
    });

    // --- Action Confirm Modal State ---
    const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
    const [confirmAction, setConfirmAction] = useState<{type: 'delete' | 'disable' | 'enable', roomId: number} | null>(null);

    // --- Data Loading ---

    useEffect(() => {
        loadBlocks();
    }, []);

    useEffect(() => {
        if (selectedBlockId && selectedBlockId !== "all") {
            loadFloors(Number(selectedBlockId));
        } else {
            setFloors([]);
        }
        setSelectedFloorId("");
    }, [selectedBlockId]);

    useEffect(() => {
        loadRooms(
            selectedBlockId && selectedBlockId !== "all" ? Number(selectedBlockId) : undefined, 
            selectedFloorId && selectedFloorId !== "all" ? Number(selectedFloorId) : undefined, 
            page, 
            searchQuery, 
            statusFilter
        );
    }, [selectedFloorId, selectedBlockId, page, searchQuery, statusFilter]);

    const loadBlocks = async () => {
        try {
            // Fetching blocks with a high limit for the selector, or just first page
            const response = await structureService.getBlocks({ limit: 100 });
            const data = response && response.data ? response.data : (Array.isArray(response) ? response : []);
            setBlocks(data);
            // Do not pre-select block so we show all rooms
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

    const loadRooms = async (blockId?: number, floorId?: number, currentPage = 1, search = "", status = "all") => {
        setLoading(true);
        try {
            const params: any = {
                page: currentPage,
                limit,
            };
            if (floorId) params.floorId = floorId;
            if (blockId) params.blockId = blockId;
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
                TotalCapacity: room.TotalCapacity || (room.TotalRows * room.BenchesPerRow * room.SeatsPerBench) || 0,
                OverrideCap: room.OverrideCap ?? null,
                examUsable: room.ExamUsable
            });
            setIsBulkMode(false);
        } else {
            // Create Mode
            setEditingRoom(null);
            setSingleData({ roomCode: '', TotalCapacity: 40, OverrideCap: null, examUsable: true });
            setBulkData({ prefix: 'LH', startNumber: 101, count: 5, TotalCapacity: 40 });
            setIsBulkMode(false);
        }
        onOpen();
    };

    const openConfirmModal = (type: 'delete' | 'disable' | 'enable', roomId: number) => {
        setConfirmAction({ type, roomId });
        onConfirmOpen();
    };

    const executeConfirmAction = async () => {
        if (!confirmAction) return;
        try {
            setLoading(true);
            if (confirmAction.type === 'delete') {
                await structureService.deleteRoom(confirmAction.roomId);
                toast.success("Room deleted successfully");
            } else if (confirmAction.type === 'disable') {
                await structureService.disableRoom(confirmAction.roomId);
                toast.success("Room disabled successfully");
            } else if (confirmAction.type === 'enable') {
                await structureService.enableRoom(confirmAction.roomId);
                toast.success("Room enabled successfully");
            }
            loadRooms(Number(selectedBlockId), Number(selectedFloorId), page, searchQuery, statusFilter);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        } finally {
            setLoading(false);
            onConfirmClose();
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
    type BulkModeType = 'auto' | 'list' | 'manual' | 'excel';
    const [bulkModeType, setBulkModeType] = useState<BulkModeType>('auto');
    const [listInput, setListInput] = useState(""); // For 'list' mode: "101, 102, 104"
    const [manualRooms, setManualRooms] = useState<{ code: string; TotalCapacity: number }[]>([
        { code: "", TotalCapacity: 60 }
    ]);
    const [excelRooms, setExcelRooms] = useState<{ code: string; TotalCapacity: number }[]>([]);
    const [previewRooms, setPreviewRooms] = useState<{ code: string; TotalCapacity: number }[]>([]);
    const excelInputRef = useRef<HTMLInputElement>(null);

    // --- Preview Generator ---
    useEffect(() => {
        if (!isOpen) return;
        if (!isBulkMode) {
            setPreviewRooms([]);
            return;
        }

        let generated: { code: string; TotalCapacity: number }[] = [];

        if (bulkModeType === 'auto') {
            for (let i = 0; i < bulkData.count; i++) {
                generated.push({
                    code: `${bulkData.prefix}-${bulkData.startNumber + i}`,
                    TotalCapacity: bulkData.TotalCapacity
                });
            }
        } else if (bulkModeType === 'list') {
            const numbers = listInput.split(',').map(s => s.trim()).filter(s => s);
            generated = numbers.map(num => ({
                code: `${bulkData.prefix}-${num}`,
                TotalCapacity: bulkData.TotalCapacity
            }));
        } else if (bulkModeType === 'manual') {
            generated = manualRooms.filter(r => r.code).map(r => ({
                code: r.code.startsWith(bulkData.prefix) ? r.code : `${bulkData.prefix}-${r.code}`,
                TotalCapacity: r.TotalCapacity
            }));
        } else if (bulkModeType === 'excel') {
            generated = excelRooms.filter(r => r.code).map(r => ({
                code: r.code.toString(),
                TotalCapacity: Number(r.TotalCapacity)
            }));
        }
        setPreviewRooms(generated);
    }, [bulkModeType, bulkData, listInput, manualRooms, excelRooms, isBulkMode, isOpen]);

    const handleManualRowChange = (index: number, field: 'code' | 'capacity', value: string | number) => {
        const newRows = [...manualRooms];
        newRows[index] = { ...newRows[index], [field]: value };
        setManualRooms(newRows);
    };

    const addManualRow = () => {
        setManualRooms([...manualRooms, { code: "", TotalCapacity: 60 }]);
    };

    const removeManualRow = (index: number) => {
        const newRows = manualRooms.filter((_, i) => i !== index);
        setManualRooms(newRows);
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json<any>(ws);

            const parsedRooms: { code: string; TotalCapacity: number }[] = [];
            data.forEach((row, idx) => {
                const code = row.code || row.Code || row.RoomCode || row.roomCode || row.RoomName || row.Name;
                const cap = row.TotalCapacity || row.Capacity || row.Cap || row.Seats;
                
                if (code) {
                    parsedRooms.push({
                        code: code.toString().trim(),
                        TotalCapacity: Number(cap) || 0
                    });
                }
            });

            if (parsedRooms.length === 0) {
                toast.error("No valid room data found in Excel. Need 'RoomCode' and 'Capacity' columns.");
                return;
            }

            setExcelRooms(parsedRooms);
            toast.success(`Loaded ${parsedRooms.length} rooms from Excel`);
        } catch (err: any) {
            toast.error("Failed to parse Excel: " + err.message);
        }
        if (excelInputRef.current) excelInputRef.current.value = '';
    };

    const handleSubmit = async (onClose: () => void) => {
        try {
            if (isBulkMode && !editingRoom) {
                // Validate Context for Bulk Create
                if (!selectedBlockId || selectedBlockId === "all" || !selectedFloorId || selectedFloorId === "all") {
                    toast.error("Please select a specific Block and Floor for bulk creation");
                    return;
                }

                // Validate Preview
                if (previewRooms.length === 0) {
                    toast.error("No valid rooms to create");
                    return;
                }

                // Construct Payload from Preview
                const roomsPayload = previewRooms.map(r => ({
                    roomCode: r.code,
                    TotalCapacity: r.TotalCapacity
                }));

                await structureService.bulkCreateRooms({
                    blockId: Number(selectedBlockId),
                    floorId: Number(selectedFloorId),
                    rooms: roomsPayload
                });
                toast.success(`${roomsPayload.length} rooms created successfully`);

            } else {
                // SINGLE CREATE / UPDATE
                if (!singleData.roomCode || !singleData.roomCode.trim()) {
                    toast.error("Room Code is required");
                    return;
                }
                if (singleData.TotalCapacity <= 0) {
                    toast.error("Capacity must be greater than 0");
                    return;
                }

                if (editingRoom) {
                    // Update doesn't strictly need block/floor context if we have RoomID
                    await structureService.updateRoom(editingRoom.RoomID, {
                        RoomCode: singleData.roomCode,
                        TotalCapacity: singleData.TotalCapacity,
                        OverrideCap: singleData.OverrideCap,
                        ExamUsable: singleData.examUsable
                    });
                    toast.success("Room updated");
                } else {
                    // SINGLE CREATE needs context
                    if (!selectedBlockId || selectedBlockId === "all" || !selectedFloorId || selectedFloorId === "all") {
                        toast.error("Please select a specific Block and Floor to add a room");
                        return;
                    }

                    await structureService.createRoom({
                        BlockID: Number(selectedBlockId),
                        FloorID: Number(selectedFloorId),
                        RoomCode: singleData.roomCode,
                        TotalCapacity: singleData.TotalCapacity,
                        OverrideCap: singleData.OverrideCap,
                        ExamUsable: singleData.examUsable,
                        Status: 'Active'
                    });
                    toast.success("Room created");
                }
            }
            // Refresh
            const bId = (selectedBlockId && selectedBlockId !== 'all') ? Number(selectedBlockId) : undefined;
            const fId = (selectedFloorId && selectedFloorId !== 'all') ? Number(selectedFloorId) : undefined;
            loadRooms(bId, fId, page, searchQuery, statusFilter);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };


    // Helper for Status Badge
    const StatusBadge = ({ status }: { status: string }) => {
        const isActive = status === 'Active';
        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}></span>
                {status}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Top Filter Section */}
            <div className="flex-none p-1 rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-sm relative overflow-visible z-20">
                <div className="bg-white/50 backdrop-blur-xl rounded-[20px] p-5 flex flex-col md:flex-row gap-6 justify-between items-end">

                    {/* Visual Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10" />

                    <div className="flex flex-col md:flex-row gap-5 w-full md:w-auto flex-1 z-10">
                        {/* Block Selector */}
                        <div className="flex flex-col gap-2 w-full md:w-72">
                            <div className="flex items-center gap-1.5 ml-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                <Building2 size={12} strokeWidth={2.5} /> Building Block
                            </div>
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
                                        input: "text-base font-semibold text-slate-700 placeholder:text-slate-400 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                        inputWrapper: "bg-white h-[52px] rounded-xl border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 group-data-[focus=true]:shadow-md shadow-sm transition-all duration-200"
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
                                {[
                                    <AutocompleteItem
                                        key="all"
                                        textValue="All Building Blocks"
                                        startContent={<Building2 size={18} className="text-slate-300 group-data-[hover=true]:text-blue-400" />}
                                    >
                                        All Building Blocks
                                    </AutocompleteItem>,
                                    ...(blocks || []).map((b) => (
                                        <AutocompleteItem
                                            key={b.BlockID.toString()}
                                            textValue={b.BlockName}
                                            description={`${b.floorCount || 0} floors configured`}
                                            startContent={<Building2 size={18} className="text-slate-300 group-data-[hover=true]:text-blue-400" />}
                                        >
                                            {b.BlockName}
                                        </AutocompleteItem>
                                    ))
                                ]}
                            </Autocomplete>
                        </div>

                        {/* Floor Selector */}
                        <div className="flex flex-col gap-2 w-full md:w-72">
                            <div className={`flex items-center gap-1.5 ml-1 text-[11px] font-bold uppercase tracking-widest ${(!selectedBlockId || selectedBlockId === 'all') ? 'text-slate-300' : 'text-slate-400'}`}>
                                <Layers size={12} strokeWidth={2.5} /> Floor Level
                            </div>
                            <Autocomplete
                                id="room-floor-select"
                                name="floor-select"
                                aria-label="Select Floor"
                                placeholder="Select floor..."
                                isDisabled={!selectedBlockId || selectedBlockId === "all"}
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
                                        input: "text-base font-semibold text-slate-700 placeholder:text-slate-400 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                        inputWrapper: `h-[52px] rounded-xl border-1 transition-all duration-200 ${(!selectedBlockId || selectedBlockId === 'all') ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-white border-slate-200 hover:border-blue-400 group-data-[focus=true]:border-blue-600 group-data-[focus=true]:shadow-md shadow-sm'}`
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
                                {[
                                    <AutocompleteItem
                                        key="all"
                                        textValue="All Floors"
                                        startContent={<Layers size={18} className="text-slate-300 group-data-[hover=true]:text-indigo-400" />}
                                    >
                                        All Floors
                                    </AutocompleteItem>,
                                    ...(floors || []).map((f) => (
                                        <AutocompleteItem
                                            key={f.FloorID.toString()}
                                            textValue={`Floor ${f.FloorNumber}`}
                                            startContent={<Layers size={18} className="text-slate-300 group-data-[hover=true]:text-indigo-400" />}
                                        >
                                            {`Floor ${f.FloorNumber}`}
                                        </AutocompleteItem>
                                    ))
                                ]}
                            </Autocomplete>
                        </div>
                    </div>

                    {!readOnly && (
                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto z-10">
                            <Tooltip content={(!selectedBlockId || selectedBlockId === 'all' || !selectedFloorId || selectedFloorId === 'all') ? "Select a block and floor to add rooms" : ""}>
                                <div>
                                    <Button
                                        onPress={() => handleOpen()}
                                        color="primary"
                                        size="lg"
                                        isDisabled={!selectedBlockId || selectedBlockId === 'all' || !selectedFloorId || selectedFloorId === 'all'}
                                        startContent={<Plus size={20} strokeWidth={2.5} />}
                                        className="font-bold shadow-lg shadow-blue-600/20 rounded-xl h-[52px] px-8 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] transition-transform"
                                    >
                                        Add Room
                                    </Button>
                                </div>
                            </Tooltip>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination & Filter Info */}
            <div className="flex-none flex flex-col md:flex-row justify-between items-center gap-4 px-2">
                <div className="flex items-center gap-4 w-full md:w-auto flex-1">
                        <Input
                            id="rooms-search"
                            name="rooms-search"
                            placeholder="Search rooms..."
                            aria-label="Search rooms"
                            size="sm"
                            startContent={<Search size={18} className="text-slate-400 mr-2" />}
                            className="max-w-xs"
                            variant="bordered"
                            value={searchQuery}
                            onValueChange={(v) => { setSearchQuery(v); setPage(1); }}
                            classNames={{
                                inputWrapper: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 shadow-sm rounded-xl h-11 transition-all",
                                input: "bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
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
                                trigger: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 data-[focus=true]:border-blue-600 shadow-sm rounded-xl h-11 transition-all",
                                selectorIcon: "right-3"
                            }}
                            popoverProps={{
                                classNames: {
                                    base: "before:bg-white",
                                    content: "bg-white p-1 border border-slate-100 shadow-xl rounded-xl"
                                }
                            }}
                            listboxProps={{
                                itemClasses: {
                                    base: "rounded-lg data-[hover=true]:bg-blue-50 data-[hover=true]:text-blue-600 px-3 py-2 transition-colors",
                                    title: "font-medium text-slate-700"
                                }
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

            {/* Content Area */}
            <div className="flex-1 min-h-0 relative">
                {/* Table */}
                    <Table isHeaderSticky aria-label="Rooms table" classNames={{ base: "h-full", wrapper: "bg-white shadow-sm border border-slate-200 rounded-3xl p-0 h-full overflow-auto custom-scrollbar", th: "bg-slate-50/50 text-slate-500 font-bold text-[11px] uppercase tracking-wider py-4 px-6 border-b border-slate-100", td: "py-4 px-6 border-b border-slate-50 group-last:border-0", tr: "hover:bg-blue-50/30 transition-colors cursor-default" }}>
                        <TableHeader columns={columns}>{(column) => <TableColumn key={column.uid} align={column.uid === "actions" ? "end" : (["status", "usable", "capacity"].includes(column.uid) ? "center" : "start")}>{column.name}</TableColumn>}</TableHeader>
                        <TableBody items={rooms} isLoading={loading} emptyContent={<div className="py-12 flex flex-col items-center text-center"><Search className="text-slate-300 mb-3" size={32} /><p className="text-slate-500 font-medium">No rooms found.</p></div>}>
                            {(room) => (
                                <TableRow key={room.RoomID}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center"><DoorOpen size={20} /></div>
                                            <div><p className="font-bold text-slate-700 text-base">{room.RoomCode || room.RoomName}</p><p className="text-xs text-slate-400 font-mono">ID: {room.RoomID}</p></div>
                                        </div>
                                    </TableCell>
                                    <TableCell><span className="font-bold text-slate-700">{room.TotalCapacity}</span></TableCell>
                                    <TableCell><Chip size="sm" variant="flat" color={room.ExamUsable ? "success" : "default"} startContent={room.ExamUsable ? <CheckSquare size={14} /> : undefined} classNames={{ content: "font-semibold" }}>{room.ExamUsable ? "Yes" : "No"}</Chip></TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            <StatusBadge status={room.Status} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {!readOnly && (
                                            <div className="flex items-center justify-end gap-2">
                                                <Tooltip content="Edit Room">
                                                    <Button isIconOnly size="sm" variant="light" onPress={() => handleOpen(room)}>
                                                        <Edit size={18} className="text-slate-400 hover:text-blue-600" />
                                                    </Button>
                                                </Tooltip>
                                                {room.Status === 'Active' ? (
                                                    <Tooltip content="Disable Room">
                                                        <Button isIconOnly size="sm" variant="light" color="warning" onPress={() => openConfirmModal('disable', room.RoomID)}>
                                                            <Ban size={18} className="text-slate-400 hover:text-warning-600" />
                                                        </Button>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip content="Enable Room">
                                                        <Button isIconOnly size="sm" variant="light" color="success" onPress={() => openConfirmModal('enable', room.RoomID)}>
                                                            <CheckCircle2 size={18} className="text-slate-400 hover:text-success-600" />
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                                <Tooltip content="Delete Room">
                                                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => openConfirmModal('delete', room.RoomID)}>
                                                        <Trash2 size={18} className="text-slate-400 hover:text-danger-600" />
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
            </div>

            {/* Floating Pagination */}
            {totalPages > 1 && (
                <div className="flex-none flex justify-center pb-2">
                    <div className="flex items-center gap-4 p-2 pl-6 pr-2 bg-white border border-slate-200 rounded-full shadow-xl shadow-slate-200/50">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
                            Page {page} of {totalPages}
                        </span>

                        <div className="flex items-center gap-1">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                isDisabled={page === 1}
                                onPress={() => setPage(page - 1)}
                                className="rounded-full w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600"
                            >
                                <ChevronLeft size={16} />
                            </Button>

                            <div className="flex gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((p) => (
                                    <Button
                                        key={p}
                                        isIconOnly
                                        size="sm"
                                        variant={page === p ? "solid" : "light"}
                                        color={page === p ? "primary" : "default"}
                                        onPress={() => setPage(p)}
                                        className={`w-8 h-8 rounded-full font-bold text-xs transition-all ${page === p ? 'shadow-md shadow-blue-500/30 bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        {p}
                                    </Button>
                                ))}
                                {totalPages > 5 && <span className="flex items-center justify-center w-8 text-slate-400">...</span>}
                            </div>

                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                isDisabled={page === totalPages}
                                onPress={() => setPage(page + 1)}
                                className="rounded-full w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-600"
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
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
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {/* Mode Selectors */}
                                        {[
                                            { id: 'auto', label: 'Auto Sequence', desc: 'Generate continuous range', icon: Layers },
                                            { id: 'list', label: 'Custom List', desc: 'Paste specific numbers', icon: CheckSquare },
                                            { id: 'manual', label: 'Manual Entry', desc: 'Full control per row', icon: Edit },
                                            { id: 'excel', label: 'Excel Import', desc: 'Upload .xlsx array', icon: FileSpreadsheet }
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
                                            <div className="text-sm font-semibold text-slate-700 ml-1 mb-1.5">Room Code</div>
                                            <Input id="modal-room-code" name="roomCode" autoFocus aria-label="Room Code" placeholder="e.g. LH-201" variant="bordered" classNames={{ inputWrapper: "h-12 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl shadow-sm px-4 transition-all", input: "text-base font-medium text-slate-800 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0" }} value={singleData.roomCode} onValueChange={(v) => setSingleData({ ...singleData, roomCode: v })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="text-sm font-semibold text-slate-700 ml-1 mb-1.5">Capacity</div>
                                                <Input id="modal-room-capacity" name="capacity" type="number" aria-label="Capacity" placeholder="60" variant="bordered" classNames={{ inputWrapper: "h-12 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl shadow-sm px-4 transition-all", input: "text-base font-medium text-slate-800 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0" }} value={singleData.TotalCapacity.toString()} onValueChange={(v) => setSingleData({ ...singleData, TotalCapacity: Number(v) })} />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <div className="text-sm font-semibold text-slate-700 ml-1 mb-1.5">Override Cap <span className="text-[10px] font-normal text-slate-400 ml-1">(Optional)</span></div>
                                                <Input id="modal-room-override" name="overrideCap" type="number" aria-label="Override Capacity" placeholder="e.g. 30" variant="bordered" classNames={{ inputWrapper: "h-12 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl shadow-sm px-4 transition-all", input: "text-base font-medium text-slate-800 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0" }} value={singleData.OverrideCap === null ? "" : singleData.OverrideCap.toString()} onValueChange={(v) => setSingleData({ ...singleData, OverrideCap: v === "" ? null : Number(v) })} />
                                            </div>
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
                                            {/* Common Prefix & Capacity */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5">Prefix</div>
                                                    <Input
                                                        id="bulk-room-prefix"
                                                        name="prefix"
                                                        placeholder="LH"
                                                        aria-label="Room Prefix"
                                                        variant="bordered"
                                                        classNames={{
                                                            inputWrapper: "h-10 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-lg",
                                                            input: "font-mono font-bold bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                                                        }}
                                                        value={bulkData.prefix}
                                                        onValueChange={(v) => setBulkData({ ...bulkData, prefix: v })}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1.5">Default Cap</div>
                                                    <Input
                                                        id="bulk-room-capacity"
                                                        name="bulkCapacity"
                                                        type="number"
                                                        aria-label="Default Capacity"
                                                        placeholder="60"
                                                        variant="bordered"
                                                        classNames={{
                                                            inputWrapper: "h-10 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-lg",
                                                            input: "font-mono font-bold bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                                                        }}
                                                        value={bulkData.TotalCapacity.toString()}
                                                        onValueChange={(v) => setBulkData({ ...bulkData, TotalCapacity: Number(v) })}
                                                    />
                                                </div>
                                            </div>

                                            {/* Mode Specific Inputs */}
                                            {bulkModeType === 'auto' && (
                                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="text-sm font-semibold text-slate-700 mb-1.5">Start Number</div>
                                                        <Input
                                                            id="bulk-start-number"
                                                            name="startNumber"
                                                            type="number"
                                                            aria-label="Start Number"
                                                            placeholder="101"
                                                            variant="bordered"
                                                            classNames={{
                                                                inputWrapper: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-lg transition-all",
                                                                input: "bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                                                            }}
                                                            value={bulkData.startNumber.toString()}
                                                            onValueChange={(v) => setBulkData({ ...bulkData, startNumber: Number(v) })}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="text-sm font-semibold text-slate-700 mb-1.5">Count (How many?)</div>
                                                        <Input
                                                            id="bulk-room-count"
                                                            name="count"
                                                            type="number"
                                                            aria-label="Room Count"
                                                            placeholder="5"
                                                            variant="bordered"
                                                            classNames={{
                                                                inputWrapper: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-lg transition-all",
                                                                input: "bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                                                            }}
                                                            value={bulkData.count.toString()}
                                                            onValueChange={(v) => setBulkData({ ...bulkData, count: Number(v) })}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {bulkModeType === 'list' && (
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="text-sm font-semibold text-slate-700 flex justify-between mb-1.5">
                                                        Room Numbers
                                                        <span className="text-xs font-normal text-slate-500">Comma separated</span>
                                                    </div>
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
                                                            <Input name="custom-input"  size="sm" aria-label="Room Code" placeholder="101" variant="bordered" classNames={{ inputWrapper: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 transition-all", input: "bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0" }} value={row.code} onValueChange={(v) => handleManualRowChange(idx, 'code', v)} />
                                                            <Input name="custom-input"  type="number" aria-label="Room Capacity" size="sm" placeholder="Cap" variant="bordered" classNames={{ base: "w-24", inputWrapper: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 transition-all", input: "bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0" }} value={row.TotalCapacity.toString()} onValueChange={(v) => handleManualRowChange(idx, 'capacity', Number(v))} />
                                                            <button onClick={() => removeManualRow(idx)} className="text-slate-400 hover:text-red-500"><Ban size={16} /></button>
                                                        </div>
                                                    ))}
                                                    <Button size="sm" variant="flat" fullWidth onPress={addManualRow} startContent={<Plus size={16} />}>Add Row</Button>
                                                </div>
                                            )}

                                            {bulkModeType === 'excel' && (
                                                <div className="flex flex-col gap-4">
                                                    <div 
                                                        className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                                                        onClick={() => excelInputRef.current?.click()}
                                                    >
                                                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                                                            <UploadCloud size={24} className="text-blue-500" />
                                                        </div>
                                                        <h3 className="text-sm font-bold text-slate-700">Upload .xlsx File</h3>
                                                        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">Requires 'RoomCode' and 'Capacity' columns.</p>
                                                        <input 
                                                            type="file"
                                                            ref={excelInputRef}
                                                            className="hidden"
                                                            accept=".csv, .xlsx"
                                                            onChange={handleExcelUpload}
                                                        />
                                                    </div>
                                                    {excelRooms.length > 0 && (
                                                        <div className="text-sm font-medium text-emerald-600 flex justify-between items-center bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-200">
                                                            <span>Loaded {excelRooms.length} rows successfully</span>
                                                            <Button size="sm" color="danger" variant="light" isIconOnly onPress={() => setExcelRooms([])}><Ban size={16}/></Button>
                                                        </div>
                                                    )}
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
                                                                <span className="w-16 text-right text-blue-300">{r.TotalCapacity}</span>
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
                            <ModalFooter className="border-t border-slate-100 px-8 py-6 bg-slate-50/50">
                                <Button 
                                    onPress={onClose} 
                                    variant="flat" 
                                    className="font-bold text-slate-500 hover:bg-slate-200 transition-colors rounded-xl px-6"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    onPress={() => handleSubmit(onClose)} 
                                    isDisabled={loading || (isBulkMode && previewRooms.length === 0)}
                                    className="font-bold shadow-lg shadow-blue-500/25 rounded-xl h-11 px-8 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    isLoading={loading}
                                >
                                    {editingRoom ? "Update Room" : (isBulkMode ? `Create ${previewRooms.length} Rooms` : "Create Room")}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
            {/* Confirmation Modal */}
            <Modal isOpen={isConfirmOpen} onClose={onConfirmClose} size="md" backdrop="blur" classNames={{
                base: confirmAction?.type === 'delete' ? 'border-danger-200' : confirmAction?.type === 'disable' ? 'border-warning-200' : 'border-success-200'
            }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1 pb-2">
                                <h2 className={`text-xl font-bold tracking-tight ${
                                    confirmAction?.type === 'delete' ? 'text-danger-600' : 
                                    confirmAction?.type === 'disable' ? 'text-warning-600' : 
                                    'text-success-600'
                                }`}>
                                    Confirm {confirmAction?.type === 'delete' ? 'Delete' : confirmAction?.type === 'disable' ? 'Disable' : 'Enable'} Room
                                </h2>
                            </ModalHeader>
                            <ModalBody className="py-4">
                                <form>
                                    <div className="flex gap-4 items-start">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                            confirmAction?.type === 'delete' ? 'bg-danger-100 text-danger-600' : 
                                            confirmAction?.type === 'disable' ? 'bg-warning-100 text-warning-600' : 
                                            'bg-success-100 text-success-600'
                                        }`}>
                                            {confirmAction?.type === 'delete' ? <Trash2 size={20} /> : confirmAction?.type === 'disable' ? <Ban size={20} /> : <CheckCircle2 size={20} />}
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-slate-700 font-medium">
                                                Are you sure you want to {confirmAction?.type} this room?
                                            </p>
                                            <p className="text-slate-500 text-sm mt-1">
                                                {confirmAction?.type === 'delete' 
                                                    ? 'This action cannot be undone and will permanently remove the room.' 
                                                    : confirmAction?.type === 'disable'
                                                        ? 'This will prevent the room from being used in future exam allocations.'
                                                        : 'This will make the room available for future exam allocations.'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Hidden submit button to allow Enter key to work */}
                                    <button type="submit" className="hidden" onClick={(e) => {
                                        e.preventDefault();
                                        executeConfirmAction();
                                    }} />
                                </form>
                            </ModalBody>
                            <ModalFooter className="border-t border-slate-100 mt-2">
                                <Button variant="flat" color="default" onPress={onClose} className="font-semibold text-slate-600">
                                    Cancel
                                </Button>
                                <Button 
                                    color={confirmAction?.type === 'delete' ? 'danger' : confirmAction?.type === 'disable' ? 'warning' : 'success'} 
                                    onPress={executeConfirmAction} 
                                    className="font-bold shadow-sm"
                                    isLoading={loading}
                                >
                                    Yes, {confirmAction?.type === 'delete' ? 'Delete Room' : confirmAction?.type === 'disable' ? 'Disable Room' : 'Enable Room'}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};




