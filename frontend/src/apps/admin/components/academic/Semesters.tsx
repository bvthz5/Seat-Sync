import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem, Chip } from '@heroui/react';
import { Clock, Plus } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { Semester, Program } from '../../types/academic';
import { toast } from '../../../../utils/toast';

interface SemestersProps {
    academicYearId: number | null;
}

export const Semesters: React.FC<SemestersProps> = ({ academicYearId }) => {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [formData, setFormData] = useState({ SemesterName: '', SemesterNumber: 1, ProgramID: '' });

    const fetchData = async () => {
        if (!academicYearId) return;
        try {
            const [semRes, progRes] = await Promise.all([
                academicService.getSemesters({ academicYearId }),
                academicService.getPrograms({ academicYearId })
            ]);

            if (semRes.data?.success) setSemesters(semRes.data.data);
            if (progRes.data?.success) setPrograms(progRes.data.data);
        } catch (error) {
            toast.error("Failed to load data");
        }
    };

    useEffect(() => {
        fetchData();
    }, [academicYearId]);

    const handleCreate = async (onClose: () => void) => {
        if (!academicYearId) return;
        if (!formData.SemesterName || !formData.ProgramID) {
            toast.error("Required fields missing");
            return;
        }
        try {
            await academicService.createSemester({
                ...formData,
                SemesterNumber: Number(formData.SemesterNumber),
                ProgramID: Number(formData.ProgramID),
                AcademicYearID: academicYearId
            });
            toast.success("Semester created");
            fetchData();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create");
        }
    };

    if (!academicYearId) return <div className="p-12 text-center text-slate-400">Please select an Academic Year first</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-800">Semesters</h3>
                    <Chip size="sm" variant="flat" color="primary">{semesters.length}</Chip>
                </div>
                <Button color="primary" onPress={onOpen} startContent={<Plus size={20} />} className="font-semibold text-white">
                    Add Semester
                </Button>
            </div>

            <Table aria-label="Semesters Table">
                <TableHeader>
                    <TableColumn>PROGRAM</TableColumn>
                    <TableColumn>SEMESTER</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No semesters found.">
                    {semesters.map(sem => (
                        <TableRow key={sem.SemesterID}>
                            <TableCell>
                                {programs.find(p => p.ProgramID === sem.ProgramID)?.ProgramName || 'Unknown'}
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-700">{sem.SemesterName}</span>
                                    <span className="text-xs text-slate-400">Sequence: {sem.SemesterNumber}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Chip size="sm" color={sem.IsActive ? "success" : "default"} variant="flat">
                                    {sem.IsActive ? "Active" : "Inactive"}
                                </Chip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Add Semester</ModalHeader>
                            <ModalBody>
                                <Select
                                    label="Program"
                                    placeholder="Select Program"
                                    selectedKeys={formData.ProgramID ? [formData.ProgramID] : []}
                                    onChange={(e) => setFormData({ ...formData, ProgramID: e.target.value })}
                                    variant="bordered"
                                    labelPlacement="outside"
                                >
                                    {programs.map(prog => (
                                        <SelectItem key={prog.ProgramID}>
                                            {prog.ProgramName}
                                        </SelectItem>
                                    ))}
                                </Select>
                                <Input label="Semester Name" placeholder="e.g. Semester 1" value={formData.SemesterName} onValueChange={v => setFormData({ ...formData, SemesterName: v })} variant="bordered" labelPlacement="outside" />
                                <Input type="number" label="Sequence Number" value={formData.SemesterNumber.toString()} onValueChange={v => setFormData({ ...formData, SemesterNumber: Number(v) })} variant="bordered" labelPlacement="outside" />
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
