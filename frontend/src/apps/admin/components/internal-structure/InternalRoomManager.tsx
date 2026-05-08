import React, { useEffect, useState, useRef } from 'react';
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Input, Chip, Autocomplete, AutocompleteItem, Tabs, Tab, Skeleton, Divider,
    Select, SelectItem, Tooltip
} from '@heroui/react';
import {
    Plus, Edit, Trash2, DoorOpen, Search, ChevronLeft, ChevronRight,
    List, Hash, AlignJustify, FileSpreadsheet, Power, PowerOff,
    Building2, BookOpen, Microscope, Presentation, UserCog, AlertCircle, ShieldAlert, CircleCheck
} from 'lucide-react';
import { InternalConfirmationModal } from './InternalConfirmationModal';
import { internalStructureService, InternalBlock, InternalFloor, InternalRoom } from '../../services/internalStructureService';
import { toast } from '../../../../utils/toast';
import * as XLSX from 'xlsx';

interface Props { readOnly?: boolean }

type CreateMode = 'auto' | 'custom' | 'manual' | 'excel';

const ROOM_TYPES = [
    { value: 'Classroom', icon: <BookOpen size={14} /> },
    { value: 'Drawing Hall', icon: <Presentation size={14} /> },
    { value: 'Lab', icon: <Microscope size={14} /> },
    { value: 'Minor Room', icon: <UserCog size={14} /> },
    { value: 'Seminar Hall', icon: <Building2 size={14} /> }
];

