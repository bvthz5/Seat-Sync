import React, { useEffect, useState } from 'react';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tooltip, Pagination, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@heroui/react';
import { Plus, Calendar, Search, MoreVertical, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { AcademicYear } from '../../types/academic';
import { toast } from '../../../../utils/toast';

interface AcademicYearsProps {
    onYearChange: () => void;
}

export const AcademicYears: React.FC<AcademicYearsProps> = ({ onYearChange }) => {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(false);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    // New simplified state for Year Selection
    const [startYear, setStartYear] = useState<string>(new Date().getFullYear().toString());
    const [endYear, setEndYear] = useState<string>((new Date().getFullYear() + 1).toString());
    const [yearName, setYearName] = useState<string>("");

    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const rowsPerPage = 5;

    // Auto-generate Year Name when selections change
    useEffect(() => {
        if (startYear && endYear) {
            setYearName(`${startYear}-${endYear.slice(-2)}`);
        }
    }, [startYear, endYear]);

    const fetchYears = async () => {
        try {
            setLoading(true);
            const res = await academicService.getYears();
            if (res.data && res.data.success) {
                setYears(res.data.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load academic years");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchYears();
    }, []);

    const handleCreate = async (onClose: () => void) => {
        if (!startYear || !endYear || !yearName) {
            toast.error("All fields are required");
            return;
        }

        // Construct dates for backend (assuming June 1st to May 31st academic cycle)
        const academicStartDate = `${startYear}-06-01`;
        const academicEndDate = `${endYear}-05-31`;

        const payload = {
            YearName: yearName,
            StartDate: academicStartDate,
            EndDate: academicEndDate
        };

        try {
            await academicService.createYear(payload);
            toast.success("Academic Year created");
            fetchYears();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create");
        }
    };

    const handleSetCurrent = async (id: number) => {
        try {
            await academicService.setCurrentYear(id);
            toast.success("Current academic year updated");
            fetchYears();
            onYearChange();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this academic year? This action cannot be undone.")) return;
        try {
            await academicService.deleteYear(id);
            toast.success("Academic Year deleted");
            fetchYears();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to delete");
        }
    };

    const filteredYears = years.filter(year =>
        year.YearName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pages = Math.ceil(filteredYears.length / rowsPerPage);
    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filteredYears.slice(start, start + rowsPerPage);
    }, [page, filteredYears]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
            {/* Toolbar */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white gap-4">
                <Input id="field-iteksfz" name="field-iteksfz" aria-label="Search academic years..." isClearable
                    classNames={{
                        base: "w-full sm:max-w-[44%]",
                        inputWrapper: "border-1 bg-slate-50 hover:bg-white data-[hover=true]:bg-white group-data-[focus=true]:bg-white transition-colors",
                    }}
                    placeholder="Search academic years..."
                    size="sm"
                    startContent={<Search className="text-slate-400" size={16} />}
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    variant="bordered"
                />
                <Button
                    onPress={onOpen}
                    color="primary"
                    className="font-semibold text-white shadow-md shadow-blue-500/20"
                    size="sm"
                    startContent={<Plus size={18} />}
                >
                    Add Academic Year
                </Button>
            </div>

            {/* Table */}
            <Table
                aria-label="Academic Years Table"
                shadow="none"
                classNames={{
                    wrapper: "p-0 rounded-none shadow-none",
                    th: "bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider h-12 border-b border-slate-100",
                    td: "border-b border-slate-50 h-16 group-[.is-last]:border-none",
                    thead: "[&>tr]:first:shadow-none",
                }}
            >
                <TableHeader>
                    <TableColumn className="pl-6">YEAR NAME</TableColumn>
                    <TableColumn>START DATE</TableColumn>
                    <TableColumn>END DATE</TableColumn>
                    <TableColumn className="w-[150px]">
                        <div className="flex items-center gap-1">
                            STATE
                            <Tooltip content="The Current Session is the default academic year used for all active operations.">
                                <span className="cursor-help text-slate-400">?</span>
                            </Tooltip>
                        </div>
                    </TableColumn>
                    <TableColumn align="end" className="pr-6">ACTIONS</TableColumn>
                </TableHeader>
                <TableBody emptyContent={<div className='p-12 text-center text-slate-400'>No academic years found.</div>} items={items}>
                    {(year) => (
                        <TableRow key={year.AcademicYearID} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-6">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700 text-sm">{year.YearName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">ID: {year.AcademicYearID}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className="text-slate-600 font-medium text-sm">{year.StartDate}</span>
                            </TableCell>
                            <TableCell>
                                <span className="text-slate-600 font-medium text-sm">{year.EndDate}</span>
                            </TableCell>
                            <TableCell>
                                {year.IsCurrent ? (
                                    <Chip
                                        color="primary"
                                        size="sm"
                                        variant="flat"
                                        className="font-bold text-xs px-2"
                                        startContent={<CheckCircle2 size={12} />}
                                    >
                                        Current Session
                                    </Chip>
                                ) : (
                                    <span className="text-slate-400 text-xs font-medium pl-2">-</span>
                                )}
                            </TableCell>
                            <TableCell className="pr-6">
                                <div className="flex justify-end gap-2">
                                    <Dropdown>
                                        <DropdownTrigger>
                                            <Button isIconOnly size="sm" variant="light">
                                                <MoreVertical size={20} className="text-slate-400" />
                                            </Button>
                                        </DropdownTrigger>
                                        <DropdownMenu aria-label="Year Actions">
                                            <DropdownItem
                                                key="edit"
                                                startContent={<Edit size={16} className="text-slate-500" />}
                                            >
                                                Edit Year
                                            </DropdownItem>
                                            {year.IsCurrent ? (
                                                <DropdownItem className="hidden" key="hidden">Hidden</DropdownItem>
                                            ) : (
                                                <DropdownItem
                                                    key="current"
                                                    startContent={<CheckCircle2 size={16} className="text-blue-500" />}
                                                    onPress={() => handleSetCurrent(year.AcademicYearID)}
                                                >
                                                    Set as Current
                                                </DropdownItem>
                                            )}
                                            <DropdownItem
                                                key="delete"
                                                className="text-danger"
                                                color="danger"
                                                startContent={<Trash2 size={16} />}
                                                onPress={() => handleDelete(year.AcademicYearID)}
                                                isDisabled={year.IsCurrent}
                                                description={year.IsCurrent ? "Cannot delete active year" : undefined}
                                            >
                                                Delete Year
                                            </DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex w-full justify-between items-center p-4 border-t border-slate-100 mt-auto">
                <span className="text-xs text-slate-400 font-medium">
                    Showing {items.length > 0 ? (page - 1) * rowsPerPage + 1 : 0} to {Math.min(page * rowsPerPage, filteredYears.length)} of {filteredYears.length} entries
                </span>
                <Pagination
                    isCompact
                    showControls
                    color="primary"
                    page={page}
                    total={pages}
                    onChange={setPage}
                    classNames={{
                        cursor: "bg-blue-600 shadow-blue-500/20 font-bold",
                    }}
                />
            </div>

            {/* Modal */}
            {/* Modal */}
            <Modal
                isOpen={isOpen}
                onOpenChange={onOpenChange}
                placement="center"
                backdrop="blur"
                classNames={{
                    base: "rounded-2xl shadow-xl",
                    header: "border-b border-slate-100 py-4",
                    footer: "border-t border-slate-100 py-4"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <span className="text-xl font-bold text-slate-800">Create Academic Year</span>
                                <span className="text-xs font-normal text-slate-500">Define a new academic session for the institution.</span>
                            </ModalHeader>
                            <ModalBody className="py-6">
                                <div className="space-y-6">

                                    {/* Auto-Generated Name */}
                                    <div className="space-y-2">
                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Year Name</div>
                                        <Input id="field-93nrw97" name="field-93nrw97" aria-label="Year Name"
                                            value={yearName}
                                            onValueChange={setYearName}
                                            variant="faded"
                                            color="primary"
                                            classNames={{
                                                input: "text-lg font-bold text-slate-700",
                                                inputWrapper: "h-14 bg-slate-50 border-slate-200"
                                            }}
                                            description="Auto-generated format (YYYY-YY)"
                                        />
                                    </div>

                                    {/* Year Selectors */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Start Year</div>
                                            <select
                                                className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                value={startYear}
                                                onChange={(e) => setStartYear(e.target.value)}
                                            >
                                                {Array.from({ length: 10 }).map((_, i) => {
                                                    const y = new Date().getFullYear() - 2 + i;
                                                    return <option key={y} value={y}>{y}</option>
                                                })}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">End Year</div>
                                            <select
                                                className="w-full h-12 px-4 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                value={endYear}
                                                onChange={(e) => setEndYear(e.target.value)}
                                            >
                                                {Array.from({ length: 10 }).map((_, i) => {
                                                    const y = new Date().getFullYear() - 1 + i;
                                                    return <option key={y} value={y}>{y}</option>
                                                })}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start">
                                        <Calendar className="text-blue-600 mt-0.5" size={16} />
                                        <div className="text-xs text-blue-900 leading-relaxed">
                                            The academic session will be set from <strong>June 1, {startYear}</strong> to <strong>May 31, {endYear}</strong>. You can adjust specific dates later if needed.
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" className="font-medium text-slate-500" onPress={onClose}>Cancel</Button>
                                <Button
                                    className="bg-[#0F172A] text-white font-semibold shadow-lg shadow-slate-900/20"
                                    onPress={() => handleCreate(onClose)}
                                >
                                    Create Session
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};
