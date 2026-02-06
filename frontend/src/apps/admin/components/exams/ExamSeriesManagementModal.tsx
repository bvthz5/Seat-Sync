import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Table, TableHeader, TableBody, TableColumn, TableRow, TableCell } from '@heroui/react';
import { Plus, Trash2, Calendar, BookOpen } from 'lucide-react';
import { SeriesService } from '../../services/seriesService';
import { academicService } from '../../services/academicService';
import { toast } from 'react-hot-toast';

interface ExamSeriesManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const ExamSeriesManagementModal = ({ isOpen, onClose, onSuccess }: ExamSeriesManagementModalProps) => {
    const [seriesList, setSeriesList] = useState<any[]>([]);
    const [years, setYears] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [submitting, setSubmitting] = useState(false);

    // Integrated Year Creation State
    const [isCreatingYear, setIsCreatingYear] = useState(false);
    const [startYear, setStartYear] = useState<string>(new Date().getFullYear().toString());
    const [endYear, setEndYear] = useState<string>((new Date().getFullYear() + 1).toString());
    const [newYearName, setNewYearName] = useState<string>("");

    // Auto-generate Year Name
    useEffect(() => {
        if (startYear && endYear) {
            setNewYearName(`${startYear}-${endYear.slice(-2)}`);
        }
    }, [startYear, endYear]);

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [seriesRes, yearsRes] = await Promise.all([
                SeriesService.getAll(),
                academicService.getYears()
            ]);

            if (seriesRes.success) setSeriesList(seriesRes.data);
            setYears(yearsRes.data.data || yearsRes.data); // Handle both {data: {data: []}} and {data: []}

