import { Request, Response } from "express";
import { ActivityLog, User, Exam } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Get Audit Logs with Advanced Filtering
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const {
            startDate,
            endDate,
            role, // 'exam_admin', 'root_admin', etc.
            userId,
            action,
            severity,
            examId,
            search
        } = req.query;

        const whereClause: any = {};
        const userWhere: any = {};

        // Date Range
        if (startDate || endDate) {
            whereClause.Timestamp = {};
            if (startDate) whereClause.Timestamp[Op.gte] = new Date(startDate as string);
            if (endDate) {
                const end = new Date(endDate as string);
                end.setHours(23, 59, 59, 999);
                whereClause.Timestamp[Op.lte] = end;
            }
        }

        // Role Filter
        if (role && role !== 'All') {
            userWhere.Role = role;
        }

        // User ID Filter
        if (userId) {
            whereClause.UserID = userId;
        }

        // Action
        if (action) {
            whereClause.Action = action;
        }

        // Severity
        if (severity) {
            whereClause.Severity = severity;
        }

        // Exam Context
        if (examId) {
            whereClause.EntityID = examId;
            whereClause.EntityType = 'Exam';
        }

        // search
        if (search) {
            whereClause[Op.or] = [
                { Action: { [Op.like]: `%${search}%` } },
                { Details: { [Op.like]: `%${search}%` } },
                { IPAddress: { [Op.like]: `%${search}%` } },
                { '$User.Username$': { [Op.like]: `%${search}%` } },
                { '$User.Email$': { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await ActivityLog.findAndCountAll({
            where: whereClause,
            include: [{
                model: User,
                attributes: ['Username', 'Email', 'Role'],
                where: userWhere,
                required: false // Optional unless searching or filtering by role
            }],
            order: [['Timestamp', 'DESC']],
            limit,
            offset,
            subQuery: false // Required when filtering by associated model columns (User.Username) in top-level where clause with pagination
        });

        res.status(200).json({
            success: true,
            data: {
                logs: rows,
                total: count,
                page,
                totalPages: Math.ceil(count / limit)
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get Audit Stats for Dashboard
 */
export const getAuditStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const totalToday = await ActivityLog.count({
            where: { Timestamp: { [Op.gte]: todayStart } }
        });

        const emergencyActions = await ActivityLog.count({
            where: {
                Severity: 'Critical',
                Action: { [Op.like]: '%EMERGENCY%' } // Or specific actions
            }
        });

        // Heuristic for Admin Actions vs System
        const adminActions = await ActivityLog.count({
            include: [{ model: User, where: { Role: { [Op.in]: ['admin', 'exam_admin', 'root_admin'] } } }],
            where: { Timestamp: { [Op.gte]: todayStart } }
        });

        const systemEvents = await ActivityLog.count({
            where: { Severity: 'Info', Action: { [Op.in]: ['SYSTEM_STARTUP', 'CRON_JOB'] } } // Example
        });

        res.status(200).json({
            success: true,
            data: {
                totalToday,
                emergencyActions,
                adminActions,
                systemEvents
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
