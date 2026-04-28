import { Request, Response } from "express";
import { ExamSeries, ActivityLog } from "../models/index.js";

/**
 * Exam Series Controller
 */

export const getAllSeries = async (req: Request, res: Response): Promise<void> => {
    try {
        const { semesterId } = req.query;
        const whereClause: any = {};

        if (semesterId) whereClause.SemesterID = semesterId;

        const series = await ExamSeries.findAll({
            where: whereClause,
            order: [['ExamSeriesID', 'DESC']]
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
        const { SeriesName, ExamType, Description } = req.body;
        const currentUser = (req as any).user;

        if (!SeriesName || !SeriesName.trim()) {
            res.status(400).json({
                success: false,
                message: "Series name is required"
            });
            return;
        }

        // Check if series with same name already exists
        const existing = await ExamSeries.findOne({ where: { SeriesName: SeriesName.trim() } });
        if (existing) {
            res.status(400).json({
                success: false,
                message: "A series with this name already exists"
            });
            return;
        }

        const result = await ExamSeries.create({
            SeriesName: SeriesName.trim(),
            ExamType: ExamType || 'Internal',
            Description: Description || `${SeriesName.trim()} series`,
            IsActive: true
        });

        // Log activity (optional - don't fail if this fails)
        try {
            if (currentUser?.UserID) {
                await ActivityLog.create({
                    UserID: currentUser.UserID,
                    Action: 'CREATE_EXAM_SERIES',
                    EntityType: 'ExamSeries',
                    EntityID: result.ExamSeriesID,
                    Details: `Created exam series: ${SeriesName.trim()}`,
                    IPAddress: req.ip || 'unknown',
                    UserAgent: req.get('user-agent') || 'unknown',
                    Severity: 'Info',
                    Status: 'Success'
                });
            }
        } catch (logError) {
            console.warn("Warning: Failed to log activity:", logError);
        }

        res.status(201).json({
            success: true,
            message: "Exam series created successfully",
            data: result
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
        const { SeriesName, ExamType, SemesterID, Description, IsActive } = req.body;
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
            ExamType: ExamType || series.ExamType,
            SemesterID: SemesterID || series.SemesterID,
            Description: Description !== undefined ? Description : series.Description,
            IsActive: IsActive !== undefined ? IsActive : series.IsActive
        });

        // Log activity
        try {
            if (currentUser?.UserID) {
                await ActivityLog.create({
                    UserID: currentUser.UserID,
                    Action: 'UPDATE_EXAM_SERIES',
                    EntityType: 'ExamSeries',
                    EntityID: series.ExamSeriesID,
                    Details: `Updated exam series: ${series.SeriesName}`,
                    IPAddress: req.ip || 'unknown',
                    UserAgent: req.get('user-agent') || 'unknown',
                    Severity: 'Info',
                    Status: 'Success'
                });
            }
        } catch (logError) {
            console.warn("Warning: Failed to log activity:", logError);
        }

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

        const seriesName = series.SeriesName;
        const seriesIdNum = series.ExamSeriesID;

        // Check if exams are linked
        // This is handled by DB FK constraint usually, but we can check or just attempt delete
        await series.destroy();

        // Log activity (optional - don't fail if this fails)
        try {
            if (currentUser?.UserID) {
                await ActivityLog.create({
                    UserID: currentUser.UserID,
                    Action: 'DELETE_EXAM_SERIES',
                    EntityType: 'ExamSeries',
                    EntityID: seriesIdNum,
                    Details: `Deleted exam series: ${seriesName}`,
                    IPAddress: req.ip || 'unknown',
                    UserAgent: req.get('user-agent') || 'unknown',
                    Severity: 'Info',
                    Status: 'Success'
                });
            }
        } catch (logError) {
            console.warn("Warning: Failed to log activity:", logError);
        }

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
