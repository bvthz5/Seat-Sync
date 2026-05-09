import { Op } from 'sequelize';
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
}

export class InternalSeatAllocator {
    /**
     * The core engine for internal exam seating.
     * Follows the Room -> Column -> Bench -> Left/Right Seat traversal.
     */
    static async generate(req: InternalAllocationRequest, transaction: any): Promise<InternalAllocationResult> {
        console.log(`[InternalSeatAllocator] Generating seating for ${req.examDate} ${req.session} (Mode: ${req.mode})`);

        // 1. Fetch Exams for the slot
        const exams = await InternalExam.findAll({
            where: {
                ExamDate: req.examDate,
                Session: req.session,
                InternalExamSeriesID: req.seriesId
            },
            transaction
        });

        if (exams.length === 0) {
            throw new Error("No internal exams found for this date and session.");
        }

        const examIds = exams.map(e => e.InternalExamID);

        // 2. Fetch Students registered for these exams
        // We need to fetch students who are registered (InternalExamRegistration)
        // and group them by department/exam as needed by the mode.
        const registrations = await InternalExamRegistration.findAll({
            where: { InternalExamID: { [Op.in]: examIds } },
            include: [
                {
                    model: InternalStudent,
                    as: 'Student',
                    include: [{ model: Department, as: 'Department' }]
                }
            ],
            transaction
        });

        let studentPool = registrations.map(r => ({
            studentId: r.InternalStudentID,
            examId: r.InternalExamID,
            regNo: r.Student?.RegisterNumber || '',
            deptId: r.Student?.DepartmentID,
            deptCode: r.Student?.Department?.DepartmentCode || ''
        }));

        // Sort students by Register Number to maintain continuity
        studentPool.sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));

        // 3. Fetch Halls and their ACTIVE seats
        let halls = await InternalRoom.findAll({
            where: { RoomID: { [Op.in]: req.hallIds }, Status: 'Active', ExamUsable: true },
            transaction
        });

        // Shuffle halls if requested
        if (req.shuffleRooms) {
            halls = halls.sort(() => Math.random() - 0.5);
        }

        const hallIdsSorted = halls.map(h => h.RoomID);
        const hallMap = new Map<number, InternalRoom>();
        halls.forEach(h => hallMap.set(h.RoomID, h));

        // 4. Allocation Logic
        let assignedCount = 0;
        const finalAllocations: any[] = [];
        const hallUsage: { hallId: number; hallCode: string; used: number; total: number }[] = [];

        // Determine left/right pools based on mode
        let leftPool: any[] = [];
        let rightPool: any[] = [];

        switch (req.mode) {
            case 'same-exam':
                leftPool = [...studentPool];
                rightPool = []; // We will alternate from the same pool or just fill left then right?
                // For same-exam both sides, we just treat them as a single pool and fill seats one by one.
                break;
            case 'left-only':
                leftPool = [...studentPool];
                rightPool = [];
                break;
            case 'right-only':
                leftPool = [];
                rightPool = [...studentPool];
                break;
            case 'alternate':
                // Need to split students into two groups (e.g., by exam or just alternate)
                // If there are multiple exams, we could alternate exams.
                // For now, let's just split the pool in half or by exam if possible.
                const uniqueExams = [...new Set(studentPool.map(s => s.examId))];
                if (uniqueExams.length >= 2) {
                    leftPool = studentPool.filter(s => s.examId === uniqueExams[0]);
                    rightPool = studentPool.filter(s => s.examId !== uniqueExams[0]);
                } else {
                    // Split half-half if only one exam
                    const half = Math.ceil(studentPool.length / 2);
                    leftPool = studentPool.slice(0, half);
                    rightPool = studentPool.slice(half);
                }
                break;
            case 'split-dept':
                if (req.primaryDeptId) {
                    leftPool = studentPool.filter(s => s.deptId === req.primaryDeptId);
                    if (req.secondaryDeptId) {
                        rightPool = studentPool.filter(s => s.deptId === req.secondaryDeptId);
                    } else {
                        rightPool = studentPool.filter(s => s.deptId !== req.primaryDeptId);
                    }
                } else {
                    leftPool = [...studentPool];
                    rightPool = [];
                }
                break;
        }

        // 5. Fill Halls
        for (const hallId of hallIdsSorted) {
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
            
            // Traversal order: Column (RowLabel) -> Bench -> Left (1) / Right (2)
            // Group seats by Column and Bench
            const benchGroups = new Map<string, Map<number, { left?: InternalSeat, right?: InternalSeat }>>();
            
            activeSeats.forEach(s => {
                if (!benchGroups.has(s.RowLabel)) benchGroups.set(s.RowLabel, new Map());
                const colMap = benchGroups.get(s.RowLabel)!;
                if (!colMap.has(s.BenchNumber)) colMap.set(s.BenchNumber, {});
                const bench = colMap.get(s.BenchNumber)!;
                if (s.SeatNumber === 1) bench.left = s;
                else if (s.SeatNumber === 2) bench.right = s;
            });

            const sortedRowLabels = [...benchGroups.keys()].sort();

            for (const colLabel of sortedRowLabels) {
                const colMap = benchGroups.get(colLabel)!;
                const sortedBenches = [...colMap.keys()].sort((a, b) => a - b);

                for (const benchNum of sortedBenches) {
                    const bench = colMap.get(benchNum)!;

                    // Try to fill Left Seat
                    if (bench.left && leftPool.length > 0) {
                        const student = leftPool.shift();
                        finalAllocations.push({
                            InternalExamID: student.examId,
                            InternalSeatID: bench.left.SeatID,
                            InternalStudentID: student.studentId
                        });
                        assignedCount++;
                        hallAssigned++;
                    } else if (bench.left && req.mode === 'same-exam' && rightPool.length === 0 && leftPool.length > 0) {
                        // fallback for same-exam if left is empty
                    }

                    // Try to fill Right Seat
                    if (bench.right) {
                        let studentToAssign = null;
                        if (req.mode === 'same-exam') {
                            studentToAssign = leftPool.shift();
                        } else if (rightPool.length > 0) {
                            studentToAssign = rightPool.shift();
                        }

                        if (studentToAssign) {
                            finalAllocations.push({
                                InternalExamID: studentToAssign.examId,
                                InternalSeatID: bench.right.SeatID,
                                InternalStudentID: studentToAssign.studentId
                            });
                            assignedCount++;
                            hallAssigned++;
                        }
                    }
                }
            }

            hallUsage.push({
                hallId: hall.RoomID,
                hallCode: hall.RoomCode,
                used: hallAssigned,
                total: activeSeats.length
            });

            if (leftPool.length === 0 && rightPool.length === 0) break;
        }

        // 6. Persist Allocations
        // First, clear existing allocations for these exams in these halls
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

        return {
            assignedCount,
            unassignedCount: leftPool.length + rightPool.length,
            hallUsage
        };
    }
}
