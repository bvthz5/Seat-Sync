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

    // --- Pagination & Filter State ---
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [limit] = useState(10);

    const fetchBlocks = async (currentPage = 1, search = "", status = "all") => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                limit
            };
            if (search) params.search = search;
            if (status !== "all") params.status = status;

            const response = await structureService.getBlocks(params);
            if (response && response.data && Array.isArray(response.data)) {
                setBlocks(response.data);
                setTotalPages(response.pages || 1);
                setTotalItems(response.total || response.data.length);
            } else if (Array.isArray(response)) {
                // Fallback for old unpaginated API
                setBlocks(response);
                setTotalPages(1);
                setTotalItems(response.length);
            } else {
                setBlocks([]);
                setTotalPages(1);
                setTotalItems(0);
            }
        } catch (error) {
            console.error("Failed to fetch blocks", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlocks(page, searchQuery, statusFilter);
    }, [page, searchQuery, statusFilter]);

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
            await fetchBlocks(page, searchQuery, statusFilter);
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
            await fetchBlocks(page, searchQuery, statusFilter);
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
            <div className="bg-gradient-to-br from-white to-blue-50/20 p-6 rounded-2xl border border-slate-100 shadow-lg shadow-slate-100/50 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="flex items-center gap-5 z-10">
                    <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20 ring-4 ring-blue-50">
                        <Building2 size={26} strokeWidth={2} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Block Management</h3>
                        <p className="text-slate-500 font-medium">Define major campus buildings & structures</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 z-10 w-full md:w-auto">
                    <Input
                        id="block-search"
                        name="block-search"
                        placeholder="Search blocks..."
                        aria-label="Search blocks"
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
                    {!readOnly && (
                        <Button
                            onPress={() => handleOpen()}
                            color="primary"
                            size="md"
                            startContent={<Plus size={18} strokeWidth={2.5} />}
                            className="font-semibold shadow-lg shadow-blue-600/20 text-white"
                        >
                            Add Block
                        </Button>
                    )}
                </div>
            </div>

            {/* Pagination Info */}
            <div className="flex justify-between items-center px-4 -mb-2">
                <div className="text-sm font-medium text-slate-500">
                    Showing <span className="text-slate-900 font-bold">{(blocks?.length || 0) === 0 ? 0 : (page - 1) * limit + 1}</span> - <span className="text-slate-900 font-bold">{Math.min(page * limit, totalItems)}</span> of <span className="text-slate-900 font-bold">{totalItems}</span>
                </div>
            </div>

            {/* Table */}
            <Table
                aria-label="Blocks table"
                classNames={{
                    wrapper: "bg-white shadow-sm border border-slate-200 rounded-2xl p-0 overflow-hidden",
                    th: "bg-slate-50 text-slate-600 font-semibold text-xs py-4 px-6 border-b border-slate-200",
                    td: "py-4 px-6 border-b border-slate-100 group-last:border-0",
                    tr: "hover:bg-slate-50/80 transition-colors cursor-default"
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
                                    <label htmlFor="modal-block-name" className="text-sm font-medium text-slate-700">Block Name</label>
                                    <Input
                                        id="modal-block-name"
                                        name="BlockName"
                                        autoFocus
                                        placeholder="e.g. Science Block, Main Building"
                                        aria-label="Block Name"
                                        variant="bordered"
                                        classNames={{
                                            inputWrapper: "h-12 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl shadow-sm px-4 transition-all",
                                            input: "text-base font-medium text-slate-800 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
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
                                <Button color="primary" onPress={() => handleSubmit(onClose)} className="font-semibold shadow-lg shadow-blue-500/20 text-white">
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
