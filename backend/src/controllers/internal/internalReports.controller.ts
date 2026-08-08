import { Request, Response } from 'express';
import { 
    InternalSeatAllocation, 
    InternalExam, 
    InternalStudent, 
    InternalRoom, 
    InternalSeat, 
    Department,
    Subject
} from '../../models/index.js';
import { Op } from 'sequelize';

export const internalReportsController = {
    /** Room Wise Seating Report for Internal Exams */
    getRoomWiseSeating: async (req: Request, res: Response) => {
        try {
            const { examDate, session, seriesId } = req.query;
            
            const allocations = await InternalSeatAllocation.findAll({
                include: [
                    {
                        model: InternalExam,
                        as: 'Exam',
                        where: { ExamDate: examDate, Session: session, InternalExamSeriesID: seriesId }
                    },
                    {
                        model: InternalStudent,
                        as: 'Student',
                        include: [{ model: Department, as: 'Department' }]
                    },
                    {
                        model: InternalSeat,
                        as: 'Seat',
                        include: [{ model: InternalRoom, as: 'Room' }]
                    }
                ],
                order: [
                    [{ model: InternalSeat, as: 'Seat' }, { model: InternalRoom, as: 'Room' }, 'RoomCode', 'ASC'],
                    [{ model: InternalSeat, as: 'Seat' }, 'RowLabel', 'ASC'],
                    [{ model: InternalSeat, as: 'Seat' }, 'BenchNumber', 'ASC'],
                    [{ model: InternalSeat, as: 'Seat' }, 'SeatNumber', 'ASC']
                ]
            });

            return res.json(allocations);
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    },

    /** Consolidated Seating Report for Internal Exams */
    getConsolidatedSeating: async (req: Request, res: Response) => {
        try {
            const { examDate, session, seriesId } = req.query;
            
            // Logic to group students by room/subject etc.
            const data = await InternalSeatAllocation.findAll({
                include: [
                    {
                        model: InternalExam,
                        as: 'Exam',
                        where: { ExamDate: examDate, Session: session, InternalExamSeriesID: seriesId }
                    },
                    {
                        model: InternalStudent,
                        as: 'Student',
                        include: [{ model: Department, as: 'Department' }]
                    },
                    {
                        model: InternalSeat,
                        as: 'Seat',
                        include: [{ model: InternalRoom, as: 'Room' }]
                    }
                ]
            });

            return res.json(data);
        } catch (error: any) {
            return res.status(500).json({ message: error.message });
        }
    }
};
