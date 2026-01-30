import { Request, Response } from "express";
import { Exam, ActivityLog } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Exam Control Controller
 * Root Admin Only - Emergency exam management
 */

/**
 * Get exam status overview
 */
export const getExamStatusOverview = async (req: Request, res: Response): Promise<void> => {
    try {
        const exams = await Exam.findAll({
            attributes: ['ExamID', 'ExamName', 'ExamDate', 'StartTime', 'EndTime', 'Status'],
            order: [['ExamDate', 'DESC']]
        });

        // Count by status
        const statusCounts = exams.reduce((acc: any, exam: any) => {
            const status = exam.Status || 'Draft';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                exams,
                statusCounts
            }
        });
    } catch (error: any) {
        console.error("Error fetching exam status overview:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch exam status",
            error: error.message
        });
    }
};

/**
 * Override exam status (Emergency)
 */
export const overrideExamStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const { newStatus, reason } = req.body;
        const currentUser = (req as any).user;

        const validStatuses = ['Draft', 'Ready', 'Published', 'In Progress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(newStatus)) {
            res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
            return;
        }

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            res.status(404).json({
                success: false,
                message: "Exam not found"
            });
            return;
        }

        const oldStatus = (exam as any).Status || 'Draft';
        (exam as any).Status = newStatus;
        await exam.save();

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'OVERRIDE_EXAM_STATUS',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Changed exam status from ${oldStatus} to ${newStatus}. Reason: ${reason || 'Not provided'}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Exam status updated successfully",
            data: {
                examId: exam.ExamID,
                oldStatus,
                newStatus
            }
        });
    } catch (error: any) {
        console.error("Error overriding exam status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to override exam status",
            error: error.message
        });
    }
};

/**
 * Pause active exam (Emergency)
 */
export const pauseExam = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const { reason } = req.body;
        const currentUser = (req as any).user;

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            res.status(404).json({
                success: false,
                message: "Exam not found"
            });
            return;
        }

        const oldStatus = (exam as any).Status;
        (exam as any).Status = 'Paused';
        await exam.save();

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'PAUSE_EXAM',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Emergency pause: ${exam.ExamName}. Reason: ${reason || 'Not provided'}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Exam paused successfully",
            data: {
                examId: exam.ExamID,
                oldStatus,
                newStatus: 'Paused'
            }
        });
    } catch (error: any) {
        console.error("Error pausing exam:", error);
        res.status(500).json({
            success: false,
            message: "Failed to pause exam",
            error: error.message
        });
    }
};

/**
 * Resume paused exam
 */
export const resumeExam = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const currentUser = (req as any).user;

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            res.status(404).json({
                success: false,
                message: "Exam not found"
            });
            return;
        }

        (exam as any).Status = 'In Progress';
        await exam.save();

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'RESUME_EXAM',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Resumed exam: ${exam.ExamName}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Exam resumed successfully",
            data: {
                examId: exam.ExamID,
                status: 'In Progress'
            }
        });
    } catch (error: any) {
        console.error("Error resuming exam:", error);
        res.status(500).json({
            success: false,
            message: "Failed to resume exam",
            error: error.message
        });
    }
};

/**
 * Cancel exam (Emergency)
 */
export const cancelExam = async (req: Request, res: Response): Promise<void> => {
    try {
        const { examId } = req.params;
        const { reason } = req.body;
        const currentUser = (req as any).user;

        if (!reason) {
            res.status(400).json({
                success: false,
                message: "Reason is required for cancelling an exam"
            });
            return;
        }

        const exam = await Exam.findByPk(parseInt(examId as string));
        if (!exam) {
            res.status(404).json({
                success: false,
                message: "Exam not found"
            });
            return;
        }

        const oldStatus = (exam as any).Status;
        (exam as any).Status = 'Cancelled';
        await exam.save();

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'CANCEL_EXAM',
            EntityType: 'Exam',
            EntityID: exam.ExamID,
            Details: `Cancelled exam: ${exam.ExamName}. Reason: ${reason}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Exam cancelled successfully",
            data: {
                examId: exam.ExamID,
                oldStatus,
                newStatus: 'Cancelled'
            }
        });
    } catch (error: any) {
        console.error("Error cancelling exam:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel exam",
            error: error.message
        });
    }
};
