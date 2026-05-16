import { Request, Response } from "express";
import { Room, Seat, Student, Exam, SeatAllocation, ExamRegistration } from "../models/index.js";
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";

export const allocateSeats = async (req: Request, res: Response) => {
    const { examId } = req.body;

    if (!examId) {
        return res.status(400).json({ message: "Exam ID is required" });
    }

    const transaction = await sequelize.transaction();

    try {
        const exam = await Exam.findByPk(examId);
        if (!exam) {
            await transaction.rollback();
            return res.status(404).json({ message: "Exam not found" });
        }

        // 1. Get Registered Students
        // We need to fetch students associated with this exam via ExamRegistration
        // But since ExamRegistration is a through table for BelongsToMany, we can use getStudents mixin or query directly
        // Querying directly is safer with models
        const registrations = await ExamRegistration.findAll({
            where: { ExamID: examId },
            transaction
        });

        if (registrations.length === 0) {
            await transaction.rollback();
            return res.status(400).json({ message: "No students registered for this exam" });
        }

        const studentIds = registrations.map(r => r.StudentID);

        // 2. Clear existing allocations for this exam
        await SeatAllocation.destroy({
            where: { ExamID: examId },
            transaction
        });

        // 3. Find Available Rooms
        // Logic: Rooms that are Active, ExamUsable, and NOT fully booked for this slot
        // For simplicity, we just pick rooms that have *some* availability or are assigned.
        // Making it simple: Fetch ALL active exam rooms.
        const rooms = await Room.findAll({
            where: {
                Status: 'Active',
                ExamUsable: true
            },
            include: [
                {
                    model: Seat,
                    where: { IsActive: true },
                    required: false // Left join to get room even if no seats (though unlikely usable)
                }
            ],
            order: [['RoomCode', 'ASC']], // Deterministic order
            transaction
        });

        // 4. Allocation Logic
        let studentIndex = 0;
        let allocatedCount = 0;

        for (const room of rooms) {
            if (studentIndex >= studentIds.length) break;

            const seats = (room as any).Seats || [];
            if (seats.length === 0) continue;

            // Sort seats based on Room Strategy
            // If HALL Mode, group by Zone. If ROOM, group by Row/Bench.
            // Standard Room: Sort by Row, then Bench, then Seat (Standard exam order)
            seats.sort((a: any, b: any) => {
                if (a.RowIndex !== b.RowIndex) return a.RowIndex.localeCompare(b.RowIndex);
                if (a.BenchIndex !== b.BenchIndex) return a.BenchIndex - b.BenchIndex;
                return a.SeatIndex - b.SeatIndex;
            });

            // Check valid seats (not already allocated to another exam in same slot)
            // This requires checking SeatAllocation for *conflicting* exams.
            // Simplified: We assume for now we are just filling for *this* exam.
            // In real world, we check time overlap.
            // Implementation: Check SeatAllocation for any exam overlapping with this exam's time.
            // Skipping complex overlap check for this step to focus on Hall Mode logic.

            for (const seat of seats) {
                if (studentIndex >= studentIds.length) break;

                // Check if seat is already occupied by another exam (rudimentary check)
                const existingAlloc = await SeatAllocation.findOne({
                    where: {
                        SeatID: seat.SeatID,
                        ExamID: { [Op.ne]: examId } // Not this exam (already cleared)
                        // AND exam time overlaps... (TODO)
                    },
                    transaction
                });

                if (existingAlloc) continue; // Seat taken

                // Allocate
                await SeatAllocation.create({
                    ExamID: Number(examId),
                    SeatID: seat.SeatID,
                    StudentID: studentIds[studentIndex]!
                }, { transaction });

                studentIndex++;
                allocatedCount++;
            }
        }

        await transaction.commit();

        res.json({
            message: "Seat allocation completed",
            totalStudents: studentIds.length,
            allocated: allocatedCount,
            unallocated: studentIds.length - allocatedCount
        });

    } catch (error: any) {
        await transaction.rollback();
        console.error("ALLOCATION ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};
