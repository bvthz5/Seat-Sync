import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Chip } from '@heroui/react';
import { Building2, Plus, Search } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { Department } from '../../types/academic';
import { toast } from '../../../../utils/toast';

interface DepartmentsProps {
    academicYearId: number | null;
}

export const Departments: React.FC<DepartmentsProps> = ({ academicYearId }) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(false);
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [formData, setFormData] = useState({ DepartmentName: '', DepartmentCode: '' });

    const fetchDepartments = async () => {
        if (!academicYearId) return;
        try {
            setLoading(true);
            const res = await academicService.getDepartments({ academicYearId });
            if (res.data && res.data.success) {
                setDepartments(res.data.data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, [academicYearId]);

    const handleCreate = async (onClose: () => void) => {
        if (!academicYearId) {
            toast.error("No academic year selected");
            return;
        }
        if (!formData.DepartmentName || !formData.DepartmentCode) {
            toast.error("Name and Code are required");
            return;
        }
        try {
            await academicService.createDepartment({ ...formData, AcademicYearID: academicYearId });
            toast.success("Department created");
            fetchDepartments();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create");
        }
    };

    if (!academicYearId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <Building2 size={48} className="mb-4 opacity-50" />
                <p className="font-semibold text-lg">Please select an Academic Year first</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-800">Departments</h3>
                    <Chip size="sm" variant="flat" color="primary">{departments.length}</Chip>
                </div>
                <Button color="primary" onPress={onOpen} startContent={<Plus size={20} />} className="font-semibold text-white">
                    Add Department
                </Button>
            </div>

            <Table aria-label="Departments Table">
                <TableHeader>
                    <TableColumn>CODE</TableColumn>
                    <TableColumn>NAME</TableColumn>
                    <TableColumn>STATUS</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No departments found for this year.">
                    {departments.map(dept => (
                        <TableRow key={dept.DepartmentID}>
                            <TableCell><span className="font-mono font-bold text-slate-700">{dept.DepartmentCode}</span></TableCell>
                            <TableCell><span className="font-medium text-slate-900">{dept.DepartmentName}</span></TableCell>
                            <TableCell>
                                <Chip size="sm" color={dept.IsActive ? "success" : "default"} variant="flat">
                                    {dept.IsActive ? "Active" : "Inactive"}
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
                            <ModalHeader className="flex flex-col gap-1">Add Department</ModalHeader>
                            <ModalBody>
                                <Input label="Department Code" placeholder="e.g. CSE" value={formData.DepartmentCode} onValueChange={v => setFormData({ ...formData, DepartmentCode: v })} variant="bordered" labelPlacement="outside" />
                                <Input label="Department Name" placeholder="e.g. Computer Science" value={formData.DepartmentName} onValueChange={v => setFormData({ ...formData, DepartmentName: v })} variant="bordered" labelPlacement="outside" />
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
