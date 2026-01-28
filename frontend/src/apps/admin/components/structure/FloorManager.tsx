import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Select, SelectItem, Checkbox, Autocomplete, AutocompleteItem } from '@heroui/react';
import { Plus, Edit, Trash2, Layers, AlertCircle, Building2, Search } from 'lucide-react';
import { structureService } from '../../services/structureService';
import { Block, Floor } from '../../types/collegeStructure';
import { toast } from '../../../../utils/toast';

interface FloorManagerProps {
    readOnly?: boolean;
}

export const FloorManager: React.FC<FloorManagerProps> = ({ readOnly = false }) => {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string>("");
    const [floors, setFloors] = useState<Floor[]>([]);
    const [loading, setLoading] = useState(false);

    // --- Pagination & Filter State ---
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [limit] = useState(10);

    // Modal state
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
    const [formData, setFormData] = useState<Partial<Floor>>({
        BlockID: 0,
        FloorNumber: 0,
        Status: 'Active'
    });

    useEffect(() => {
        loadBlocks();
    }, []);

    useEffect(() => {
        if (selectedBlockId) {
            loadFloors(Number(selectedBlockId), page, searchQuery, statusFilter);
        } else {
            setFloors([]);
        }
    }, [selectedBlockId, page, searchQuery, statusFilter]);

    const loadBlocks = async () => {
        try {
            const response = await structureService.getBlocks({ limit: 100 });
            const data = response && response.data ? response.data : (Array.isArray(response) ? response : []);
            setBlocks(data);
            if (data.length > 0 && !selectedBlockId) {
                // Auto-select first block for better UX
                setSelectedBlockId(data[0].BlockID.toString());
            }
        } catch (error) {
            console.error(error);
            setBlocks([]);
        }
    };

    const loadFloors = async (blockId: number, currentPage = 1, search = "", status = "all") => {
        setLoading(true);
        try {
            const params: any = {
                blockId,
                page: currentPage,
                limit,
            };
            if (search) params.search = search;
            if (status !== "all") params.status = status;

            const response = await structureService.getFloors(params);
            if (response && response.data && Array.isArray(response.data)) {
                setFloors(response.data);
                setTotalPages(response.pages || 1);
                setTotalItems(response.total || response.data.length);
            } else if (Array.isArray(response)) {
                setFloors(response);
                setTotalPages(1);
                setTotalItems(response.length);
            } else {
                setFloors([]);
                setTotalPages(1);
                setTotalItems(0);
            }
        } catch (error) {
            toast.error("Failed to load floors");
        } finally {
            setLoading(false);
        }
    };

    const handleOpen = (floor?: Floor) => {
        if (readOnly) return;
        if (floor) {
            setEditingFloor(floor);
            setFormData({
                BlockID: floor.BlockID,
                FloorNumber: floor.FloorNumber,
                Status: floor.Status
            });
        } else {
            setEditingFloor(null);
            setFormData({
                BlockID: Number(selectedBlockId),
                FloorNumber: ((floors?.length || 0) > 0 ? Math.max(...floors.map(f => f.FloorNumber)) + 1 : 1), // Suggest next floor
                Status: 'Active'
            });
        }
        onOpen();
    };

    const handleSubmit = async (onClose: () => void) => {
        if (!formData.BlockID) {
            toast.error("Block selection is required");
            return;
        }

        try {
            if (editingFloor) {
                await structureService.updateFloor(editingFloor.FloorID, formData);
                toast.success("Floor updated");
            } else {
                await structureService.createFloor(formData);
                toast.success("Floor created");
            }
            loadFloors(Number(selectedBlockId), page, searchQuery, statusFilter);
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        }
    };

    const handleDelete = async (id: number) => {
        if (readOnly) return;
        if (!confirm("Delete this floor? Cannot be undone.")) return;
        try {
            await structureService.deleteFloor(id);
            toast.success("Floor deleted");
            loadFloors(Number(selectedBlockId), page, searchQuery, statusFilter);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Delete failed");
        }
    };

    const columns = [
        { name: "FLOOR NUMBER", uid: "number" },
        { name: "BLOCK", uid: "block" },
        { name: "STATUS", uid: "status" },
        { name: "ACTIONS", uid: "actions" },
    ];

    return (
        <div className="flex flex-col gap-6">
            {/* Control Panel */}
            <div className={`p-6 rounded-2xl border flex flex-col md:flex-row gap-6 justify-between items-end transition-all relative overflow-hidden ${!selectedBlockId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200 shadow-lg shadow-slate-100/50'}`}>
                {selectedBlockId && <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />}

                <div className="flex flex-col gap-3 w-full md:w-1/2 z-10">
                    <label htmlFor="block-select-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Building2 size={14} /> Select Building Block
                    </label>
                    <Autocomplete
                        id="block-select"
                        name="block-select"
                        aria-label="Select Block"
                        placeholder="Choose a building block..."
                        className="max-w-md w-full"
                        variant="bordered"
                        selectedKey={selectedBlockId}
                        onSelectionChange={(key) => setSelectedBlockId(key ? key.toString() : "")}
                        classNames={{
                            base: "max-w-md",
                            listboxWrapper: "max-h-[320px]",
                            selectorButton: "text-slate-500"
                        }}
                        inputProps={{
                            id: "block-select-input",
                            classNames: {
                                input: "text-base font-medium text-slate-700 placeholder:text-slate-400 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                inputWrapper: "bg-white h-12 min-h-12 rounded-xl border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 shadow-sm transition-all"
                            }
                        }}
                        listboxProps={{
                            itemClasses: {
                                base: "rounded-lg data-[hover=true]:bg-blue-50 data-[hover=true]:text-blue-600 px-3 py-2 transition-colors",
                                title: "font-semibold text-base",
                                description: "text-xs text-slate-400"
                            }
                        }}
                        popoverProps={{
                            offset: 10,
                            classNames: {
                                base: "before:bg-white",
                                content: "bg-white p-2 border border-slate-100 shadow-2xl rounded-xl w-full"
                            }
                        }}
                    >
                        {(blocks || []).map((b) => (
                            <AutocompleteItem key={b.BlockID} textValue={b.BlockName} description={`${b.floorCount || 0} floors available`} startContent={<Building2 size={18} className="text-slate-400" />}>
                                {b.BlockName}
                            </AutocompleteItem>
                        ))}
                    </Autocomplete>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center z-10 w-full md:w-auto">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Input
                            id="floor-search"
                            name="floor-search"
                            placeholder="Find floor..."
                            aria-label="Search floors"
                            size="sm"
                            startContent={<Search size={18} className="text-slate-400 mr-2" />}
                            className="max-w-[200px]"
                            variant="bordered"
                            value={searchQuery}
                            onValueChange={(v) => { setSearchQuery(v); setPage(1); }}
                            classNames={{
                                inputWrapper: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 shadow-sm rounded-xl h-11 transition-all",
                                input: "bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                            }}
                        />
                        <Select
                            id="floor-status-filter"
                            name="floor-status-filter"
                            placeholder="Status"
                            aria-label="Filter by status"
                            size="sm"
                            className="w-[120px]"
                            variant="bordered"
                            selectedKeys={[statusFilter]}
                            onSelectionChange={(keys) => { setStatusFilter(Array.from(keys)[0] as string); setPage(1); }}
                            classNames={{
                                trigger: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 data-[focus=true]:border-blue-600 shadow-sm rounded-xl h-11 transition-all"
                            }}
                        >
                            <SelectItem key="all" textValue="All">All</SelectItem>
                            <SelectItem key="Active" textValue="Active">Active</SelectItem>
                            <SelectItem key="Inactive" textValue="Inactive">Inactive</SelectItem>
                        </Select>
                    </div>

                    {!readOnly && selectedBlockId && (
                        <Button
                            onPress={() => handleOpen()}
                            color="primary"
                            size="lg"
                            startContent={<Plus size={20} strokeWidth={2.5} />}
                            className="font-bold shadow-lg shadow-blue-500/20 rounded-xl h-12 px-8 text-white"
                        >
                            Add Floor
                        </Button>
                    )}
                </div>
            </div>

            {/* Pagination Info */}
            {selectedBlockId && (
                <div className="flex justify-between items-center px-4 -mb-2">
                    <div className="text-sm font-medium text-slate-500">
                        Showing <span className="text-slate-900 font-bold">{(floors?.length || 0) === 0 ? 0 : (page - 1) * limit + 1}</span> - <span className="text-slate-900 font-bold">{Math.min(page * limit, totalItems)}</span> of <span className="text-slate-900 font-bold">{totalItems}</span>
                    </div>
                </div>
            )}

            {!selectedBlockId ? (
                // Empty State
                <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200/50 mb-6 ring-1 ring-slate-100">
                        <Building2 className="text-slate-400" size={36} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Select a Building</h3>
                    <p className="text-slate-500 max-w-sm text-center font-medium leading-relaxed">
                        Please select a building block from the dropdown above to view and manage its floors.
                    </p>
                </div>
            ) : (
                // Table
                <>
                    <Table
                        aria-label="Floors table"
                        classNames={{
                            wrapper: "bg-white shadow-sm border border-slate-200 rounded-2xl p-0 overflow-hidden",
                            th: "bg-slate-50 text-slate-600 font-bold text-xs py-4 px-6 border-b border-slate-200 uppercase tracking-wider",
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
                            items={floors}
                            isLoading={loading}
                            emptyContent={
                                <div className="py-20 flex flex-col items-center text-center">
                                    <Search className="text-slate-300 mb-4" size={48} strokeWidth={1} />
                                    <p className="text-slate-600 font-semibold text-lg">No floors found</p>
                                    <p className="text-slate-400 text-sm mt-1">This block doesn't have any floors yet.</p>
                                    {!readOnly && <Button variant="light" color="primary" className="mt-4 font-semibold" onPress={() => handleOpen()}>Create First Floor</Button>}
                                </div>
                            }
                        >
                            {(floor) => (
                                <TableRow key={floor.FloorID}>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 ring-1 ring-blue-100">
                                                <Layers size={22} strokeWidth={2} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-lg">Floor {floor.FloorNumber}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">ID: {floor.FloorID}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Building2 size={14} className="text-slate-400" />
                                            <span className="text-slate-700 font-semibold">
                                                {blocks.find(b => b.BlockID === floor.BlockID)?.BlockName}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size="md"
                                            variant="flat"
                                            color={floor.Status === 'Active' ? "success" : "default"}
                                            startContent={<div className={`w-2 h-2 rounded-full mr-1 ${floor.Status === 'Active' ? 'bg-success-500' : 'bg-slate-400'}`} />}
                                            classNames={{ content: "font-semibold text-slate-700" }}
                                        >
                                            {floor.Status}
                                        </Chip>
                                    </TableCell>
                                    <TableCell>
                                        {!readOnly && (
                                            <div className="flex justify-end gap-2">
                                                <Button isIconOnly size="sm" variant="light" onPress={() => handleOpen(floor)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                                    <Edit size={18} strokeWidth={2.5} />
                                                </Button>
                                                <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(floor.FloorID)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                    <Trash2 size={18} strokeWidth={2.5} />
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
                        <div className="flex justify-center p-4 bg-white border border-slate-200 rounded-2xl shadow-sm mt-4">
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
                </>
            )}

            {/* Modal */}
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                backdrop="blur"
                classNames={{
                    base: "bg-white rounded-3xl shadow-2xl border border-slate-100",
                    header: "border-b border-slate-100 px-8 py-6",
                    footer: "border-t border-slate-100 px-8 py-6",
                    body: "px-8 py-8"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{editingFloor ? "Edit Floor Details" : "Add New Floor"}</h2>
                                <p className="text-sm text-slate-500 font-normal">Define the floor number and its status within the block.</p>
                            </ModalHeader>
                            <ModalBody className="space-y-6">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="modal-floor-block-input" className="text-sm font-semibold text-slate-700 ml-1">Building Block</label>
                                    <Autocomplete
                                        id="modal-floor-block"
                                        name="BlockID"
                                        placeholder="Search and select a block..."
                                        selectedKey={formData.BlockID ? formData.BlockID.toString() : ""}
                                        onSelectionChange={(key) => setFormData({ ...formData, BlockID: Number(key) })}
                                        variant="bordered"
                                        classNames={{
                                            base: "max-w-full",
                                            listboxWrapper: "max-h-[320px]",
                                            selectorButton: "text-slate-500"
                                        }}
                                        inputProps={{
                                            id: "modal-floor-block-input",
                                            name: "BlockID",
                                            classNames: {
                                                input: "text-base font-medium text-slate-800 placeholder:text-slate-400 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0",
                                                inputWrapper: "h-12 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl shadow-sm px-4 transition-all"
                                            }
                                        }}
                                        listboxProps={{
                                            hideSelectedIcon: false,
                                            itemClasses: {
                                                base: "rounded-lg min-h-[44px] data-[hover=true]:bg-blue-50 data-[hover=true]:text-blue-600 px-3 py-2 transition-colors gap-3",
                                                title: "font-semibold text-base text-slate-700",
                                                description: "text-xs text-slate-400"
                                            }
                                        }}
                                        popoverProps={{
                                            offset: 10,
                                            classNames: {
                                                base: "before:bg-white",
                                                content: "bg-white p-2 border border-slate-100 shadow-2xl rounded-xl min-w-[300px]"
                                            }
                                        }}
                                    >
                                        {(blocks || []).map((b) => (
                                            <AutocompleteItem key={b.BlockID} textValue={b.BlockName} description={`${b.floorCount || 0} floors available`} startContent={<Building2 size={20} className="text-slate-400" />}>
                                                {b.BlockName}
                                            </AutocompleteItem>
                                        ))}
                                    </Autocomplete>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="modal-floor-number" className="text-sm font-semibold text-slate-700 ml-1">Floor Number</label>
                                    <Input
                                        id="modal-floor-number"
                                        name="FloorNumber"
                                        type="number"
                                        autoFocus
                                        placeholder="e.g. 1"
                                        aria-label="Floor Number"
                                        variant="bordered"
                                        classNames={{
                                            inputWrapper: "h-12 bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 rounded-xl shadow-sm px-4 transition-all",
                                            input: "text-base font-medium text-slate-800 bg-transparent !outline-none !border-none !ring-0 !shadow-none focus:!ring-0"
                                        }}
                                        value={formData.FloorNumber?.toString()}
                                        onValueChange={(val) => setFormData({ ...formData, FloorNumber: Number(val) })}
                                    />
                                </div>

                                <div className="flex flex-col gap-3 pt-2">
                                    <span className="text-sm font-medium text-slate-700">Floor Status</span>
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, Status: 'Active' })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${formData.Status === 'Active' ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-600'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${formData.Status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                            Active
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, Status: 'Inactive' })}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${formData.Status === 'Inactive' ? 'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-600'}`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${formData.Status === 'Inactive' ? 'bg-slate-500' : 'bg-slate-300'}`} />
                                            Inactive
                                        </button>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose} className="font-medium">Cancel</Button>
                                <Button color="primary" onPress={() => handleSubmit(onClose)} className="font-semibold shadow-lg shadow-blue-500/20 text-white">
                                    {editingFloor ? "Update Floor" : "Create Floor"}
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};
