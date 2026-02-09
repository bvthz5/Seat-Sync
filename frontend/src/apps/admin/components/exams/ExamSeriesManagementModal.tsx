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
                            {/* Create Form Section */}
                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-8 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-8 w-1 bg-blue-500 rounded-full" />
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Create New Series</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                    <div className="space-y-2.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Series Name</label>
                                        <Input
                                            placeholder="e.g., Internal 1"
                                            value={newName}
                                            onValueChange={setNewName}
                                            variant="bordered"
                                            size="lg"
                                            classNames={{
                                                inputWrapper: "bg-slate-50 border-transparent shadow-inner group-data-[focus=true]:bg-white group-data-[focus=true]:border-blue-500 group-data-[focus=true]:shadow-lg transition-all rounded-xl",
                                                input: "font-semibold text-slate-700"
                                            }}
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Academic Year</label>
                                            <button
                                                onClick={() => setIsCreatingYear(!isCreatingYear)}
                                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${isCreatingYear
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm'}`}
                                            >
                                                {isCreatingYear ? (
                                                    <>Cancel</>
                                                ) : (
                                                    <><Plus size={10} strokeWidth={4} /> Add New</>
                                                )}
                                            </button>
                                        </div>

                                        {isCreatingYear ? (
                                            <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Start Year</label>
                                                    <select
                                                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer appearance-none"
                                                        value={startYear}
                                                        onChange={(e) => setStartYear(e.target.value)}
                                                    >
                                                        {Array.from({ length: 5 }).map((_, i) => {
                                                            const y = new Date().getFullYear() - 1 + i;
                                                            return <option key={y} value={y}>{y}</option>
                                                        })}
                                                    </select>
                                                </div>
                                                <div className="flex items-center pt-6 text-slate-300">
                                                    <div className="w-4 h-0.5 bg-slate-300 rounded-full"></div>
                                                </div>
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">End Year</label>
                                                    <select
                                                        className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer appearance-none"
                                                        value={endYear}
                                                        onChange={(e) => setEndYear(e.target.value)}
                                                    >
                                                        {Array.from({ length: 5 }).map((_, i) => {
                                                            const y = new Date().getFullYear() + i;
                                                            return <option key={y} value={y}>{y}</option>
                                                        })}
                                                    </select>
                                                </div>
                                            </div>
                                        ) : (
                                            <Select
                                                placeholder="Select Year"
                                                selectedKeys={selectedYear ? [selectedYear] : []}
                                                onChange={(e) => setSelectedYear(e.target.value)}
                                                variant="bordered"
                                                size="lg"
                                                classNames={{
                                                    trigger: "bg-slate-50 border-transparent shadow-inner data-[hover=true]:bg-slate-100 data-[focus=true]:bg-white data-[focus=true]:border-blue-500 data-[focus=true]:shadow-lg rounded-xl transition-all relative h-12",
                                                    value: "font-semibold text-slate-700",
                                                    popoverContent: "bg-white border border-slate-100 shadow-xl rounded-xl",
                                                    selectorIcon: "absolute right-3"
                                                }}
                                            >
                                                {years.map((y) => (
                                                    <SelectItem key={String(y.AcademicYearID)} textValue={y.YearName} classNames={{ title: "font-semibold text-slate-700" }}>
                                                        {y.YearName}
                                                    </SelectItem>
                                                ))}
                                            </Select>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t border-slate-50">
                                    <Button
                                        size="lg"
                                        onPress={handleCreate}
                                        isLoading={submitting}
                                        className="font-bold bg-blue-600 text-white px-8 shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:bg-blue-700 transition-all rounded-xl"
                                        startContent={!submitting && <Plus size={20} />}
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
                                    <Table
                                        aria-label="Exam Series Table"
                                        removeWrapper
                                        classNames={{
                                            base: "border border-slate-100 rounded-2xl overflow-hidden",
                                            th: "bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider py-4",
                                            td: "py-4 text-slate-700 font-medium border-b border-slate-50 last:border-0",
                                            tr: "hover:bg-slate-50/50 transition-colors"
                                        }}
                                    >
                                        <TableHeader>
                                            <TableColumn>NAME</TableColumn>
                                            <TableColumn>YEAR</TableColumn>
                                            <TableColumn align="center">ACTIONS</TableColumn>
                                        </TableHeader>
                                        <TableBody emptyContent={
                                            <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                                                <BookOpen size={32} className="mb-2 opacity-20" />
                                                <p className="text-sm font-medium">No series found</p>
                                            </div>
                                        }>
                                            {seriesList.map((item) => (
                                                <TableRow key={item.ExamSeriesID}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                                <BookOpen size={14} strokeWidth={2.5} />
                                                            </div>
                                                            <span className="font-bold text-slate-800">{item.SeriesName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                                                            {item.AcademicYear?.YearName}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            isIconOnly
                                                            size="sm"
                                                            variant="light"
                                                            color="danger"
                                                            onPress={() => handleDelete(item.ExamSeriesID)}
                                                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
