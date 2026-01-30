
import { Request, Response } from 'express';
import { Exam } from '../models/Exam.js';
import { Subject } from '../models/Subject.js';
import { Op } from 'sequelize';

export class ExamController {

    // Get all exams with optional filtering
    static async getExams(req: Request, res: Response) {
        try {
            const { search, status, startDate, endDate } = req.query;

            const whereClause: any = {};

            if (search) {
                whereClause.ExamName = { [Op.like]: `%${search}%` };
            }

            if (status) {
                whereClause.Status = status;
            }

            if (startDate && endDate) {
                whereClause.ExamDate = {
                    [Op.between]: [startDate, endDate]
                };
            }

            const exams = await Exam.findAll({
                where: whereClause,
                include: [{ model: Subject, attributes: ['SubjectName', 'SubjectCode'] }],
                order: [['ExamDate', 'ASC']]
            });

            res.json(exams);
        } catch (error: any) {
            res.status(500).json({ message: 'Error fetching exams', error: error.message });
        }
    }

    // Create a new exam
    static async createExam(req: Request, res: Response) {
        try {
            const { SubjectID, ExamName, ExamDate, Session, Duration } = req.body;

            // Basic validation
            if (!SubjectID || !ExamName || !ExamDate || !Session || !Duration) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Determine status based on date (simple logic for now)
            const examDateObj = new Date(ExamDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let status = 'Scheduled';
            if (examDateObj < today) {
                status = 'Completed';
            }

            const newExam = await Exam.create({
                SubjectID,
                ExamName,
                ExamDate,
                Session,
                Duration,
                Status: status
            });

            res.status(201).json(newExam);
        } catch (error: any) {
            res.status(500).json({ message: 'Error creating exam', error: error.message });
        }
    }

    // Update an exam
    static async updateExam(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const exam = await Exam.findByPk(id);
            if (!exam) {
                return res.status(404).json({ message: 'Exam not found' });
            }

            await exam.update(updates);
            res.json(exam);
        } catch (error: any) {
            res.status(500).json({ message: 'Error updating exam', error: error.message });
        }
    }

    // Delete an exam
    static async deleteExam(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const exam = await Exam.findByPk(id);

            if (!exam) {
                return res.status(404).json({ message: 'Exam not found' });
            }

            await exam.destroy();
            res.json({ message: 'Exam deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ message: 'Error deleting exam', error: error.message });
        }
    }

    // Get statistics for dashboard
    static async getStats(req: Request, res: Response) {
        try {
            const totalExams = await Exam.count();
            const completedExams = await Exam.count({ where: { Status: 'Completed' } });
            const upcomingExams = await Exam.count({
                where: {
                    ExamDate: { [Op.gte]: new Date() }
                }
            });

            // "Active" could mean today's exams
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const activeToday = await Exam.count({
                where: {
                    ExamDate: {
                        [Op.between]: [startOfDay, endOfDay]
                    }
                }
            });

            res.json({
                total: totalExams,
                completed: completedExams,
                upcoming: upcomingExams,
                activeToday: activeToday
            });
        } catch (error: any) {
            res.status(500).json({ message: 'Error fetching stats', error: error.message });
        }
    }
}