            // Auto-select current year if available
            const currentYear = (yearsRes.data.data || yearsRes.data).find((y: any) => y.IsCurrent);
            if (currentYear) setSelectedYear(String(currentYear.AcademicYearID));

        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName) {
            toast.error("Series name is required");
            return;
        }

        if (!isCreatingYear && !selectedYear) {
            toast.error("Please select an academic year");
            return;
        }

        setSubmitting(true);
        try {
            let yearID = parseInt(selectedYear);

            // 1. Create Academic Year if in creation mode
            if (isCreatingYear) {
                const academicStartDate = `${startYear}-06-01`;
                const academicEndDate = `${endYear}-05-31`;

                const yearRes = await academicService.createYear({
                    YearName: newYearName,
                    StartDate: academicStartDate,
                    EndDate: academicEndDate
                });

                if (yearRes.data?.success || yearRes.success) {
                    const createdYear = yearRes.data?.data || yearRes.data;
                    yearID = createdYear.AcademicYearID;
                } else {
                    throw new Error("Failed to create academic year");
                }
            }

            // 2. Create Series
            const response = await SeriesService.create({
                SeriesName: newName,
                AcademicYearID: yearID,
                Description: `${newName} session`
            });

            if (response.success) {
                toast.success(isCreatingYear ? "Year & Series created" : "Exam series created");
                setNewName('');
                setIsCreatingYear(false);
                fetchInitialData();
                if (onSuccess) onSuccess();
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? This may fail if exams are linked.")) return;
        try {
            await SeriesService.delete(id);
            toast.success("Series deleted");
            fetchInitialData();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error("Failed to delete. It might be in use.");
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onClose}
            size="3xl"
            scrollBehavior="inside"
            backdrop="blur"
            classNames={{
                wrapper: "z-[999]",
                backdrop: "z-[998] bg-black/50",
                base: "bg-white border-none shadow-2xl !opacity-100",
                header: "bg-white border-b border-slate-100 rounded-t-2xl !opacity-100",
                body: "bg-white !opacity-100",
                footer: "bg-white rounded-b-2xl !opacity-100"
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1 pb-4 px-8 bg-white">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-full">
                                    <BookOpen className="text-blue-600" size={20} />
                                </div>
                                <span className="text-xl font-bold text-slate-900">Manage Exam Series</span>
                            </div>
                        </ModalHeader>
                        <ModalBody className="py-8 px-8 space-y-10 bg-white">
                            {/* Create Form Section */}
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Create New Series</h3>
                                <div className="grid grid-cols-1 gap-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Series Name</label>
                                            <Input
                                                placeholder="e.g., Internal 1"
                                                value={newName}
                                                onValueChange={setNewName}
                                                variant="bordered"
                                                size="md"
                                                classNames={{
                                                    inputWrapper: "bg-white border-slate-200"
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-sm font-bold text-slate-700">Academic Year</label>
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    color={isCreatingYear ? "danger" : "primary"}
                                                    className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider"
                                                    onPress={() => setIsCreatingYear(!isCreatingYear)}
                                                >
                                                    {isCreatingYear ? "Cancel" : "New Year"}
                                                </Button>
                                            </div>

                                            {isCreatingYear ? (
                                                <div className="grid grid-cols-2 gap-2 p-3 bg-white border-2 border-dashed border-blue-200 rounded-xl animate-in fade-in zoom-in duration-200">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Start</label>
                                                        <select
                                                            className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
                                                            value={startYear}
                                                            onChange={(e) => setStartYear(e.target.value)}
                                                        >
                                                            {Array.from({ length: 5 }).map((_, i) => {
                                                                const y = new Date().getFullYear() - 1 + i;
                                                                return <option key={y} value={y}>{y}</option>
                                                            })}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-500 uppercase">End</label>
                                                        <select
                                                            className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium outline-none focus:border-blue-500"
                                                            value={endYear}
                                                            onChange={(e) => setEndYear(e.target.value)}
                                                        >
                                                            {Array.from({ length: 5 }).map((_, i) => {
                                                                const y = new Date().getFullYear() + i;
                                                                return <option key={y} value={y}>{y}</option>
                                                            })}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2 text-center mt-1">
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-tighter">
                                                            Creating: {newYearName}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Select
                                                    placeholder="Select Year"
                                                    selectedKeys={selectedYear ? [selectedYear] : []}
                                                    onChange={(e) => setSelectedYear(e.target.value)}
                                                    variant="bordered"
                                                    size="md"
                                                    classNames={{
                                                        trigger: "bg-white border-slate-200"
                                                    }}
                                                >
                                                    {years.map((y) => (
                                                        <SelectItem key={String(y.AcademicYearID)} textValue={y.YearName}>
                                                            {y.YearName}
                                                        </SelectItem>
                                                    ))}
                                                </Select>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button
                                        size="md"
                                        startContent={<Plus size={18} />}
                                        onPress={handleCreate}
                                        isLoading={submitting}
                                        className="font-bold bg-blue-600 text-white px-8 shadow-lg shadow-blue-500/30"
                                    >
                                        Create Series
                                    </Button>
                                </div>
                            </div>

                            {/* List Section */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Existing Series</h3>
                                {loading && seriesList.length === 0 ? (
                                    <div className="text-center py-12 text-slate-400">
                                        <Calendar className="mx-auto mb-2 opacity-20" size={48} />
                                        <p>Loading series...</p>
                                    </div>
                                ) : (
                                    <Table aria-label="Exam Series Table" removeWrapper classNames={{ th: "bg-slate-100 text-slate-600 font-bold", td: "py-4 text-slate-700" }}>
                                        <TableHeader>
                                            <TableColumn>NAME</TableColumn>
                                            <TableColumn>YEAR</TableColumn>
                                            <TableColumn align="center">ACTIONS</TableColumn>
                                        </TableHeader>
                                        <TableBody emptyContent="No series created yet.">
                                            {seriesList.map((item) => (
                                                <TableRow key={item.ExamSeriesID} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                                    <TableCell><span className="font-bold text-slate-900">{item.SeriesName}</span></TableCell>
                                                    <TableCell>{item.AcademicYear?.YearName}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            color="danger"
                                                            onPress={() => handleDelete(item.ExamSeriesID)}
                                                            className="hover:bg-red-50"
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </ModalBody>
                    </>
                )}
            </ModalContent>
        </Modal >
    );
};

export default ExamSeriesManagementModal;
