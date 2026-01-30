import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem, Chip } from '@heroui/react';
import { Book, Plus } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { Program, Department } from '../../types/academic';
import { toast } from '../../../../utils/toast';

interface ProgramsProps {
    academicYearId: number | null;
}

export const Programs: React.FC<ProgramsProps> = ({ academicYearId }) => {
    const [programs, setPrograms] = useState<Program[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]); // For dropdown
    const [loading, setLoading] = useState(false);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [formData, setFormData] = useState({ ProgramName: '', ProgramCode: '', DurationYears: 4, DepartmentID: '' });

    const fetchData = async () => {
        if (!academicYearId) return;
        try {
            setLoading(true);
            const [progRes, deptRes] = await Promise.all([
                academicService.getPrograms({ academicYearId }),
                academicService.getDepartments({ academicYearId })
            ]);

            if (progRes.data?.success) setPrograms(progRes.data.data);
            if (deptRes.data?.success) setDepartments(deptRes.data.data);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [academicYearId]);

    const handleCreate = async (onClose: () => void) => {
        if (!academicYearId) return;
        if (!formData.ProgramName || !formData.ProgramCode || !formData.DepartmentID) {
            toast.error("All fields are required");
            return;
        }
        try {
            await academicService.createProgram({
                ...formData,
                DurationYears: Number(formData.DurationYears),
                DepartmentID: Number(formData.DepartmentID),
                AcademicYearID: academicYearId
            });
            toast.success("Program created");
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
                    <h3 className="text-xl font-bold text-slate-800">Programs</h3>
                    <Chip size="sm" variant="flat" color="primary">{programs.length}</Chip>
                </div>
                <Button color="primary" onPress={onOpen} startContent={<Plus size={20} />} className="font-semibold text-white">
                    Add Program
                </Button>
            </div>

            <Table aria-label="Programs Table">
                <TableHeader>
                    <TableColumn>CODE</TableColumn>
                    <TableColumn>NAME</TableColumn>
                    <TableColumn>DEPARTMENT</TableColumn>
                    <TableColumn>DURATION</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No programs found.">
                    {programs.map(prog => (
                        <TableRow key={prog.ProgramID}>
                            <TableCell><span className="font-mono font-bold text-slate-700">{prog.ProgramCode}</span></TableCell>
                            <TableCell><span className="font-medium text-slate-900">{prog.ProgramName}</span></TableCell>
                            <TableCell>
                                {departments.find(d => d.DepartmentID === prog.DepartmentID)?.DepartmentName || 'Unknown'}
                            </TableCell>
                            <TableCell>{prog.DurationYears} Years</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Add Program</ModalHeader>
                            <ModalBody>
                                <Select
                                    label="Department"
                                    placeholder="Select Department"
                                    selectedKeys={formData.DepartmentID ? [formData.DepartmentID] : []}
                                    onChange={(e) => setFormData({ ...formData, DepartmentID: e.target.value })}
                                    variant="bordered"
                                    labelPlacement="outside"
                                >
                                    {departments.map(dept => (
                                        <SelectItem key={dept.DepartmentID}>
                                            {dept.DepartmentName}
                                        </SelectItem>
                                    ))}
                                </Select>
                                <Input label="Program Code" placeholder="e.g. B.Tech CSE" value={formData.ProgramCode} onValueChange={v => setFormData({ ...formData, ProgramCode: v })} variant="bordered" labelPlacement="outside" />
                                <Input label="Program Name" placeholder="e.g. Bachelor of Technology (CSE)" value={formData.ProgramName} onValueChange={v => setFormData({ ...formData, ProgramName: v })} variant="bordered" labelPlacement="outside" />
                                <Input type="number" label="Duration (Years)" value={formData.DurationYears.toString()} onValueChange={v => setFormData({ ...formData, DurationYears: Number(v) })} variant="bordered" labelPlacement="outside" />
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
