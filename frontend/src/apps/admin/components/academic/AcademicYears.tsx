import React, { useEffect, useState } from 'react';
import { Card, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, useDisclosure, Chip } from '@heroui/react';
import { Plus, Calendar, CheckCircle2, Clock, Trash2, Edit } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { AcademicYear } from '../../types/academic';
import { toast } from '../../../../utils/toast';

interface AcademicYearsProps {
    onYearChange: () => void; // Callback to refresh parent state
}

export const AcademicYears: React.FC<AcademicYearsProps> = ({ onYearChange }) => {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(false);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [formData, setFormData] = useState({ YearName: '', StartDate: '', EndDate: '' });

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
        if (!formData.YearName || !formData.StartDate || !formData.EndDate) {
            toast.error("All fields are required");
            return;
        }
        try {
            await academicService.createYear(formData);
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
            onYearChange(); // Notify parent
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="text-blue-600" size={24} />
                    Academic Years
                </h3>
                <Button color="primary" onPress={onOpen} startContent={<Plus size={20} />} className="font-semibold text-white shadow-lg shadow-blue-500/30">
                    Add Year
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {years.map(year => (
                    <Card key={year.AcademicYearID} className={`p-6 border-2 transition-all hover:scale-[1.02] cursor-default ${year.IsCurrent ? 'border-blue-500 bg-blue-50/50 shadow-blue-500/10' : 'border-slate-100 hover:border-slate-300'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-lg font-bold text-slate-900">{year.YearName}</h4>
                                <div className="text-xs text-slate-500 font-mono mt-1">ID: {year.AcademicYearID}</div>
                            </div>
                            {year.IsCurrent ? (
                                <Chip color="primary" variant="flat" startContent={<CheckCircle2 size={14} />} className="font-bold">Active</Chip>
                            ) : (
                                <Chip variant="flat" className="text-slate-500">Archived</Chip>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Start:</span>
                                <span className="font-medium text-slate-700">{year.StartDate}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">End:</span>
                                <span className="font-medium text-slate-700">{year.EndDate}</span>
                            </div>
                        </div>

                        <div className="mt-auto">
                            {!year.IsCurrent && (
                                <Button
                                    fullWidth
                                    variant="ghost"
                                    color="primary"
                                    className="font-semibold"
                                    onPress={() => handleSetCurrent(year.AcademicYearID)}
                                >
                                    Set as Current
                                </Button>
                            )}
                            {year.IsCurrent && (
                                <div className="text-center text-xs font-bold text-blue-600 uppercase tracking-wider py-2 bg-blue-100/50 rounded-lg">
                                    Current Session
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Create Academic Year</ModalHeader>
                            <ModalBody>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-600">Year Name</label>
                                        <Input
                                            aria-label="Year Name"
                                            placeholder="e.g. 2025-2026"
                                            value={formData.YearName}
                                            onValueChange={v => setFormData({ ...formData, YearName: v })}
                                            variant="bordered"
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-sm font-medium text-slate-600">Start Date</label>
                                            <Input
                                                aria-label="Start Date"
                                                type="date"
                                                value={formData.StartDate}
                                                onValueChange={v => setFormData({ ...formData, StartDate: v })}
                                                variant="bordered"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-sm font-medium text-slate-600">End Date</label>
                                            <Input
                                                aria-label="End Date"
                                                type="date"
                                                value={formData.EndDate}
                                                onValueChange={v => setFormData({ ...formData, EndDate: v })}
                                                variant="bordered"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>Cancel</Button>
                                <Button color="primary" className="text-white" onPress={() => handleCreate(onClose)}>Create</Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
};
