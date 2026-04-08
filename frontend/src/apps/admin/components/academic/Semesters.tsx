import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip } from '@heroui/react';
import { academicService } from '../../services/academicService';
import { Semester, Program } from '../../types/academic';
import { toast } from '../../../../utils/toast';

interface SemestersProps {
    academicYearId: number | null;
}

export const Semesters: React.FC<SemestersProps> = ({ academicYearId }) => {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [programs, setPrograms] = useState<Program[]>([]);

    const fetchData = async () => {
        try {
            const [semRes, progRes] = await Promise.all([
                academicService.getSemesters(),
                academicService.getPrograms()
            ]);
            // Handle both {success, data} and flat array response shapes
            const semData = semRes.data?.data ?? (Array.isArray(semRes.data) ? semRes.data : []);
            const progData = Array.isArray(progRes.data) ? progRes.data : (progRes.data?.data || []);
            setSemesters(semData);
            setPrograms(progData);
        } catch (error) {
            toast.error("Failed to load data");
        }
    };

    useEffect(() => {
        fetchData();
    }, [academicYearId]);


    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-800">Semesters</h3>
                    <Chip size="sm" variant="flat" color="primary">{semesters.length}</Chip>
                </div>
                <div className="text-sm text-slate-500 italic">
                    Semesters are auto-generated when Programs are created.
                </div>
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
        </div>
    );
};
