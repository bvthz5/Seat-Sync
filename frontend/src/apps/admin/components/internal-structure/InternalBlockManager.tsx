import React, { useEffect, useState } from 'react';
import {
    Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
    Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
    Input, Chip, Skeleton, Tooltip
} from '@heroui/react';
import { Plus, Edit, Trash2, Building2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { internalStructureService, InternalBlock } from '../../services/internalStructureService';
import { toast } from '../../../../utils/toast';
import { InternalConfirmationModal } from './InternalConfirmationModal';

interface Props { readOnly?: boolean }

export const InternalBlockManager: React.FC<Props> = ({ readOnly = false }) => {
    const [blocks, setBlocks] = useState<InternalBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editing, setEditing] = useState<InternalBlock | null>(null);
    const [form, setForm] = useState({ BlockName: '', Status: 'Active' as 'Active' | 'Inactive' });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const deleteModal = useDisclosure();
    const [targetBlock, setTargetBlock] = useState<InternalBlock | null>(null);
    const limit = 10;

    const fetch = async (p = 1, s = '', sf = 'all') => {
        setLoading(true);
        try {
            const params: any = { page: p, limit };
            if (s) params.search = s;
            if (sf !== 'all') params.status = sf;
            const res = await internalStructureService.getBlocks(params);
            setBlocks(res.data || []);
            setTotalPages(res.pages || 1);
            setTotalItems(res.total || 0);
        } catch { toast.error('Failed to load blocks'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(page, search, statusFilter); }, [page, search, statusFilter]);

    const handleOpen = (block?: InternalBlock) => {
        if (readOnly) return;
        if (block) { setEditing(block); setForm({ BlockName: block.BlockName, Status: block.Status }); }
        else { setEditing(null); setForm({ BlockName: '', Status: 'Active' }); }
        onOpen();
    };

    const handleSubmit = async (onClose: () => void) => {
        if (!form.BlockName.trim()) { toast.error('Block Name is required'); return; }
        try {
            if (editing) {
                await internalStructureService.updateBlock(editing.BlockID, form);
                toast.success('Block updated');
            } else {
                await internalStructureService.createBlock(form);
                toast.success('Block created');
            }
            fetch(page, search, statusFilter);
            onClose();
        } catch (e: any) { toast.error(e.response?.data?.message || 'Operation failed'); }
    };

    const confirmDelete = (block: InternalBlock) => {
        setTargetBlock(block);
        deleteModal.onOpen();
    };

    const handleDelete = async () => {
        if (!targetBlock) return;
        try { 
            await internalStructureService.deleteBlock(targetBlock.BlockID); 
            toast.success('Block deleted'); 
            fetch(page, search, statusFilter);
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
                        <Building2 size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Internal Blocks</h3>
                        <p className="text-slate-500 text-sm">{totalItems} building blocks for internal exams</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Input
                        placeholder="Search blocks..."
                        size="sm" variant="bordered"
                        startContent={<Search size={14} className="text-slate-400" />}
                        value={search} onValueChange={(v) => { setSearch(v); setPage(1); }}
                        classNames={{ inputWrapper: 'bg-white' }}
                        className="w-56"
                    />
                    <select
                        value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-violet-400"
                    >
                        <option value="all">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    {!readOnly && (
                        <Button color="primary" size="sm" startContent={<Plus size={16} />} onPress={() => handleOpen()}
                            className="bg-violet-600 text-white font-semibold shadow-sm shadow-violet-200">
                            Add Block
                        </Button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <Table aria-label="Internal Blocks" removeWrapper classNames={{ th: 'bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider', td: 'py-3' }}>
                    <TableHeader>
                        <TableColumn key="block">Block Name</TableColumn>
                        <TableColumn key="floors" align="center">Floors</TableColumn>
                        <TableColumn key="status" align="center">Status</TableColumn>
                        <TableColumn key="actions" align="end">Actions</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={loading ? ' ' : 'No blocks found'}>
                        {blocks.map(b => (
                            <TableRow key={b.BlockID} className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
                                            <Building2 size={16} className="text-white" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 tracking-tight">{b.BlockName}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-center">
                                        <span className="font-black text-slate-900 text-lg leading-none">{b.floorCount ?? 0}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col items-center">
                                        <Chip size="sm" variant="flat"
                                            color={b.Status === 'Active' ? 'success' : 'default'}
                                            classNames={{ base: b.Status === 'Active' ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-100' }}>
                                            <span className="font-black text-[10px] uppercase tracking-widest">{b.Status}</span>
                                        </Chip>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {!readOnly && (
                                        <div className="flex justify-end gap-1">
                                            <Tooltip content="Edit Block"><Button isIconOnly size="sm" variant="light" className="hover:bg-violet-50" onPress={() => handleOpen(b)}><Edit size={15} className="text-violet-600" /></Button></Tooltip>
                                            <Tooltip content="Delete Block"><Button isIconOnly size="sm" variant="light" className="hover:bg-red-50 text-red-600" color="danger" onPress={() => confirmDelete(b)}><Trash2 size={15} /></Button></Tooltip>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {loading && (
                    <div className="p-4 space-y-3">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-10 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Displaying {blocks.length} of {totalItems} Blocks</span>
                        <div className="flex gap-3">
                            <Button size="sm" variant="flat" className="font-bold bg-white border border-slate-200 px-6" isDisabled={page <= 1} onPress={() => setPage(p => p - 1)} startContent={<ChevronLeft size={14} />}>Previous</Button>
                            <Button size="sm" variant="flat" className="font-bold bg-white border border-slate-200 px-6" isDisabled={page >= totalPages} onPress={() => setPage(p => p + 1)} endContent={<ChevronRight size={14} />}>Next</Button>
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
                                {editing ? 'Edit Infrastructure Block' : 'Deploy New Block'}
                            </ModalHeader>
                            <ModalBody className="gap-8 px-10 pb-8">
                                <div className="flex flex-col gap-2">
                                    <label className="font-black text-slate-700 uppercase tracking-widest text-[10px] ml-1">Block Name</label>
                                    <Input
                                        placeholder="e.g. Main Block, SJB Block"
                                        value={form.BlockName}
                                        onValueChange={(v) => setForm(f => ({ ...f, BlockName: v }))}
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
                                    {editing ? 'Update Registry' : 'Initialize Block'}
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
                title="Delete Block?"
                message={`Are you sure you want to delete ${targetBlock?.BlockName}?`}
                details={[
                    "All floors within this block will be deleted",
                    "All rooms and seating layouts will be wiped",
                    "Irreversible infrastructure loss"
                ]}
                confirmText="Delete Block"
                onConfirm={handleDelete}
            />
        </div>
    );
};
