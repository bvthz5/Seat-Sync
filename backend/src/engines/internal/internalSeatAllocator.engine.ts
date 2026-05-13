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
    mode: 'same-exam' | 'alternate' | 'left-only' | 'right-only' | 'split-dept';
    seriesId: number;
    primaryDeptId?: number;
    secondaryDeptId?: number;
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
     * Internal Exam Seating Engine:
     * - 2 students per bench, always from DIFFERENT subjects
     * - Students within each subject are in continuous Register Number order
     * - Subjects are interleaved across benches: bench1=(A0,B0), bench2=(A1,B1), etc.
     * - For >2 subjects, cycles: bench1=(A0,B0), bench2=(C0,A1), bench3=(B1,C1)...
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

        // 4. Global interleaving state across all halls
        // We track which queue index to use for left and right seats globally
        // so register number continuity is maintained across room boundaries
        let leftQueueIdx = 0;   // which subject pool the left seat picks from
        let rightQueueIdx = 1 % queues.length;  // which pool the right seat picks from

        let assignedCount = 0;
        const finalAllocations: any[] = [];
        const hallUsage: { hallId: number; hallCode: string; used: number; total: number }[] = [];

        // Helper: advance to the next non-empty queue index (skipping empty ones)
        const advanceQueue = (currentIdx: number): number => {
            if (queues.length === 0) return 0;
            let next = (currentIdx + 1) % queues.length;
            // Skip empty queues
            let tries = 0;
            while (queues[next]!.length === 0 && tries < queues.length) {
                next = (next + 1) % queues.length;
                tries++;
            }
            return next;
        };

        // Helper: get next student from a specific queue; returns null if empty
        const popFrom = (qIdx: number): any | null => {
            if (qIdx >= queues.length || queues[qIdx]!.length === 0) return null;
            return queues[qIdx]!.shift()!;
        };

        // Helper: count remaining students
        const remainingTotal = () => queues.reduce((s, q) => s + q.length, 0);

        // 5. Fill halls bench by bench
        for (const hallId of hallIdsSorted) {
            if (remainingTotal() === 0) break;

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

            // Group seats into benches: rowLabel → benchNumber → {left, right}
            const benchGroups = new Map<string, Map<number, { left?: InternalSeat; right?: InternalSeat }>>();
            for (const s of activeSeats) {
                if (!benchGroups.has(s.RowLabel)) benchGroups.set(s.RowLabel, new Map());
                const colMap = benchGroups.get(s.RowLabel)!;
                if (!colMap.has(s.BenchNumber)) colMap.set(s.BenchNumber, {});
                const bench = colMap.get(s.BenchNumber)!;
                if (s.SeatNumber === 1) bench.left = s;
                else if (s.SeatNumber === 2) bench.right = s;
            }

            const sortedRowLabels = [...benchGroups.keys()].sort();

            for (const colLabel of sortedRowLabels) {
                const colMap = benchGroups.get(colLabel)!;
                const sortedBenches = [...colMap.keys()].sort((a, b) => a - b);

                for (const benchNum of sortedBenches) {
                    if (remainingTotal() === 0) break;
                    const bench = colMap.get(benchNum)!;

                    // Skip to valid left queue (non-empty)
                    leftQueueIdx = advanceQueue((leftQueueIdx - 1 + queues.length) % queues.length);
                    
                    // Find a left queue that has students
                    let leftStudent = null;
                    let rightStudent = null;
                    let triedQueues = 0;

                    // Pick left student
                    while (triedQueues < queues.length && leftStudent === null) {
                        if (queues[leftQueueIdx]!.length > 0) {
                            leftStudent = popFrom(leftQueueIdx);
                        } else {
                            leftQueueIdx = advanceQueue(leftQueueIdx);
                        }
                        triedQueues++;
                    }

                    // Pick right student from a DIFFERENT subject queue
                    if (bench.right && remainingTotal() > 0) {
                        // Find a different non-empty queue for right seat
                        rightQueueIdx = queues.length === 1
                            ? leftQueueIdx  // Only one subject — same subject on both sides (unavoidable)
                            : advanceQueue(leftQueueIdx); // Different subject

                        // Ensure right isn't the same queue as left (unless no choice)
                        let rightTries = 0;
                        while (rightQueueIdx === leftQueueIdx && queues.length > 1 && rightTries < queues.length) {
                            rightQueueIdx = advanceQueue(rightQueueIdx);
                            rightTries++;
                        }

                        if (queues[rightQueueIdx]!.length > 0) {
                            rightStudent = popFrom(rightQueueIdx);
                        } else {
                            // Right queue empty, pick any non-empty queue
                            for (let i = 0; i < queues.length; i++) {
                                if (queues[i]!.length > 0 && (i !== leftQueueIdx || queues.length === 1)) {
                                    rightStudent = queues[i]!.shift()!;
                                    rightQueueIdx = i;
                                    break;
                                }
                            }
                        }
                    }

                    // Advance left queue for next bench
                    if (queues.length > 1) {
                        leftQueueIdx = advanceQueue(rightQueueIdx);
                    }

                    // Commit left seat
                    if (leftStudent && bench.left) {
                        finalAllocations.push({
                            InternalExamID: leftStudent.examId,
                            InternalSeatID: bench.left.SeatID,
                            InternalStudentID: leftStudent.studentId
                        });
                        assignedCount++;
                        hallAssigned++;
                    }

                    // Commit right seat
                    if (rightStudent && bench.right) {
                        finalAllocations.push({
                            InternalExamID: rightStudent.examId,
                            InternalSeatID: bench.right.SeatID,
                            InternalStudentID: rightStudent.studentId
                        });
                        assignedCount++;
                        hallAssigned++;
                    }
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
        const unassignedStudents: any[] = [];
        for (const q of queues) unassignedStudents.push(...q);

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
