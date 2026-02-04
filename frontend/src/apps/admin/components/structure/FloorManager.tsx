import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, useDisclosure, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Autocomplete, AutocompleteItem, Tooltip } from '@heroui/react';
import { Plus, Edit, Trash2, Layers, Building2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
        if (formData.FloorNumber === undefined || formData.FloorNumber === null || isNaN(formData.FloorNumber)) {
            toast.error("Valid Floor Number is required");
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
            {/* Control Panel */}
            <div className={`flex-none p-6 rounded-3xl border flex flex-col md:flex-row gap-6 justify-between items-end transition-all relative overflow-hidden ${!selectedBlockId ? 'bg-amber-50 border-amber-200' : 'bg-gradient-to-br from-white to-blue-50/20 border-slate-200 shadow-xl shadow-slate-100/50'}`}>
                {selectedBlockId && <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />}

                <div className="flex flex-col gap-2 w-full md:w-1/2 z-10">
                    <label htmlFor="block-select" className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                        Select Building Block
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
                            selectorButton: "text-slate-500",
                            popoverContent: "bg-white p-2 border border-slate-100 shadow-2xl rounded-xl w-full"
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
                        <Autocomplete
                            id="floor-status-filter"
                            name="floor-status-filter"
                            placeholder="Status"
                            aria-label="Filter by status"
                            size="sm"
                            className="w-[140px]"
                            variant="bordered"
                            selectedKey={statusFilter}
                            onSelectionChange={(key) => { setStatusFilter(key ? key.toString() : "all"); setPage(1); }}
                            classNames={{
                                base: "w-[140px]",
                                selectorButton: "text-slate-500"
                            }}
                            inputProps={{
                                classNames: {
                                    inputWrapper: "bg-white border-1 border-slate-200 data-[hover=true]:border-blue-400 group-data-[focus=true]:border-blue-600 shadow-sm rounded-xl h-11 transition-all",
                                    input: "text-slate-700 font-medium"
                                }
                            }}
                        >
                            <AutocompleteItem key="all" textValue="All">All</AutocompleteItem>
                            <AutocompleteItem key="Active" textValue="Active">Active</AutocompleteItem>
                            <AutocompleteItem key="Inactive" textValue="Inactive">Inactive</AutocompleteItem>
                        </Autocomplete>
                    </div>

                    {!readOnly && selectedBlockId && (
                        <Button
                            onPress={() => handleOpen()}
                            color="primary"
                            size="lg"
                            startContent={<Plus size={20} strokeWidth={2.5} />}
                            className="font-bold shadow-lg shadow-blue-600/20 rounded-xl h-[48px] px-8 text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-[1.02] transition-transform"
                        >
                            Add Floor
                        </Button>
                    )}
                </div>
            </div>

            {/* Pagination Info Top */}
            {selectedBlockId && (
                <div className="flex-none flex justify-between items-center px-4 -mb-2 z-10">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Showing <span className="text-slate-900">{(floors?.length || 0) === 0 ? 0 : (page - 1) * limit + 1}</span> - <span className="text-slate-900">{Math.min(page * limit, totalItems)}</span> of <span className="text-slate-900">{totalItems}</span>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 relative z-0">
                {!selectedBlockId ? (
                    // Empty State
                    <div className="h-full flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
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
                    <Table
                        isHeaderSticky
                        aria-label="Floors table"
                        classNames={{
                            base: "h-full",
                            wrapper: "bg-white shadow-sm border border-slate-200 rounded-3xl p-0 h-full overflow-auto custom-scrollbar",
                            th: "bg-slate-50/50 text-slate-500 font-bold text-[11px] uppercase tracking-wider py-4 px-6 border-b border-slate-100",
                            td: "py-4 px-6 border-b border-slate-50 group-last:border-0",
                            tr: "hover:bg-blue-50/30 transition-colors cursor-default"
                        }}
                    >
                        <TableHeader columns={columns}>
                            {(column) => (
                                <TableColumn
                                    key={column.uid}
                                    align={column.uid === "actions" ? "end" : column.uid === "status" ? "center" : "start"}
                                    className={column.uid === "actions" ? "text-right" : column.uid === "status" ? "text-center" : "text-left"}
                                >
                                    {column.name}
                                </TableColumn>
                            )}
                        </TableHeader>
                        <TableBody
                            items={floors}
                            isLoading={loading}
                            emptyContent={
                                <div className="py-20 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inset">
                                        <Layers className="text-slate-300" size={32} strokeWidth={1.5} />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-700 mb-1">No floors found</h4>
                                    <p className="text-slate-400 text-sm max-w-xs mx-auto">
                                        This block doesn't have any floors yet.
                                    </p>
                                    {!readOnly && <Button variant="light" color="primary" className="mt-4 font-bold" onPress={() => handleOpen()}>Create First Floor</Button>}
                                </div>
                            }
                        >
                            {(floor) => (
                                <TableRow key={floor.FloorID}>
                                    <TableCell>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-white">
                                                <Layers size={18} strokeWidth={2.5} />
                                            </div>
                                            <div>
                                                <span className="block font-bold text-slate-800 text-sm">Floor {floor.FloorNumber}</span>
                                                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wide mt-0.5">ID: {floor.FloorID}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Building2 size={14} className="text-slate-400" />
                                            <span className="text-slate-700 font-semibold text-sm">
                                                {blocks.find(b => b.BlockID === floor.BlockID)?.BlockName}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex justify-center">
                                            <StatusBadge status={floor.Status} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {!readOnly && (
                                            <div className="flex justify-end gap-1">
                                                <Tooltip content="Edit Floor">
                                                    <Button isIconOnly size="sm" variant="light" onPress={() => handleOpen(floor)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                                                        <Edit size={16} strokeWidth={2} />
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip content="Delete Floor" color="danger">
                                                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDelete(floor.FloorID)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                        <Trash2 size={16} strokeWidth={2} />
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Floating Pagination */}
            {selectedBlockId && totalPages > 1 && (
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
                                    <label htmlFor="modal-floor-block" className="text-sm font-semibold text-slate-700 ml-1">
                                        Building Block
                                    </label>
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
                                    <label htmlFor="modal-floor-number" className="text-sm font-semibold text-slate-700 ml-1">
                                        Floor Number
                                    </label>
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
