import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { 
    InternalRoom, 
    InternalSeat, 
    InternalExam, 
    InternalExamSeries, 
    InternalSeatAllocation, 
    InternalStudent, 
    Department,
    InternalBlock,
    InternalFloor,
    InternalExamRegistration
} from '../../models/index.js';
import { InternalSeatAllocator } from '../../engines/internal/internalSeatAllocator.engine.js';

export const internalSeatingController = {
    /** Get all active halls for internal exams */
    getHalls: async (req: Request, res: Response) => {
        try {
            const halls = await InternalRoom.findAll({
                where: { Status: 'Active', ExamUsable: true },
                include: [
                    { model: InternalBlock, as: 'Block' },
                    { model: InternalFloor, as: 'Floor' }
                ],
                order: [['RoomCode', 'ASC']]
            });
            return res.json(halls);
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get distinct exam dates for internal series */
    getExamDates: async (req: Request, res: Response) => {
        try {
            const { seriesId, session } = req.query;
            const where: any = {};
            if (seriesId) where.InternalExamSeriesID = seriesId as any;
            if (session) where.Session = session as string;

            const dates = await InternalExam.findAll({
                where,
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('ExamDate')), 'ExamDate']],
                order: [['ExamDate', 'ASC']]
            });
            return res.json(dates.map((d: any) => d.ExamDate));
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get exams for a specific date and session */
    getExams: async (req: Request, res: Response) => {
        try {
            const { examDate, session, seriesId } = req.query;
            const exams = await InternalExam.findAll({
                where: {
                    ExamDate: examDate as string,
                    Session: session as string,
                    InternalExamSeriesID: seriesId as any
                },
                order: [['StartTime', 'ASC']]
            });
            return res.json(exams);
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get hall layout with current allocations */
    getHallLayout: async (req: Request, res: Response) => {
        try {
            const { hallId } = req.params;
            const { examDate, session, seriesId } = req.query;

            const room = await InternalRoom.findByPk(hallId as string);
            if (!room) return res.status(404).json({ message: "Room not found" });

            const seats = await InternalSeat.findAll({
                where: { RoomID: hallId as any, IsActive: true },
                order: [['RowLabel', 'ASC'], ['BenchNumber', 'ASC'], ['SeatNumber', 'ASC']]
            });

            // Fetch allocations for this hall on this date/session
            const examIds = await InternalExam.findAll({
                where: { ExamDate: examDate as string, Session: session as string, InternalExamSeriesID: seriesId as any },
                attributes: ['InternalExamID']
            }).then(exs => exs.map(e => e.InternalExamID));

            const allocations = await InternalSeatAllocation.findAll({
                where: {
                    InternalSeatID: { [Op.in]: seats.map(s => s.SeatID) },
                    InternalExamID: { [Op.in]: examIds }
                },
                include: [
                    {
                        model: InternalStudent,
                        as: 'Student',
                        include: [{ model: Department, as: 'Department' }]
                    }
                ]
            });

            return res.json({ room, seats, allocations });
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Get global summary of allocations for a slot */
    getSummary: async (req: Request, res: Response) => {
        try {
            const { examDate, session, seriesId } = req.query;
            
            // 1. Find exams for this slot
            const exams = await InternalExam.findAll({
                where: {
                    ExamDate: examDate as string,
                    Session: session as string,
                    InternalExamSeriesID: seriesId as any
                },
                attributes: ['InternalExamID']
            });
            
            if (exams.length === 0) return res.json(null);
            
            const examIds = exams.map(e => e.InternalExamID);
            
            // 2. Count total registrations
            const totalStudents = await InternalExamRegistration.count({
                where: { InternalExamID: { [Op.in]: examIds } }
            });
            
            // 3. Get hall usage
            const allocations = await InternalSeatAllocation.findAll({
                where: { InternalExamID: { [Op.in]: examIds } },
                include: [{
                    model: InternalSeat,
                    as: 'Seat',
                    include: [{ model: InternalRoom, as: 'Room' }]
                }]
            });
            
            if (allocations.length === 0) {
                return res.json({
                    assignedCount: 0,
                    unassignedCount: totalStudents,
                    hallUsage: []
                });
            }
            
            const hallStatsMap = new Map<number, { hallId: number, hallCode: string, used: number, total: number }>();
            
            for (const alloc of allocations) {
                const seat = (alloc as any).Seat;
                if (!seat || !seat.Room) continue;
                const room = seat.Room;
                
                if (!hallStatsMap.has(room.RoomID)) {
                    const activeSeatCount = await InternalSeat.count({
                        where: { RoomID: room.RoomID, IsActive: true }
                    });
                    hallStatsMap.set(room.RoomID, {
                        hallId: room.RoomID,
                        hallCode: room.RoomCode,
                        used: 0,
                        total: activeSeatCount
                    });
                }
                hallStatsMap.get(room.RoomID)!.used++;
            }
            
            const hallUsage = Array.from(hallStatsMap.values());
            const assignedCount = hallUsage.reduce((sum, h) => sum + h.used, 0);
            
            return res.json({
                assignedCount,
                unassignedCount: Math.max(0, totalStudents - assignedCount),
                hallUsage: hallUsage.sort((a, b) => a.hallCode.localeCompare(b.hallCode))
            });
            
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Generate allocations using the engine */
    generateAllocation: async (req: Request, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const result = await InternalSeatAllocator.generate(req.body, transaction);
            await transaction.commit();
            return res.json(result);
        } catch (error: any) {
            await transaction.rollback();
            return res.status(500).json({ message: error.message });
        }
    },

    /** Save manual allocation changes */
    saveAllocation: async (req: Request, res: Response) => {
        const transaction = await sequelize.transaction();
        try {
            const { examDate, session, hallId, assignments, seriesId } = req.body;

            const examIds = await InternalExam.findAll({
                where: { ExamDate: examDate, Session: session, InternalExamSeriesID: seriesId },
                attributes: ['InternalExamID']
            }).then(exs => exs.map(e => e.InternalExamID));

            // Clear existing for this hall
            const hallSeats = await InternalSeat.findAll({
                where: { RoomID: hallId },
                attributes: ['SeatID']
            });
            const seatIds = hallSeats.map(s => s.SeatID);

            await InternalSeatAllocation.destroy({
                where: {
                    InternalExamID: { [Op.in]: examIds },
                    InternalSeatID: { [Op.in]: seatIds }
                },
                transaction
            });

            if (assignments.length > 0) {
                await InternalSeatAllocation.bulkCreate(assignments.map((a: any) => ({
                    InternalExamID: a.examId,
                    InternalSeatID: a.seatId,
                    InternalStudentID: a.studentId
                })), { transaction });
            }

            await transaction.commit();
            return res.json({ success: true });
        } catch (error: any) {
            await transaction.rollback();
            return res.status(500).json({ message: error.message });
        }
    },

    /** Clear allocations for a hall */
    clearAllocation: async (req: Request, res: Response) => {
        try {
            const { examDate, session, hallId } = req.params;
            const { seriesId } = req.query;

            const examIds = await InternalExam.findAll({
                where: { ExamDate: examDate, Session: session, InternalExamSeriesID: seriesId as any },
                attributes: ['InternalExamID']
            }).then(exs => exs.map(e => e.InternalExamID));

            const hallSeats = await InternalSeat.findAll({
                where: { RoomID: hallId as any },
                attributes: ['SeatID']
            });
            const seatIds = hallSeats.map(s => s.SeatID);

            await InternalSeatAllocation.destroy({
                where: {
                    InternalExamID: { [Op.in]: examIds },
                    InternalSeatID: { [Op.in]: seatIds }
                }
            });

            return res.json({ success: true });
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    }
};
