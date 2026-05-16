import { Op, QueryTypes, where, fn, col } from 'sequelize';
import { 
    InternalSeat, 
    InternalRoom, 
    InternalStudent, 
    InternalExam, 
    InternalSeatAllocation, 
    InternalExamRegistration,
    InternalExamDepartment,
    Department,
    Subject
} from '../../models/index.js';

export interface InternalAllocationRequest {
    examDate: string;
    session: string;
    hallIds: number[];
    seriesId: number;
    shuffleRooms?: boolean;
}

export interface InternalAllocationResult {
    assignedCount: number;
    unassignedCount: number;
    hallUsage: { hallId: number; hallCode: string; used: number; total: number }[];
    unassignedStudents?: any[];
}

export class InternalSeatAllocator {
    /**
     * Internal Exam Seating Engine (Unified Algorithm):
     * - Column-Continuous Allocation: Students are assigned in order down the left column and then the right column.
     * - Interleaved Subjects: Subject queues are distributed between Left and Right pools to ensure different subjects sit together.
     * - Register Number Continuity: Maintained within each column across room boundaries.
     * - Fallback: If only one subject remains, it is split in half across both columns.
     */
    static async generate(req: InternalAllocationRequest, transaction: any): Promise<InternalAllocationResult> {
        console.log(`[InternalSeatAllocator] Generating seating for ${req.examDate} ${req.session} (Series: ${req.seriesId})`);

        // 1. Fetch Exams for the slot (case-insensitive session match)
        const exams = await InternalExam.findAll({
            where: {
                ExamDate: req.examDate,
                InternalExamSeriesID: req.seriesId,
                [Op.and]: [where(fn('UPPER', col('Session')), req.session.toUpperCase())]
            },
            transaction
        });

        console.log(`[InternalSeatAllocator] Found ${exams.length} exams for date=${req.examDate}, session=${req.session}, series=${req.seriesId}`);
        if (exams.length === 0) {
            throw new Error("No internal exams found for this date and session.");
        }

        const examIds = exams.map(e => e.InternalExamID);
        console.log(`[InternalSeatAllocator] Exam IDs: ${examIds.join(', ')}`);

        // 2. Fetch registered students grouped by exam (subject)
        const registrations = await InternalExamRegistration.findAll({
            where: { InternalExamID: { [Op.in]: examIds } },
            include: [{
                model: InternalStudent,
                as: 'Student',
                include: [{ model: Department, as: 'Department' }]
            }],
            transaction
        });

        console.log(`[InternalSeatAllocator] Found ${registrations.length} student registrations for exams: ${examIds.join(', ')}`);
        
        // Group by examId → array of student info, sorted by register number
        const subjectQueues = new Map<number, any[]>();
        examIds.forEach(id => subjectQueues.set(id, []));

        if (registrations.length === 0) {
            console.log(`[InternalSeatAllocator] No explicit registrations found. Attempting multi-tier implicit discovery...`);
            
            // Tier 1: Try InternalExamDepartment
            let examDepts = await InternalExamDepartment.findAll({
                where: { InternalExamID: { [Op.in]: examIds } },
                transaction
            });

            // Tier 2: If no departments linked, try Subject table via SubjectCode (Case-Insensitive)
            if (examDepts.length === 0) {
                console.log(`[InternalSeatAllocator] Tier 2: Checking Subjects table via SubjectCode (Case-Insensitive)...`);
                const subjectCodes = [...new Set(exams.map(e => e.SubjectCode))];
                const subjects = await Subject.findAll({
                    where: {
                        [Op.or]: subjectCodes.map(code => 
                            where(fn('UPPER', col('SubjectCode')), code.toUpperCase())
                        )
                    },
                    attributes: ['SubjectCode', 'DepartmentID'],
                    transaction
                });

                if (subjects.length > 0) {
                    const codeToDept = new Map<string, number>();
                    subjects.forEach(s => codeToDept.set(s.SubjectCode.toUpperCase(), s.DepartmentID));
                    
                    const virtualDepts: any[] = [];
                    for (const exam of exams) {
                        const deptId = codeToDept.get(exam.SubjectCode.toUpperCase());
                        if (deptId) {
                            virtualDepts.push({ InternalExamID: exam.InternalExamID, DepartmentID: deptId });
                        }
                    }
                    examDepts = virtualDepts;
                }
            }

            // Tier 3: Prefix Matching (e.g. CST301 -> CS Department)
            if (examDepts.length === 0) {
                console.log(`[InternalSeatAllocator] Tier 3: Attempting Department Code prefix matching...`);
                const allDepts = await Department.findAll({ attributes: ['DepartmentID', 'DepartmentCode'], transaction });
                const virtualDepts: any[] = [];
                
                for (const exam of exams) {
                    const code = exam.SubjectCode.toUpperCase();
                    // Find the longest matching department code prefix
                    const matchedDept = allDepts
                        .filter(d => d.DepartmentCode && code.startsWith(d.DepartmentCode.toUpperCase()))
                        .sort((a, b) => b.DepartmentCode.length - a.DepartmentCode.length)[0];
                    
                    if (matchedDept) {
                        console.log(`[InternalSeatAllocator] Matched exam ${exam.SubjectCode} to department ${matchedDept.DepartmentCode} via prefix`);
                        virtualDepts.push({ InternalExamID: exam.InternalExamID, DepartmentID: matchedDept.DepartmentID });
                    }
                }
                examDepts = virtualDepts;
            }

            const deptIds = [...new Set(examDepts.map(d => d.DepartmentID))];
            if (deptIds.length === 0) {
                throw new Error(`No student registrations found and no departments could be resolved for these exams. Please ensure exams are linked to departments or have valid subject codes (e.g., CST301 for CS dept).`);
            }

            const students = await InternalStudent.findAll({
                where: { DepartmentID: { [Op.in]: deptIds }, Status: 'ACTIVE' },
                include: [{ model: Department, as: 'Department' }],
                transaction
            });

            if (students.length === 0) {
                throw new Error(`No active students found in the departments resolved for these exams (${deptIds.join(', ')}).`);
            }

            // Map students to exams based on department
            const deptToExam = new Map<number, number>();
            examDepts.forEach(ed => deptToExam.set(ed.DepartmentID, ed.InternalExamID));

            for (const s of students) {
                const eid = deptToExam.get(s.DepartmentID || 0);
                if (eid && subjectQueues.has(eid)) {
                    subjectQueues.get(eid)!.push({
                        studentId: s.InternalStudentID,
                        examId: eid,
                        regNo: s.RegisterNumber || '',
                        name: s.FullName || '',
                        deptId: s.DepartmentID,
                        deptCode: (s as any).Department?.DepartmentCode || ''
                    });
                }
            }
            console.log(`[InternalSeatAllocator] Implicitly matched ${students.length} students across ${subjectQueues.size} subjects`);
        } else {
            for (const reg of registrations) {
                const eid = reg.InternalExamID;
                if (!subjectQueues.has(eid)) subjectQueues.set(eid, []);
                subjectQueues.get(eid)!.push({
                    studentId: reg.InternalStudentID,
                    examId: eid,
                    regNo: reg.Student?.RegisterNumber || '',
                    name: reg.Student?.FullName || '',
                    deptId: reg.Student?.DepartmentID,
                    deptCode: reg.Student?.Department?.DepartmentCode || ''
                });
            }
        }

        // Filter out empty queues and sort by reg number
        const activeQueues = Array.from(subjectQueues.values()).filter(q => q.length > 0);
        
        if (activeQueues.length === 0) {
            throw new Error("No students found to allocate for these exams.");
        }

        for (const queue of activeQueues) {
            queue.sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));
        }

        const queues = activeQueues;

        // 3. Fetch Halls and their ACTIVE seats
        let halls = await InternalRoom.findAll({
            where: { RoomID: { [Op.in]: req.hallIds }, Status: 'Active', ExamUsable: true },
            transaction
        });

        if (req.shuffleRooms) {
            halls = halls.sort(() => Math.random() - 0.5);
        }

        const hallIdsSorted = halls.map(h => h.RoomID);
        const hallMap = new Map<number, InternalRoom>();
        halls.forEach(h => hallMap.set(h.RoomID, h));

        // 4. Create Left and Right pools for column-continuous allocation
        const leftPool: any[] = [];
        const rightPool: any[] = [];
        const totalStudents = activeQueues.reduce((s, q) => s + q.length, 0);
        const targetPerPool = Math.ceil(totalStudents / 2);

        // Sort queues by size descending to help balance pools
        const sortedQueues = [...activeQueues].sort((a, b) => b.length - a.length);

        if (sortedQueues.length === 1) {
            // Case: Only one subject — split it in half
            const q = sortedQueues[0]!;
            const half = Math.ceil(q.length / 2);
            leftPool.push(...q.slice(0, half));
            rightPool.push(...q.slice(half));
        } else {
            // Case: Multiple subjects — distribute into pools to balance sizes
            // We want to keep subjects together in columns
            for (const q of sortedQueues) {
                if (leftPool.length <= rightPool.length) {
                    // Add to left pool
                    // If this queue is so large it makes left pool much larger than half, split it
                    if (leftPool.length + q.length > targetPerPool && rightPool.length < targetPerPool) {
                        const neededForLeft = Math.max(0, targetPerPool - leftPool.length);
                        leftPool.push(...q.slice(0, neededForLeft));
                        rightPool.push(...q.slice(neededForLeft));
                    } else {
                        leftPool.push(...q);
                    }
                } else {
                    // Add to right pool
                    if (rightPool.length + q.length > targetPerPool && leftPool.length < targetPerPool) {
                        const neededForRight = Math.max(0, targetPerPool - rightPool.length);
                        rightPool.push(...q.slice(0, neededForRight));
                        leftPool.push(...q.slice(neededForRight));
                    } else {
                        rightPool.push(...q);
                    }
                }
            }
        }

        console.log(`[InternalSeatAllocator] Pools balanced: Left=${leftPool.length}, Right=${rightPool.length}`);

        let assignedCount = 0;
        const finalAllocations: any[] = [];
        const hallUsage: { hallId: number; hallCode: string; used: number; total: number }[] = [];

        // 5. Fill halls column by column
        for (const hallId of hallIdsSorted) {
            if (leftPool.length === 0 && rightPool.length === 0) break;

            const hall = hallMap.get(hallId)!;
            const activeSeats = await InternalSeat.findAll({
                where: { RoomID: hallId, IsActive: true },
                order: [
                    ['RowLabel', 'ASC'],
                    ['BenchNumber', 'ASC'],
                    ['SeatNumber', 'ASC']
                ],
                transaction
            });

            if (activeSeats.length === 0) continue;

            let hallAssigned = 0;

            for (const seat of activeSeats) {
                let student = null;
                if (seat.SeatNumber === 1) {
                    if (leftPool.length > 0) student = leftPool.shift();
                } else if (seat.SeatNumber === 2) {
                    if (rightPool.length > 0) student = rightPool.shift();
                }

                if (student) {
                    finalAllocations.push({
                        InternalExamID: student.examId,
                        InternalSeatID: seat.SeatID,
                        InternalStudentID: student.studentId
                    });
                    assignedCount++;
                    hallAssigned++;
                }
            }

            hallUsage.push({
                hallId: hall.RoomID,
                hallCode: hall.RoomCode,
                used: hallAssigned,
                total: activeSeats.length
            });
        }

        // 6. Collect unassigned students
        const unassignedStudents: any[] = [...leftPool, ...rightPool];

        // 7. Persist — clear existing and bulk insert
        const allHallSeats = await InternalSeat.findAll({
            where: { RoomID: { [Op.in]: hallIdsSorted } },
            attributes: ['SeatID'],
            transaction
        });
        const allSeatIds = allHallSeats.map(s => s.SeatID);

        await InternalSeatAllocation.destroy({
            where: {
                InternalExamID: { [Op.in]: examIds },
                InternalSeatID: { [Op.in]: allSeatIds.length > 0 ? allSeatIds : [-1] }
            },
            transaction
        });

        if (finalAllocations.length > 0) {
            await InternalSeatAllocation.bulkCreate(finalAllocations, { transaction });
        }

        console.log(`[InternalSeatAllocator] Done: ${assignedCount} assigned, ${unassignedStudents.length} unassigned`);

        return {
            assignedCount,
            unassignedCount: unassignedStudents.length,
            hallUsage,
            unassignedStudents: unassignedStudents.map(s => ({
                studentId: s.studentId,
                name: s.name,
                regNo: s.regNo,
                dept: s.deptCode,
                examId: s.examId
            }))
        };
    }
}