export const InternalRoomManager: React.FC<Props> = ({ readOnly = false }) => {
    const [rooms, setRooms] = useState<InternalRoom[]>([]);
    const [blocks, setBlocks] = useState<InternalBlock[]>([]);
    const [floors, setFloors] = useState<InternalFloor[]>([]);
    const [loading, setLoading] = useState(true);
    
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const deleteModal = useDisclosure();
    const disableModal = useDisclosure();
    
    const [editing, setEditing] = useState<InternalRoom | null>(null);
    const [targetRoom, setTargetRoom] = useState<InternalRoom | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [blockFilter, setBlockFilter] = useState('');
    const [floorFilter, setFloorFilter] = useState('');
    const limit = 10;

    // Create form state
    const [createMode, setCreateMode] = useState<CreateMode>('auto');
    const [selBlock, setSelBlock] = useState('');
    const [selFloor, setSelFloor] = useState('');
    const [prefix, setPrefix] = useState('NB ');
    const [startNum, setStartNum] = useState('101');
    const [count, setCount] = useState('5');
    const [capacity, setCapacity] = useState('');
    const [seatsPerBench, setSeatsPerBench] = useState(2);
    const [roomType, setRoomType] = useState('Classroom');
    const [seatMode, setSeatMode] = useState('Dual');
    const [customList, setCustomList] = useState('');
    const [manualRows, setManualRows] = useState([{ code: '', capacity: '' }]);
    const [excelRooms, setExcelRooms] = useState<{ roomCode: string; TotalCapacity: number }[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({ 
        RoomCode: '', 
        TotalCapacity: '', 
        Status: 'Active' as 'Active' | 'Inactive', 
        ExamUsable: true, 
        SeatsPerBench: 2,
        RoomType: 'Classroom',
        SeatMode: 'Dual'
    });

    const fetchRooms = async (p = 1, s = '', b = '', f = '') => {
        setLoading(true);
        try {
            const params: any = { page: p, limit };
            if (s) params.search = s;
            if (b) params.blockId = Number(b);
            if (f) params.floorId = Number(f);
            const res = await internalStructureService.getRooms(params);
            setRooms(res.data || []);
            setTotalPages(res.pages || 1);
            setTotalItems(res.total || 0);
        } catch { toast.error('Failed to load rooms'); }
        finally { setLoading(false); }
    };

    const fetchBlocks = async () => {
        const res = await internalStructureService.getBlocks({ limit: 100 });
        setBlocks(res.data || []);
    };

    const fetchFloors = async (blockId: string) => {
        if (!blockId) { setFloors([]); return; }
        const res = await internalStructureService.getFloors({ blockId: Number(blockId), limit: 100 });
        setFloors(res.data || []);
    };

    useEffect(() => { fetchBlocks(); }, []);
    useEffect(() => { fetchRooms(page, search, blockFilter, floorFilter); }, [page, search, blockFilter, floorFilter]);

    const refresh = () => fetchRooms(page, search, blockFilter, floorFilter);

    const handleOpenCreate = () => {
        setEditing(null);
        setSelBlock(''); setSelFloor('');
        setCreateMode('auto');
        setPrefix('NB '); setStartNum('101'); setCount('5'); setCapacity('');
        setSeatsPerBench(2); setRoomType('Classroom'); setSeatMode('Dual');
        setCustomList('');
        setManualRows([{ code: '', capacity: '' }]);
        setExcelRooms([]);
        onOpen();
    };

    const handleOpenEdit = (room: InternalRoom) => {
        if (readOnly) return;
        setEditing(room);
        setEditForm({ 
            RoomCode: room.RoomCode, 
            TotalCapacity: String(room.TotalCapacity), 
            Status: room.Status, 
            ExamUsable: room.ExamUsable, 
            SeatsPerBench: room.SeatsPerBench,
            RoomType: room.RoomType || 'Classroom',
            SeatMode: room.SeatMode || 'Dual'
        });
        onOpen();
    };

    const handleCreate = async (onClose: () => void) => {
        if (!selBlock || !selFloor) { toast.error('Select block and floor'); return; }
        try {
            let roomsToCreate: any[] = [];

            if (createMode === 'auto') {
                if (!capacity) { toast.error('Please enter capacity'); return; }
                for (let i = 0; i < Number(count); i++) {
                    roomsToCreate.push({ 
                        roomCode: `${prefix}${Number(startNum) + i}`, 
                        TotalCapacity: Number(capacity),
                        RoomType: roomType,
                        SeatMode: seatMode,
                        SeatsPerBench: seatsPerBench
                    });
                }
            } else if (createMode === 'custom') {
                if (!capacity) { toast.error('Please enter capacity'); return; }
                const codes = customList.split(',').map(c => c.trim()).filter(Boolean);
                roomsToCreate = codes.map(c => ({ 
                    roomCode: `${prefix}${c}`, 
                    TotalCapacity: Number(capacity),
                    RoomType: roomType,
                    SeatMode: seatMode,
                    SeatsPerBench: seatsPerBench
                }));
            } else if (createMode === 'manual') {
                roomsToCreate = manualRows.filter(r => r.code.trim()).map(r => ({ 
                    roomCode: r.code.trim(), 
                    TotalCapacity: Number(r.capacity) || 0,
                    RoomType: roomType,
                    SeatMode: seatMode,
                    SeatsPerBench: seatsPerBench
                }));
            } else if (createMode === 'excel') {
                roomsToCreate = excelRooms.map(r => ({ ...r, RoomType: roomType, SeatMode: seatMode, SeatsPerBench: seatsPerBench }));
            }

            if (roomsToCreate.length === 0) { toast.error('No rooms to create'); return; }

            await internalStructureService.bulkCreateRooms({ blockId: Number(selBlock), floorId: Number(selFloor), rooms: roomsToCreate });
            toast.success(`${roomsToCreate.length} room(s) created with auto-layout`);
            refresh();
            onClose();
        } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to create rooms'); }
    };

    const handleEdit = async (onClose: () => void) => {
        if (!editing) return;
        try {
            await internalStructureService.updateRoom(editing.RoomID, {
                RoomCode: editForm.RoomCode,
                TotalCapacity: Number(editForm.TotalCapacity),
                Status: editForm.Status,
                ExamUsable: editForm.ExamUsable,
                SeatsPerBench: editForm.SeatsPerBench,
                RoomType: editForm.RoomType as any,
                SeatMode: editForm.SeatMode as any
            });
            toast.success('Room updated');
            refresh();
            onClose();
        } catch (e: any) { toast.error(e.response?.data?.message || 'Update failed'); }
    };

    const confirmToggle = (room: InternalRoom) => {
        if (room.Status === 'Active') {
            setTargetRoom(room);
            disableModal.onOpen();
        } else {
            handleToggle(room);
        }
    };

    const handleToggle = async (room: InternalRoom) => {
        try {
            if (room.Status === 'Active') await internalStructureService.disableRoom(room.RoomID);
            else await internalStructureService.enableRoom(room.RoomID);
            toast.success(`Room ${room.Status === 'Active' ? 'disabled' : 'enabled'}`);
            refresh();
            disableModal.onClose();
        } catch (e: any) { toast.error(e.response?.data?.message || 'Toggle failed'); }
    };

    const confirmDelete = (room: InternalRoom) => {
        setTargetRoom(room);
        deleteModal.onOpen();
    };

    const handleDelete = async () => {
        if (!targetRoom) return;
        try { 
            await internalStructureService.deleteRoom(targetRoom.RoomID); 
            toast.success('Room and all seats deleted permanently'); 
            refresh(); 
            deleteModal.onClose();
        }
        catch (e: any) { toast.error(e.response?.data?.message || 'Delete failed'); }
    };


    const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const wb = XLSX.read(ev.target?.result, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json<any>(ws);
            setExcelRooms(data.map((row: any) => ({
                roomCode: String(row.RoomCode || row.roomCode || row['Room Code'] || ''),
                TotalCapacity: Number(row.Capacity || row.TotalCapacity || row.capacity || 0),
            })).filter(r => r.roomCode));
            toast.success(`${data.length} rooms parsed from Excel`);
        };
        reader.readAsBinaryString(file);
    };

    const getRoomTypeIcon = (type: string) => {
        return ROOM_TYPES.find(t => t.value === type)?.icon || <BookOpen size={14} />;
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-600 text-white rounded-xl shadow-lg shadow-violet-200">
                        <DoorOpen size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Internal Rooms</h3>
                        <p className="text-slate-500 text-sm">{totalItems} rooms — intelligent auto-layout active</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                    <Input placeholder="Search rooms..." size="sm" variant="bordered"
                        startContent={<Search size={14} className="text-slate-400" />}
                        value={search} onValueChange={(v) => { setSearch(v); setPage(1); }}
                        classNames={{ inputWrapper: 'bg-white' }} className="w-44" />
                    <select value={blockFilter} onChange={(e) => { setBlockFilter(e.target.value); setFloorFilter(''); setPage(1); }}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                        <option value="">All Blocks</option>
                        {blocks.map(b => <option key={b.BlockID} value={String(b.BlockID)}>{b.BlockName}</option>)}
                    </select>
                    {blockFilter && (
                        <select value={floorFilter} onChange={(e) => { setFloorFilter(e.target.value); setPage(1); fetchFloors(blockFilter); }}
                            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                            <option value="">All Floors</option>
                            {floors.map(f => <option key={f.FloorID} value={String(f.FloorID)}>Floor {f.FloorNumber}</option>)}
                        </select>
                    )}
                    {!readOnly && (
                        <Button size="sm" startContent={<Plus size={16} />} onPress={handleOpenCreate}
                            className="bg-violet-600 text-white font-semibold shadow-sm shadow-violet-200">
                            Add Rooms
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <Table aria-label="Internal Rooms" removeWrapper classNames={{ th: 'bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider', td: 'py-2.5' }}>
                    <TableHeader>
                        <TableColumn key="room">Room</TableColumn>
                        <TableColumn key="location">Hierarchy</TableColumn>
                        <TableColumn key="capacity" align="center">Capacity</TableColumn>
                        <TableColumn key="seating" align="center">Seating</TableColumn>
                        <TableColumn key="status" align="center">Status</TableColumn>
                        <TableColumn key="actions" align="end">Actions</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={loading ? ' ' : 'No rooms found'}>
                        {rooms.map(r => (
                            <TableRow key={r.RoomID} className={`hover:bg-slate-50 transition-colors ${r.Status === 'Inactive' ? 'opacity-60' : ''}`}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shadow-sm">
                                            <DoorOpen size={16} className="text-violet-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 tracking-tight">
                                                {((r as any).InternalBlock?.BlockName || '')} {r.RoomCode}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border border-slate-200 shadow-sm">
                                            {(r as any).InternalBlock?.BlockName || '—'}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">
                                            Floor {(r as any).InternalFloor?.FloorNumber ?? '0'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-center">
                                        <span className="font-black text-slate-900 text-lg leading-none">{r.TotalCapacity}</span>
                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Total Seats</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-center">
                                        <Chip size="sm" variant="flat"
                                            className={r.SeatsPerBench === 2 ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-slate-100 text-slate-600'}>
                                            <span className="font-black text-[10px] uppercase tracking-widest">{r.SeatsPerBench === 2 ? 'Dual' : 'Single'}</span>
                                        </Chip>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-center">
                                        <Chip size="sm" variant="flat" color={r.Status === 'Active' ? 'success' : 'default'}
                                            classNames={{ base: r.Status === 'Active' ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100' }}>
                                            <span className="font-black text-[10px] uppercase tracking-widest">{r.Status}</span>
                                        </Chip>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {!readOnly && (
                                        <div className="flex justify-end gap-1">
                                            <Tooltip content="Edit Details"><Button isIconOnly size="sm" variant="light" className="hover:bg-violet-50" onPress={() => handleOpenEdit(r)}><Edit size={14} className="text-violet-600" /></Button></Tooltip>
                                            <Tooltip content={r.Status === 'Active' ? 'Disable Room' : 'Enable Room'}>
                                                <Button isIconOnly size="sm" variant="light" className="hover:bg-amber-50" color={r.Status === 'Active' ? 'warning' : 'success'} onPress={() => confirmToggle(r)}>
                                                    {r.Status === 'Active' ? <PowerOff size={14} /> : <Power size={14} />}
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content="Delete Permanently"><Button isIconOnly size="sm" variant="light" className="hover:bg-red-50 text-red-600" color="danger" onPress={() => confirmDelete(r)}><Trash2 size={14} /></Button></Tooltip>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {loading && <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>}
                {totalPages > 1 && (
                    <div className="px-10 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex gap-3">
                            <Button size="sm" variant="flat" className="font-bold bg-white border border-slate-200 px-6" isDisabled={page <= 1} onPress={() => setPage(p => p - 1)} startContent={<ChevronLeft size={14} />}>Previous</Button>
                            <Button size="sm" variant="flat" className="font-bold bg-white border border-slate-200 px-6" isDisabled={page >= totalPages} onPress={() => setPage(p => p + 1)} endContent={<ChevronRight size={14} />}>Next</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─ Create / Edit Modal ─ */}
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size={editing ? 'md' : 'xl'} backdrop="blur"
                classNames={{ backdrop: 'bg-slate-900/40 backdrop-blur-md', base: 'bg-white border border-slate-200 shadow-2xl rounded-[32px]' }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="text-slate-900 font-black px-10 pt-10 text-2xl tracking-tight">
                                {editing ? `Edit Room — ${editing.RoomCode}` : 'Create Internal Infrastructure'}
                            </ModalHeader>
                            <ModalBody className="gap-8 px-10 pb-10">
                                {editing ? (
                                    /* ─ Edit Form ─ */
                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Room Code</label>
                                            <Input placeholder="Enter code" value={editForm.RoomCode} onValueChange={(v) => setEditForm(f => ({ ...f, RoomCode: v }))} variant="bordered" classNames={{ inputWrapper: 'bg-slate-50/50 rounded-2xl h-12 border-slate-200' }} />
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Room Type</label>
                                                <Select variant="bordered" selectedKeys={[editForm.RoomType]} onSelectionChange={(k) => setEditForm(f => ({ ...f, RoomType: String(Array.from(k)[0]) }))} classNames={{ trigger: 'bg-slate-50/50 rounded-2xl h-12 border-slate-200' }}>
                                                    {ROOM_TYPES.map(t => <SelectItem key={t.value} startContent={t.icon}>{t.value}</SelectItem>)}
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Total Capacity</label>
                                                <Input placeholder="0" type="number" value={editForm.TotalCapacity} onValueChange={(v) => setEditForm(f => ({ ...f, TotalCapacity: v }))} variant="bordered" classNames={{ inputWrapper: 'bg-slate-50/50 rounded-2xl h-12 border-slate-200' }} />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2.5">
                                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Seating Mode</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[{ v: 1, l: 'Single Seating' }, { v: 2, l: 'Dual Seating' }].map(s => (
                                                    <button key={s.v} onClick={() => setEditForm(f => ({ ...f, SeatsPerBench: s.v, SeatMode: s.v === 2 ? 'Dual' : 'Single' }))}
                                                        className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${editForm.SeatsPerBench === s.v ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-white text-slate-500 border-slate-100 hover:border-violet-200'}`}>
                                                        {s.l}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/50 border border-slate-100">
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Exam Usable</span>
                                            <button onClick={() => setEditForm(f => ({ ...f, ExamUsable: !f.ExamUsable }))}
                                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${editForm.ExamUsable ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-slate-200 text-slate-600'}`}>
                                                {editForm.ExamUsable ? 'Available' : 'Disabled'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ─ Create Form ─ */
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Infrastructure Block</label>
                                                <Autocomplete placeholder="Select block..." variant="bordered"
                                                    selectedKey={selBlock}
                                                    onSelectionChange={(k) => { setSelBlock(String(k || '')); fetchFloors(String(k || '')); setSelFloor(''); }}
                                                    inputProps={{ classNames: { inputWrapper: 'bg-slate-50/50 rounded-2xl h-12 border-slate-200' } }}
                                                    listboxProps={{ classNames: { base: "p-2 rounded-2xl", list: "gap-1" } }}
                                                    popoverProps={{ classNames: { content: "rounded-2xl border border-slate-100 shadow-2xl bg-white/90 backdrop-blur-xl" } }}
                                                >
                                                    {blocks.map(b => <AutocompleteItem key={b.BlockID} className="rounded-xl font-bold text-slate-700">{b.BlockName}</AutocompleteItem>)}
                                                </Autocomplete>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Level / Floor</label>
                                                <Autocomplete placeholder="Default: Ground" variant="bordered"
                                                    isDisabled={!selBlock} selectedKey={selFloor}
                                                    onSelectionChange={(k) => setSelFloor(String(k || ''))}
                                                    inputProps={{ classNames: { inputWrapper: 'bg-slate-50/50 rounded-2xl h-12 border-slate-200' } }}
                                                    listboxProps={{ classNames: { base: "p-2 rounded-2xl", list: "gap-1" } }}
                                                    popoverProps={{ classNames: { content: "rounded-2xl border border-slate-100 shadow-2xl bg-white/90 backdrop-blur-xl" } }}
                                                >
                                                    {floors.map(f => <AutocompleteItem key={f.FloorID} className="rounded-xl font-bold text-slate-700">Floor {f.FloorNumber}</AutocompleteItem>)}
                                                </Autocomplete>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Seating Type</label>
                                                <Select variant="bordered" selectedKeys={[roomType]} onSelectionChange={(k) => setRoomType(String(Array.from(k)[0]))} classNames={{ trigger: 'bg-slate-50/50 rounded-2xl h-12 border-slate-200' }}>
                                                    {ROOM_TYPES.map(t => <SelectItem key={t.value} startContent={t.icon} className="rounded-xl font-bold text-slate-700">{t.value}</SelectItem>)}
                                                </Select>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Bench Mode</label>
                                                <div className="grid grid-cols-2 h-12 rounded-2xl overflow-hidden border-2 border-slate-50">
                                                    {[{ v: 2, l: 'Dual' }, { v: 1, l: 'Single' }].map(s => (
                                                        <button key={s.v} onClick={() => { setSeatsPerBench(s.v); setSeatMode(s.v === 2 ? 'Dual' : 'Single'); }}
                                                            className={`flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all ${seatsPerBench === s.v ? 'bg-violet-600 text-white shadow-inner' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                                                            {s.l}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <Divider className="opacity-50" />

                                        <Tabs selectedKey={createMode} onSelectionChange={(k) => setCreateMode(k as CreateMode)}
                                            size="sm" variant="underlined" color="secondary"
                                            classNames={{ tabList: 'gap-8', cursor: 'bg-violet-600 h-[2px]', tabContent: 'group-data-[selected=true]:text-violet-600 text-slate-400 font-black text-[10px] uppercase tracking-widest' }}>
                                            <Tab key="auto" title={<div className="flex items-center gap-2"><Hash size={14} />Sequence</div>}>
                                                <div className="space-y-6 pt-4">
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <Input label="Prefix" labelPlacement="outside" placeholder="NB" value={prefix} onValueChange={setPrefix} variant="bordered" classNames={{ label: "font-black text-slate-700 text-[10px] uppercase", inputWrapper: 'bg-slate-50/50 rounded-2xl h-12' }} />
                                                        <Input label="Start" labelPlacement="outside" type="number" value={startNum} onValueChange={setStartNum} variant="bordered" classNames={{ label: "font-black text-slate-700 text-[10px] uppercase", inputWrapper: 'bg-slate-50/50 rounded-2xl h-12' }} />
                                                        <Input label="Count" labelPlacement="outside" type="number" value={count} onValueChange={setCount} variant="bordered" classNames={{ label: "font-black text-slate-700 text-[10px] uppercase", inputWrapper: 'bg-slate-50/50 rounded-2xl h-12' }} />
                                                    </div>
                                                    <Input label="Standard Capacity" labelPlacement="outside" type="number" value={capacity} onValueChange={setCapacity} variant="bordered" classNames={{ label: "font-black text-slate-700 text-[10px] uppercase", inputWrapper: 'bg-slate-50/50 rounded-2xl h-12' }} />
                                                </div>
                                            </Tab>
                                            <Tab key="custom" title={<div className="flex items-center gap-2"><List size={14} />Custom List</div>}>
                                                <div className="space-y-6 pt-4">
                                                    <Input label="Global Prefix" labelPlacement="outside" value={prefix} onValueChange={setPrefix} variant="bordered" classNames={{ label: "font-black text-slate-700 text-[10px] uppercase", inputWrapper: 'bg-slate-50/50 rounded-2xl h-12' }} />
                                                    <Input label="Room Numbers" labelPlacement="outside" placeholder="101, 103, 207..." value={customList} onValueChange={setCustomList} variant="bordered" classNames={{ label: "font-black text-slate-700 text-[10px] uppercase", inputWrapper: 'bg-slate-50/50 rounded-2xl h-12' }} />
                                                    <Input label="Default Capacity" labelPlacement="outside" type="number" value={capacity} onValueChange={setCapacity} variant="bordered" classNames={{ label: "font-black text-slate-700 text-[10px] uppercase", inputWrapper: 'bg-slate-50/50 rounded-2xl h-12' }} />
                                                </div>
                                            </Tab>
                                            <Tab key="manual" title={<div className="flex items-center gap-2"><AlignJustify size={14} />Manual</div>}>
                                                <div className="space-y-3 pt-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                    {manualRows.map((row, i) => (
                                                        <div key={i} className="grid grid-cols-2 gap-3">
                                                            <Input placeholder={`Code ${i + 1}`} size="sm" value={row.code} onValueChange={(v) => {
                                                                const next = [...manualRows]; next[i].code = v; setManualRows(next);
                                                            }} variant="bordered" classNames={{ inputWrapper: 'bg-slate-50/50 rounded-xl h-10' }} />
                                                            <Input placeholder="Capacity" size="sm" type="number" value={row.capacity} onValueChange={(v) => {
                                                                const next = [...manualRows]; next[i].capacity = v; setManualRows(next);
                                                            }} variant="bordered" classNames={{ inputWrapper: 'bg-slate-50/50 rounded-xl h-10' }} />
                                                        </div>
                                                    ))}
                                                    <Button size="sm" variant="light" onPress={() => setManualRows(r => [...r, { code: '', capacity: '' }])}
                                                        startContent={<Plus size={14} />} className="mt-2 font-black text-violet-600 uppercase text-[10px] tracking-widest w-full border border-dashed border-violet-200 rounded-xl py-6">Add New Room Entry</Button>
                                                </div>
                                            </Tab>
                                            <Tab key="excel" title={<div className="flex items-center gap-2"><FileSpreadsheet size={14} />Excel</div>}>
                                                <div className="space-y-6 pt-4">
                                                    <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcel} />
                                                    <div 
                                                        className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-violet-500 hover:bg-violet-50/30 transition-all group"
                                                        onClick={() => fileRef.current?.click()}
                                                    >
                                                        <div className="w-16 h-16 bg-white shadow-xl shadow-slate-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                                            <FileSpreadsheet size={28} className="text-violet-600" />
                                                        </div>
                                                        <p className="font-black text-slate-700 uppercase tracking-widest text-[10px]">Click to upload Spreadsheet</p>
                                                    </div>
                                                    {excelRooms.length > 0 && (
                                                        <div className="flex items-center gap-3 bg-emerald-50 rounded-2xl p-4 border border-emerald-100 animate-in fade-in zoom-in duration-300">
                                                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-100">
                                                                <CircleCheck size={16} className="text-white" />
                                                            </div>
                                                            <span className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">{excelRooms.length} Rooms Analyzed & Ready</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </Tab>
                                        </Tabs>
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter className="bg-slate-50/50 rounded-b-[32px] px-10 py-8 border-t border-slate-100">
                                <Button variant="flat" size="lg" onPress={onClose} className="font-black text-slate-500 uppercase tracking-widest text-[10px] px-8">Cancel</Button>
                                <Button className="bg-violet-600 text-white font-black px-10 shadow-2xl shadow-violet-200 uppercase tracking-widest text-[10px] h-12"
                                    onPress={() => editing ? handleEdit(onClose) : handleCreate(onClose)}>
                                    {editing ? 'Apply Configuration' : 'Deploy Infrastructure'}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* ─ Confirmations ─ */}
            <InternalConfirmationModal
                isOpen={disableModal.isOpen}
                onOpenChange={disableModal.onOpenChange}
                type="warning"
                title="Disable Room?"
                message={`Are you sure you want to disable ${targetRoom?.RoomCode}?`}
                details={[
                    "Hidden from all future seating allocations",
                    "Existing allocations remain but are flagged",
                    "Can be re-enabled at any time"
                ]}
                confirmText="Disable Room"
                onConfirm={() => targetRoom && handleToggle(targetRoom)}
            />

            <InternalConfirmationModal
                isOpen={deleteModal.isOpen}
                onOpenChange={deleteModal.onOpenChange}
                type="danger"
                title="Delete Permanently?"
                message={`This action will completely wipe Room ${targetRoom?.RoomCode} from the system.`}
                details={[
                    "Permanent deletion of room metadata",
                    "Removal of all visual seating layouts",
                    "Deletion of all generated seat records",
                    "Irreversible action"
                ]}
                confirmText="Delete Permanently"
                onConfirm={handleDelete}
            />

        </div>
    );
};
