import { Op, QueryTypes, where, fn, col } from 'sequelize';
import { 
    InternalSeat, 
    InternalRoom, 
    InternalStudent, 
    InternalExam, 
    InternalSeatAllocation, 
    InternalExamRegistration,
    Department
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

        if (exams.length === 0) {
            throw new Error("No internal exams found for this date and session.");
        }

        const examIds = exams.map(e => e.InternalExamID);

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

        // Group by examId → array of student info, sorted by register number
        const subjectQueues = new Map<number, any[]>();
        for (const reg of registrations) {
            if (!subjectQueues.has(reg.InternalExamID)) subjectQueues.set(reg.InternalExamID, []);
            subjectQueues.get(reg.InternalExamID)!.push({
                studentId: reg.InternalStudentID,
                examId: reg.InternalExamID,
                regNo: reg.Student?.RegisterNumber || '',
                name: reg.Student?.FullName || '',
                deptId: reg.Student?.DepartmentID,
                deptCode: reg.Student?.Department?.DepartmentCode || ''
            });
        }

        // Sort each subject's students by register number (continuous order)
        for (const [, queue] of subjectQueues) {
            queue.sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));
        }

        // Build an ordered list of queues (sorted by exam ID for determinism)
        // Each queue is a subject pool sorted by reg number
        const queues = [...subjectQueues.entries()]
            .sort(([a], [b]) => a - b)
            .map(([, q]) => q);

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
