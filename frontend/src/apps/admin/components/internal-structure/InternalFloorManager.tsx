import React, { useEffect, useState } from 'react';
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Input, Chip, Autocomplete, AutocompleteItem, Skeleton, Tooltip
} from '@heroui/react';
import { Plus, Edit, Trash2, Layers, Search, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { internalStructureService, InternalBlock, InternalFloor } from '../../services/internalStructureService';
import { toast } from '../../../../utils/toast';
import { InternalConfirmationModal } from './InternalConfirmationModal';

interface Props { readOnly?: boolean }

export const InternalFloorManager: React.FC<Props> = ({ readOnly = false }) => {
    const [floors, setFloors] = useState<InternalFloor[]>([]);
    const [blocks, setBlocks] = useState<InternalBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editing, setEditing] = useState<InternalFloor | null>(null);
    const [form, setForm] = useState({ BlockID: '', FloorNumber: '', Status: 'Active' as 'Active' | 'Inactive' });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [blockFilter, setBlockFilter] = useState('');
    const deleteModal = useDisclosure();
    const [targetFloor, setTargetFloor] = useState<InternalFloor | null>(null);
    const limit = 10;

    const fetchFloors = async (p = 1, s = '', b = '') => {
        setLoading(true);
        try {
            const params: any = { page: p, limit };
            if (s) params.search = s;
            if (b) params.blockId = Number(b);
            const res = await internalStructureService.getFloors(params);
            setFloors(res.data || []);
            setTotalPages(res.pages || 1);
            setTotalItems(res.total || 0);
        } catch { toast.error('Failed to load floors'); }
        finally { setLoading(false); }
    };

    const fetchBlocks = async () => {
        try {
            const res = await internalStructureService.getBlocks({ limit: 100 });
            setBlocks(res.data || []);
        } catch { }
    };

    useEffect(() => { fetchBlocks(); }, []);
    useEffect(() => { fetchFloors(page, search, blockFilter); }, [page, search, blockFilter]);

    const handleOpen = (floor?: InternalFloor) => {
        if (readOnly) return;
        if (floor) {
            setEditing(floor);
            setForm({ BlockID: String(floor.BlockID), FloorNumber: String(floor.FloorNumber), Status: floor.Status });
        } else {
            setEditing(null);
            setForm({ BlockID: '', FloorNumber: '', Status: 'Active' });
        }
        onOpen();
    };

    const handleSubmit = async (onClose: () => void) => {
        if (!form.BlockID || !form.FloorNumber) { toast.error('Block and Floor Number are required'); return; }
        try {
            if (editing) {
                await internalStructureService.updateFloor(editing.FloorID, { FloorNumber: Number(form.FloorNumber), Status: form.Status });
                toast.success('Floor updated');
            } else {
                await internalStructureService.createFloor({ BlockID: Number(form.BlockID), FloorNumber: Number(form.FloorNumber), Status: form.Status });
                toast.success('Floor created');
            }
            fetchFloors(page, search, blockFilter);
            onClose();
        } catch (e: any) { toast.error(e.response?.data?.message || 'Operation failed'); }
    };

    const confirmDelete = (floor: InternalFloor) => {
        setTargetFloor(floor);
        deleteModal.onOpen();
    };

    const handleDelete = async () => {
        if (!targetFloor) return;
        try { 
            await internalStructureService.deleteFloor(targetFloor.FloorID); 
            toast.success('Floor deleted'); 
            fetchFloors(page, search, blockFilter);
            deleteModal.onClose();
        }
        catch (e: any) { toast.error(e.response?.data?.message || 'Delete failed'); }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-600 text-white rounded-xl shadow-lg shadow-violet-200">
                        <Layers size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Internal Floors</h3>
                        <p className="text-slate-500 text-sm">{totalItems} floors configured for internal exams</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-end">
                    <Input placeholder="Search by floor no..." size="sm" variant="bordered"
                        startContent={<Search size={14} className="text-slate-400" />}
                        value={search} onValueChange={(v) => { setSearch(v); setPage(1); }}
                        classNames={{ inputWrapper: 'bg-white' }} className="w-48" />
                    <select value={blockFilter} onChange={(e) => { setBlockFilter(e.target.value); setPage(1); }}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-violet-400">
                        <option value="">All Blocks</option>
                        {blocks.map(b => <option key={b.BlockID} value={String(b.BlockID)}>{b.BlockName}</option>)}
                    </select>
                    {!readOnly && (
                        <Button size="sm" startContent={<Plus size={16} />} onPress={() => handleOpen()}
                            className="bg-violet-600 text-white font-semibold shadow-sm shadow-violet-200">
                            Add Floor
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <Table aria-label="Internal Floors" removeWrapper classNames={{ th: 'bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider', td: 'py-3' }}>
                    <TableHeader>
                        <TableColumn key="block">Block Hierarchy</TableColumn>
                        <TableColumn key="floor" align="center">Floor Designation</TableColumn>
                        <TableColumn key="status" align="center">Status</TableColumn>
                        <TableColumn key="actions" align="end">Actions</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={loading ? ' ' : 'No floors found'}>
                        {floors.map(f => (
                            <TableRow key={f.FloorID} className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                                            <Building2 size={16} className="text-slate-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 tracking-tight">{(f as any).InternalBlock?.BlockName || '—'}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-center">
                                        <span className="font-black text-violet-600 text-lg leading-none">Floor {f.FloorNumber}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-center">
                                        <Chip size="sm" variant="flat" color={f.Status === 'Active' ? 'success' : 'default'}
                                            classNames={{ base: f.Status === 'Active' ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100' }}>
                                            <span className="font-black text-[10px] uppercase tracking-widest">{f.Status}</span>
                                        </Chip>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {!readOnly && (
                                        <div className="flex justify-end gap-1">
                                            <Tooltip content="Edit Floor"><Button isIconOnly size="sm" variant="light" className="hover:bg-violet-50" onPress={() => handleOpen(f)}><Edit size={15} className="text-violet-600" /></Button></Tooltip>
                                            <Tooltip content="Delete Floor"><Button isIconOnly size="sm" variant="light" className="hover:bg-red-50 text-red-600" color="danger" onPress={() => confirmDelete(f)}><Trash2 size={15} /></Button></Tooltip>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {loading && <div className="p-4 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <Button size="sm" variant="flat" isDisabled={page <= 1} onPress={() => setPage(p => p - 1)} startContent={<ChevronLeft size={14} />}>Prev</Button>
                            <Button size="sm" variant="flat" isDisabled={page >= totalPages} onPress={() => setPage(p => p + 1)} endContent={<ChevronRight size={14} />}>Next</Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur"
                classNames={{ backdrop: 'bg-slate-900/40 backdrop-blur-md', base: 'bg-white border border-slate-200 shadow-2xl rounded-[32px]' }}>
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="text-slate-900 font-black px-10 pt-10 text-2xl tracking-tight">
                                {editing ? 'Edit Infrastructure Level' : 'Deploy New Floor'}
                            </ModalHeader>
                            <ModalBody className="gap-8 px-10 pb-8">
                                {!editing && (
                                    <div className="flex flex-col gap-2">
                                        <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Infrastructure Block</label>
                                        <Autocomplete
                                            placeholder="Select block..."
                                            variant="bordered" selectedKey={form.BlockID}
                                            onSelectionChange={(k) => setForm(f => ({ ...f, BlockID: String(k || '') }))}
                                            inputProps={{ classNames: { inputWrapper: 'bg-slate-50/50 rounded-2xl h-12 border-slate-200' } }}
                                            listboxProps={{ classNames: { base: "p-2 rounded-2xl", list: "gap-1" } }}
                                            popoverProps={{ classNames: { content: "rounded-2xl border border-slate-100 shadow-2xl bg-white/90 backdrop-blur-xl" } }}
                                        >
                                            {blocks.map(b => <AutocompleteItem key={b.BlockID} className="rounded-xl font-bold text-slate-700">{b.BlockName}</AutocompleteItem>)}
                                        </Autocomplete>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Floor Number</label>
                                    <Input
                                        placeholder="e.g. 1, 2, 0"
                                        type="number" value={form.FloorNumber}
                                        onValueChange={(v) => setForm(f => ({ ...f, FloorNumber: v }))}
                                        variant="bordered" classNames={{ inputWrapper: 'bg-slate-50/50 rounded-2xl h-12 border-slate-200' }}
                                    />
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Administrative Status</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['Active', 'Inactive'] as const).map(s => (
                                            <button key={s} onClick={() => setForm(f => ({ ...f, Status: s }))}
                                                className={`py-3 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all ${form.Status === s ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-200' : 'bg-white text-slate-500 border-slate-100 hover:border-violet-200'}`}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter className="bg-slate-50/50 rounded-b-[32px] px-10 py-8 border-t border-slate-100">
                                <Button variant="flat" size="lg" onPress={onClose} className="font-black text-slate-500 uppercase tracking-widest text-[10px] px-8">Cancel</Button>
                                <Button className="bg-violet-600 text-white font-black px-10 shadow-2xl shadow-violet-200 uppercase tracking-widest text-[10px] h-12" onPress={() => handleSubmit(onClose)}>
                                    {editing ? 'Update Level' : 'Deploy Floor'}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <InternalConfirmationModal
                isOpen={deleteModal.isOpen}
                onOpenChange={deleteModal.onOpenChange}
                type="danger"
                title="Delete Floor?"
                message={`Are you sure you want to delete Floor ${targetFloor?.FloorNumber}?`}
                details={[
                    "All rooms on this floor will be deleted",
                    "All seating maps and data will be wiped",
                    "Irreversible action"
                ]}
                confirmText="Delete Floor"
                onConfirm={handleDelete}
            />
        </div>
    );
};
