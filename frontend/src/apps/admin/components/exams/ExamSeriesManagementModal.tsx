import { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input, Chip } from '@heroui/react';
import { Plus, Trash2, BookOpen, AlertTriangle, X, Sparkles, Edit2, Check, ClipboardList, Calendar } from 'lucide-react';
import { SeriesService } from '../../services/seriesService';
import { toast } from 'react-hot-toast';

interface ExamSeriesManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const ExamSeriesManagementModal = ({ isOpen, onClose, onSuccess }: ExamSeriesManagementModalProps) => {
    const [seriesList, setSeriesList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Form state
    const [newName, setNewName] = useState('');
    const [examType, setExamType] = useState<'Internal' | 'EndSemester'>('Internal');
    const [submitting, setSubmitting] = useState(false);

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

    // Edit state
    const [editTarget, setEditTarget] = useState<{ id: number; name: string } | null>(null);
    const [editName, setEditName] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
            setDeleteTarget(null);
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const seriesRes = await SeriesService.getAll();
            if (seriesRes.success) setSeriesList(seriesRes.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load series");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newName || newName.trim() === '') { 
            toast.error("Series name is required"); 
            return; 
        }

        setSubmitting(true);
        try {
            const response = await SeriesService.create({
                SeriesName: newName.trim(),
                ExamType: examType
            });

            if (!response.success) {
                throw new Error(response.message || "Failed to create exam series");
            }

            if (response.success) {
                toast.success("Exam series created successfully");
                setNewName('');
                setExamType('Internal');
                fetchInitialData();
                if (onSuccess) onSuccess();
            }
        } catch (error: any) {
            console.error('Series creation error:', error);
            toast.error(error.response?.data?.message || error.message || "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (id: number, name: string) => {
        setDeleteTarget({ id, name });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await SeriesService.delete(deleteTarget.id);
            toast.success("Series deleted successfully");
            setDeleteTarget(null);
            fetchInitialData();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error("Failed to delete. It might be in use.");
        }
    };

    const handleEditClick = (id: number, name: string) => {
        setEditTarget({ id, name });
        setEditName(name);
    };

    const handleEditSave = async () => {
        if (!editTarget || !editName.trim()) return;
        try {
            await SeriesService.update(editTarget.id, { SeriesName: editName.trim() });
            toast.success("Series name updated");
            setEditTarget(null);
            fetchInitialData();
            if (onSuccess) onSuccess();
        } catch (error) {
            toast.error("Failed to update series");
        }
    };

    // Card accent colors
    const accents = [
        { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
        { bg: 'bg-indigo-50', text: 'text-indigo-600', dot: 'bg-indigo-500' },
        { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-500' },
        { bg: 'bg-cyan-50', text: 'text-cyan-600', dot: 'bg-cyan-500' },
        { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
        { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
    ];

    return (
        <>
            <Modal
                isOpen={isOpen}
                onOpenChange={onClose}
                size="3xl"
                scrollBehavior="inside"
                backdrop="blur"
                classNames={{
                    wrapper: "z-[999]",
                    backdrop: "z-[998] bg-black/40 backdrop-blur-sm",
                    base: "bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden",
                    header: "border-b border-gray-100 py-6 px-8 bg-white",
                    body: "p-0 bg-[#F8FAFC]",
                    footer: "hidden",
                    closeButton: "top-6 right-6 hover:bg-gray-100 text-gray-500",
                }}
            >
                <ModalContent>
                    {(onClose: () => void) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                                        <BookOpen className="text-white" size={20} />
                                    </div>
                                    <div>
                                        <span className="text-xl font-bold text-gray-900">Manage Exam Series</span>
                                        <p className="text-sm font-normal text-gray-500">Create and manage examination series</p>
                                    </div>
                                </div>
                            </ModalHeader>
                            <ModalBody>
                                <div className="p-8 space-y-8">

                                    {/* Create Form Section */}
                                    <div className="bg-white p-7 rounded-2xl border border-gray-100 shadow-sm space-y-6 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-50/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <Sparkles size={16} className="text-blue-600" />
                                            </div>
                                            <h3 className="text-sm font-bold text-gray-800">Create New Series</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                            <div className="space-y-2">
                                                <div id="series-name-label" className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Series Name</div>
                                                <Input
                                                    id="series-name"
                                                    name="seriesName"
                                                    autoComplete="off"
                                                     aria-label="Series Name"
                                                    placeholder="e.g., Internal 1"
                                                    value={newName}
                                                    onValueChange={setNewName}
                                                    variant="bordered"
                                                    size="lg"
                                                    classNames={{
                                                        inputWrapper: "bg-gray-50/50 border-gray-200 group-data-[focus=true]:bg-white group-data-[focus=true]:border-blue-500 transition-all rounded-xl h-12",
                                                        input: "font-medium text-gray-700"
                                                    }}
                                                />
                                            </div>

                                            {/* Exam Type Selector */}
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Exam Type</div>
                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setExamType('Internal')}
                                                        className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 ${
                                                            examType === 'Internal'
                                                                ? 'border-blue-500 bg-blue-50/70 shadow-sm shadow-blue-500/10'
                                                                : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                            examType === 'Internal' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                                                        }`}>
                                                            <ClipboardList size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className={`text-sm font-bold ${examType === 'Internal' ? 'text-blue-700' : 'text-gray-600'}`}>Internal</p>
                                                            <p className="text-[10px] text-gray-400 font-medium">Internal Examination</p>
                                                        </div>
                                                        {examType === 'Internal' && (
                                                            <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                                <Check size={12} className="text-white" strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExamType('EndSemester')}
                                                        className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 ${
                                                            examType === 'EndSemester'
                                                                ? 'border-indigo-500 bg-indigo-50/70 shadow-sm shadow-indigo-500/10'
                                                                : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                            examType === 'EndSemester' ? 'bg-indigo-500 text-white' : 'bg-gray-200 text-gray-500'
                                                        }`}>
                                                            <BookOpen size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className={`text-sm font-bold ${examType === 'EndSemester' ? 'text-indigo-700' : 'text-gray-600'}`}>End Semester</p>
                                                            <p className="text-[10px] text-gray-400 font-medium">End Semester Examination</p>
                                                        </div>
                                                        {examType === 'EndSemester' && (
                                                            <div className="ml-auto w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                                <Check size={12} className="text-white" strokeWidth={3} />
                                                            </div>
                                                        )}
                                                    </button>
                                                </div>

                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4 border-t border-gray-100 relative z-10">
                                            <Button
                                                size="lg"
                                                onPress={handleCreate}
                                                isLoading={submitting}
                                                className="font-semibold bg-blue-600 text-white px-8 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all rounded-xl"
                                                startContent={!submitting && <Plus size={18} />}
                                            >
                                                Create Series
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Existing Series Section */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-gray-700">Existing Series</h3>
                                            <span className="text-xs text-gray-400 font-medium">{seriesList.length} total</span>
                                        </div>

                                        {loading && seriesList.length === 0 ? (
                                            <div className="space-y-3">
                                                {[1, 2].map(i => (
                                                    <div key={i} className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse">
                                                        <div className="p-5 flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-lg bg-gray-100"></div>
                                                            <div className="flex-1 space-y-2">
                                                                <div className="h-4 w-1/3 bg-gray-100 rounded-lg"></div>
                                                                <div className="h-3 w-1/4 bg-gray-50 rounded-lg"></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : seriesList.length === 0 ? (
                                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                                                <BookOpen size={28} className="mx-auto mb-2 text-gray-300" />
                                                <p className="text-sm text-gray-400 font-medium">No series created yet</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                                                {seriesList.map((item, index) => {
                                                    const accent = accents[index % accents.length]!;
                                                    return (
                                                        <div
                                                            key={item.ExamSeriesID}
                                                            className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all"
                                                        >
                                                            <div className="p-5 flex items-center justify-between">
                                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                    <div className={`w-10 h-10 rounded-xl ${accent.bg} ${accent.text} flex items-center justify-center shrink-0`}>
                                                                        <BookOpen size={18} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        {editTarget?.id === item.ExamSeriesID ? (
                                                                            <div className="flex items-center gap-2">
                                                                                <input
                                                                                    type="text"
                                                                                    id={`edit-series-${item.ExamSeriesID}`}
                                                                                    name={`editSeriesName-${item.ExamSeriesID}`}
                                                                                    autoComplete="off"
                                                                                    aria-label="Edit Series Name"
                                                                                    value={editName}
                                                                                    onChange={(e) => setEditName(e.target.value)}
                                                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditTarget(null); }}
                                                                                    className="flex-1 px-3 py-1.5 text-sm font-semibold text-gray-900 border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 bg-blue-50/30"
                                                                                    autoFocus
                                                                                />
                                                                                <Button
                                                                                    isIconOnly
                                                                                    size="sm"
                                                                                    onPress={handleEditSave}
                                                                                    className="bg-blue-600 text-white min-w-7 h-7"
                                                                                    radius="lg"
                                                                                >
                                                                                    <Check size={14} />
                                                                                </Button>
                                                                                <Button
                                                                                    isIconOnly
                                                                                    size="sm"
                                                                                    variant="bordered"
                                                                                    onPress={() => setEditTarget(null)}
                                                                                    className="border-gray-300 text-gray-500 min-w-7 h-7"
                                                                                    radius="lg"
                                                                                >
                                                                                    <X size={14} />
                                                                                </Button>
                                                                            </div>
                                                                        ) : (
                                                                            <h4 className="font-bold text-gray-900 text-sm">{item.SeriesName}</h4>
                                                                        )}
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <Calendar size={12} className="text-gray-400" />
                                                                            <span className="text-xs text-gray-500 font-medium">{item.AcademicYear?.YearName || '–'}</span>
                                                                            <span className="text-gray-200">•</span>
                                                                            <Chip
                                                                                size="sm"
                                                                                variant="flat"
                                                                                className={item.ExamType === 'EndSemester'
                                                                                    ? "bg-indigo-50 text-indigo-700 border-none h-5 text-[10px]"
                                                                                    : "bg-blue-50 text-blue-700 border-none h-5 text-[10px]"
                                                                                }
                                                                            >
                                                                                {item.ExamType === 'EndSemester' ? 'End Sem' : 'Internal'}
                                                                            </Chip>
                                                                            <span className="text-gray-200">•</span>
                                                                            <Chip
                                                                                size="sm"
                                                                                variant="flat"
                                                                                className={item.IsActive
                                                                                    ? "bg-emerald-50 text-emerald-700 border-none h-5 text-[10px]"
                                                                                    : "bg-gray-50 text-gray-500 border-none h-5 text-[10px]"
                                                                                }
                                                                            >
                                                                                {item.IsActive ? "Active" : "Archived"}
                                                                            </Chip>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1 shrink-0 ml-3">
                                                                    <Button
                                                                        isIconOnly
                                                                        size="sm"
                                                                        variant="light"
                                                                        onPress={() => handleEditClick(item.ExamSeriesID, item.SeriesName)}
                                                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all"
                                                                    >
                                                                        <Edit2 size={15} />
                                                                    </Button>
                                                                    <Button
                                                                        isIconOnly
                                                                        size="sm"
                                                                        variant="light"
                                                                        onPress={() => handleDeleteClick(item.ExamSeriesID, item.SeriesName)}
                                                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                                    >
                                                                        <Trash2 size={15} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteTarget}
                onOpenChange={() => setDeleteTarget(null)}
                size="sm"
                backdrop="blur"
                classNames={{
                    wrapper: "z-[1001]",
                    backdrop: "z-[1000] bg-black/30 backdrop-blur-sm",
                    base: "bg-white border border-gray-200 shadow-2xl rounded-2xl overflow-hidden",
                    header: "hidden",
                    body: "p-0",
                    footer: "hidden",
                    closeButton: "hidden",
                }}
            >
                <ModalContent>
                    <ModalBody>
                        <div className="p-8 text-center space-y-5">
                            {/* Warning Icon */}
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
                                <AlertTriangle size={28} className="text-red-500" />
                            </div>

                            {/* Text */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Delete Series?</h3>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    Are you sure you want to delete <strong className="text-gray-800">{deleteTarget?.name}</strong>?
                                    This may fail if exams are linked to it.
                                </p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="bordered"
                                    className="flex-1 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                                    onPress={() => setDeleteTarget(null)}
                                    size="lg"
                                    radius="lg"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1 bg-red-500 text-white font-semibold shadow-lg shadow-red-500/20 hover:bg-red-600"
                                    onPress={confirmDelete}
                                    size="lg"
                                    radius="lg"
                                    startContent={<Trash2 size={16} />}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

export default ExamSeriesManagementModal;
