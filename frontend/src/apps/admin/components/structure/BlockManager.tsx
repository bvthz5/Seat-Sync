import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Checkbox } from '@heroui/react';
import { Plus, Edit, Trash2, Building2, AlertTriangle, Search } from 'lucide-react';
import { structureService } from '../../services/structureService';
import { Block } from '../../types/collegeStructure';
import { toast } from '../../../../utils/toast';

interface BlockManagerProps {
    readOnly?: boolean;
}

export const BlockManager: React.FC<BlockManagerProps> = ({ readOnly = false }) => {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [loading, setLoading] = useState(true);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editingBlock, setEditingBlock] = useState<Block | null>(null);
    const [formData, setFormData] = useState<Partial<Block>>({
        BlockName: '',
        Status: 'Active'
    });

    const fetchBlocks = async () => {
        try {
            setLoading(true);
            const data = await structureService.getBlocks();
            setBlocks(data);
        } catch (error) {
            console.error("Failed to fetch blocks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocks();
    }, []);

    const handleOpen = (block?: Block) => {
        if (readOnly) return;
        if (block) {
            setEditingBlock(block);
            setFormData({ BlockName: block.BlockName, Status: block.Status });
        } else {
            setEditingBlock(null);
            setFormData({ BlockName: '', Status: 'Active' });
        }
        onOpen();
    };

    const handleSubmit = async (onClose: () => void) => {
        if (!formData.BlockName?.trim()) {
            toast.error("Block Name is required");
            return;
        }

        try {
            if (editingBlock) {
                await structureService.updateBlock(editingBlock.BlockID, formData);
                toast.success("Block updated successfully");
            } else {
                await structureService.createBlock(formData);
                toast.success("Block created successfully");
            }
            await fetchBlocks();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (readOnly) return;
        if (!confirm("Are you sure? This action cannot be undone.")) return;

        try {
            await structureService.deleteBlock(id);
            toast.success("Block deleted");
            fetchBlocks();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Delete failed");
        }
    };

    const columns = [
        { name: "BLOCK NAME", uid: "name" },
        { name: "STATUS", uid: "status" },
        { name: "FLOORS", uid: "floors" },
        { name: "ACTIONS", uid: "actions" },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Header Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Building2 size={24} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Block Management</h3>
                        <p className="text-slate-500 font-medium">Define major campus buildings</p>
                    </div>
                </div>
                {!readOnly && (
                    <Button
                        onPress={() => handleOpen()}
                        color="primary"
                        size="md"
                        startContent={<Plus size={18} strokeWidth={2.5} />}
                        className="font-semibold shadow-md shadow-blue-500/20"
                    >
                        Add Block
                    </Button>
                )}
            </div>

            {/* Table */}
            <Table
                aria-label="Blocks table"
                classNames={{
                    wrapper: "bg-white shadow-sm border border-slate-200 rounded-2xl p-0 overflow-hidden",
                    th: "bg-slate-50 text-slate-600 font-semibold text-xs py-4 px-6 border-b border-slate-200",
                    td: "py-4 px-6 border-b border-slate-100 group-last:border-0",
                    tr: "hover:bg-slate-50/50 transition-colors"
                }}
            >
                <TableHeader columns={columns}>
                    {(column) => (
                        <TableColumn key={column.uid} align={column.uid === "actions" ? "end" : "start"}>
                            {column.name}
                        </TableColumn>
                    )}
                </TableHeader>
                <TableBody
                    items={blocks}
                    isLoading={loading}
                    emptyContent={
                        <div className="py-12 flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                <Search className="text-slate-400" size={24} />
                            </div>
                            <p className="text-slate-500 font-medium">No blocks configured yet.</p>
                            {!readOnly && <p className="text-slate-400 text-sm mt-1">Add a block to begin setting up your campus.</p>}
                        </div>
                    }
                >
                    {(block) => (
                        <TableRow key={block.BlockID}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                                        <Building2 size={20} />
                                    </div>
                                    <span className="font-semibold text-slate-700 text-base">{block.BlockName}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    size="sm"
                                    variant="flat"
                                    color={block.Status === 'Active' ? "success" : "danger"}
                                    classNames={{ content: "font-semibold" }}
                                >
                                    {block.Status}
                                </Chip>
                            </TableCell>
                            <TableCell>
                                <span className="text-slate-600 font-medium px-3 py-1 bg-slate-100 rounded-full text-sm">
                                    {block.floorCount || 0} Floors
                                </span>
                            </TableCell>
                            <TableCell>
                                {!readOnly && (
                                    <div className="flex justify-end gap-2">
                                        <Button isIconOnly size="sm" variant="light" onPress={() => handleOpen(block)}>
                                            <Edit size={18} className="text-slate-400 hover:text-blue-600 transition-colors" />
                                        </Button>
                                        <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(block.BlockID)}>
                                            <Trash2 size={18} className="text-slate-400 hover:text-red-600 transition-colors" />
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Modal */}
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                placement="center"
                backdrop="blur"
                classNames={{
                    base: "bg-white",
                    header: "border-b border-slate-100",
                    footer: "border-t border-slate-100",
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <h2 className="text-xl font-bold text-slate-800">{editingBlock ? "Edit Block" : "Add New Block"}</h2>
                                <p className="text-sm text-slate-500 font-normal">
                                    {editingBlock ? "Update block details below" : "Define a new building block for exams"}
                                </p>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-slate-700">Block Name</label>
                                    <Input
                                        autoFocus
                                        placeholder="e.g. Science Block, Main Building"
                                        variant="bordered"
                                        classNames={{
                                            inputWrapper: "bg-white border-1 border-slate-300 shadow-sm hover:border-blue-400 focus-within:!border-blue-500 rounded-xl transition-all"
                                        }}
                                        value={formData.BlockName}
                                        onValueChange={(val) => setFormData({ ...formData, BlockName: val })}
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <span className="text-sm font-medium text-slate-700">Block Status</span>
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, Status: 'Active' })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${formData.Status === 'Active' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-100' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${formData.Status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            Active
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, Status: 'Inactive' })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${formData.Status === 'Inactive' ? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-100' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${formData.Status === 'Inactive' ? 'bg-slate-500' : 'bg-slate-300'}`} />
                                            Inactive
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 px-1">Inactive blocks are hidden from standard selection menus.</p>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose} className="font-medium">
                                    Cancel
                                </Button>
                                <Button color="primary" onPress={() => handleSubmit(onClose)} className="font-semibold shadow-lg shadow-blue-500/20">
                                    {editingBlock ? "Update Block" : "Create Block"}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};
