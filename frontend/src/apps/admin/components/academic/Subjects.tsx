import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Select, SelectItem, Chip } from '@heroui/react';
import { BookOpen, Plus } from 'lucide-react';
import { academicService } from '../../services/academicService';
import { Subject, Department, Program, Semester } from '../../types/academic';
import { toast } from '../../../../utils/toast';

interface SubjectsProps {
    academicYearId: number | null;
}

export const Subjects: React.FC<SubjectsProps> = ({ academicYearId }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);

    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const [formData, setFormData] = useState({
        SubjectName: '',
        SubjectCode: '',
        DepartmentID: '',
        ProgramID: '',
        SemesterID: '',
        Credits: 3
    });

    const fetchData = async () => {
        if (!academicYearId) return;
        try {
            const [subRes, deptRes, progRes, semRes] = await Promise.all([
                academicService.getSubjects({ academicYearId }),
                academicService.getDepartments({ academicYearId }),
                academicService.getPrograms({ academicYearId }),
                academicService.getSemesters({ academicYearId })
            ]);

            if (subRes.data?.success) setSubjects(subRes.data.data);
            if (deptRes.data?.success) setDepartments(deptRes.data.data);
            if (progRes.data?.success) setPrograms(progRes.data.data);
            if (semRes.data?.success) setSemesters(semRes.data.data);
        } catch (error) {
            toast.error("Failed to load data");
        }
    };

    useEffect(() => {
        fetchData();
    }, [academicYearId]);

    const handleCreate = async (onClose: () => void) => {
        if (!academicYearId) return;
        // Validate
        if (!formData.SubjectCode || !formData.SubjectName || !formData.DepartmentID || !formData.ProgramID || !formData.SemesterID) {
            toast.error("All fields (Code, Name, Dept, Program, Semester) are required");
            return;
        }

        try {
            await academicService.createSubject({
                ...formData,
                DepartmentID: Number(formData.DepartmentID),
                ProgramID: Number(formData.ProgramID),
                SemesterID: Number(formData.SemesterID),
                Credits: Number(formData.Credits),
                AcademicYearID: academicYearId
            });
            toast.success("Subject created");
            fetchData();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Failed to create");
        }
    };

    // Filter logic for modal
    const filteredPrograms = programs.filter(p => !formData.DepartmentID || p.DepartmentID === Number(formData.DepartmentID));
    const filteredSemesters = semesters.filter(s => !formData.ProgramID || s.ProgramID === Number(formData.ProgramID));

    if (!academicYearId) return <div className="p-12 text-center text-slate-400">Please select an Academic Year first</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-800">Subjects</h3>
                    <Chip size="sm" variant="flat" color="primary">{subjects.length}</Chip>
                </div>
                <Button color="primary" onPress={onOpen} startContent={<Plus size={20} />} className="font-semibold text-white">
                    Add Subject
                </Button>
            </div>

            <Table aria-label="Subjects Table">
                <TableHeader>
                    <TableColumn>CODE</TableColumn>
                    <TableColumn>NAME</TableColumn>
                    <TableColumn>DETAILS</TableColumn>
                    <TableColumn>CREDITS</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No subjects found.">
                    {subjects.map(sub => (
                        <TableRow key={sub.SubjectID}>
                            <TableCell><span className="font-mono font-bold text-slate-700">{sub.SubjectCode}</span></TableCell>
                            <TableCell><span className="font-medium text-slate-900">{sub.SubjectName}</span></TableCell>
                            <TableCell>
                                <div className="flex flex-col text-xs text-slate-500">
                                    <span>Dept: {departments.find(d => d.DepartmentID === sub.DepartmentID)?.DepartmentCode}</span>
                                    <span>Prog: {programs.find(p => p.ProgramID === sub.ProgramID)?.ProgramCode}</span>
                                    <span>Sem: {semesters.find(s => s.SemesterID === sub.SemesterID)?.SemesterName}</span>
                                </div>
                            </TableCell>
                            <TableCell>{sub.Credits}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Add Subject</ModalHeader>
                            <ModalBody>
                                <div className="grid grid-cols-2 gap-4">
                                    <Select id="field-6icypne" name="field-6icypne" label="Department"
                                        placeholder="Select Dept"
                                        selectedKeys={formData.DepartmentID ? [formData.DepartmentID] : []}
                                        onChange={(e) => setFormData({ ...formData, DepartmentID: e.target.value, ProgramID: '', SemesterID: '' })}
                                        variant="bordered"
                                        labelPlacement="outside"
                                    >
                                        {departments.map(d => <SelectItem key={d.DepartmentID}>{d.DepartmentName}</SelectItem>)}
                                    </Select>

                                    <Select id="field-pdprsup" name="field-pdprsup" label="Program"
                                        placeholder={formData.DepartmentID ? "Select Program" : "Select Dept First"}
                                        isDisabled={!formData.DepartmentID}
                                        selectedKeys={formData.ProgramID ? [formData.ProgramID] : []}
                                        onChange={(e) => setFormData({ ...formData, ProgramID: e.target.value, SemesterID: '' })}
                                        variant="bordered"
                                        labelPlacement="outside"
                                    >
                                        {filteredPrograms.map(p => <SelectItem key={p.ProgramID}>{p.ProgramName}</SelectItem>)}
                                    </Select>

                                    <Select id="field-sib8nhu" name="field-sib8nhu" label="Semester"
                                        placeholder={formData.ProgramID ? "Select Semester" : "Select Program First"}
                                        isDisabled={!formData.ProgramID}
                                        selectedKeys={formData.SemesterID ? [formData.SemesterID] : []}
                                        onChange={(e) => setFormData({ ...formData, SemesterID: e.target.value })}
                                        variant="bordered"
                                        labelPlacement="outside"
                                    >
                                        {filteredSemesters.map(s => <SelectItem key={s.SemesterID}>{s.SemesterName}</SelectItem>)}
                                    </Select>

                                    <Input id="field-4y519k3" name="field-4y519k3" type="number" label="Credits" value={formData.Credits.toString()} onValueChange={v => setFormData({ ...formData, Credits: Number(v) })} variant="bordered" labelPlacement="outside" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input id="field-7rsrris" name="field-7rsrris" label="Subject Code" placeholder="e.g. CS101" value={formData.SubjectCode} onValueChange={v => setFormData({ ...formData, SubjectCode: v })} variant="bordered" labelPlacement="outside" />
                                    <Input id="field-vim4375" name="field-vim4375" label="Subject Name" placeholder="e.g. Intro to CS" value={formData.SubjectName} onValueChange={v => setFormData({ ...formData, SubjectName: v })} variant="bordered" labelPlacement="outside" />
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
