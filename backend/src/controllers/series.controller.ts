import { Request, Response } from "express";
import { ExamSeries, AcademicYear, Semester, ActivityLog } from "../models/index.js";

/**
 * Exam Series Controller
 */

export const getAllSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { academicYearId, semesterId } = req.query;
        const whereClause: any = {};

        if (academicYearId) whereClause.AcademicYearID = academicYearId;
        if (semesterId) whereClause.SemesterID = semesterId;

        const series = await ExamSeries.findAll({
            where: whereClause,
            include: [
                { model: AcademicYear, attributes: ['YearName'] },
                { model: Semester, attributes: ['SemesterNumber', 'SemesterName'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: series
        });
    } catch (error: any) {
        console.error("Error fetching exam series:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch exam series",
            error: error.message
        });
    }
};

export const createSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { SeriesName, AcademicYearID, SemesterID, Description } = req.body;
        const currentUser = (req as any).user;

        if (!SeriesName || !AcademicYearID) {
            res.status(400).json({
                success: false,
                message: "SeriesName and AcademicYearID are required"
            });
            return;
        }

        const series = await ExamSeries.create({
            SeriesName,
            AcademicYearID,
            SemesterID,
            Description,
            IsActive: true
        });

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'CREATE_EXAM_SERIES',
            EntityType: 'ExamSeries',
            EntityID: series.ExamSeriesID,
            Details: `Created exam series: ${SeriesName}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(201).json({
            success: true,
            message: "Exam series created successfully",
            data: series
        });
    } catch (error: any) {
        console.error("Error creating exam series:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create exam series",
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

export const updateSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { seriesId } = req.params;
        const { SeriesName, AcademicYearID, SemesterID, Description, IsActive } = req.body;
        const currentUser = (req as any).user;

        const series = await ExamSeries.findByPk(seriesId as string);
        if (!series) {
            res.status(404).json({
                success: false,
                message: "Exam series not found"
            });
            return;
        }

        await series.update({
            SeriesName: SeriesName || series.SeriesName,
            AcademicYearID: AcademicYearID || series.AcademicYearID,
            SemesterID: SemesterID || series.SemesterID,
            Description: Description !== undefined ? Description : series.Description,
            IsActive: IsActive !== undefined ? IsActive : series.IsActive
        });

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'UPDATE_EXAM_SERIES',
            EntityType: 'ExamSeries',
            EntityID: series.ExamSeriesID,
            Details: `Updated exam series: ${series.SeriesName}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Exam series updated successfully",
            data: series
        });
    } catch (error: any) {
        console.error("Error updating exam series:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update exam series",
            error: error.message
        });
    }
};

export const deleteSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { seriesId } = req.params;
        const currentUser = (req as any).user;

        const series = await ExamSeries.findByPk(seriesId as string);
        if (!series) {
            res.status(404).json({
                success: false,
                message: "Exam series not found"
            });
            return;
        }

        // Check if exams are linked
        // This is handled by DB FK constraint usually, but we can check or just attempt delete
        await series.destroy();

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'DELETE_EXAM_SERIES',
            EntityType: 'ExamSeries',
            EntityID: series.ExamSeriesID,
            Details: `Deleted exam series: ${series.SeriesName}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Exam series deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting exam series:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete exam series. It may be referenced by exams.",
            error: error.message
        });
    }
};
