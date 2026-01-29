import { Request, Response } from "express";
import { ActiveSession, User, ActivityLog } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Security Controller
 * Root Admin Only - Manage active sessions and security
 */

/**
 * Get all active sessions
 */
export const getAllActiveSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const sessions = await ActiveSession.findAll({
            where: {
                IsActive: true,
                ExpiresAt: {
                    [Op.gt]: new Date()
                }
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['UserID', 'Email', 'FullName', 'Role', 'IsRootAdmin']
                }
            ],
            order: [['LastActivity', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error: any) {
        console.error("Error fetching active sessions:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch active sessions",
            error: error.message
        });
    }
};

/**
 * Force logout a specific session
 */
export const forceLogoutSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const currentUser = (req as any).user;

        const session = await ActiveSession.findByPk(parseInt(sessionId as string), {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['UserID', 'Email']
                }
            ]
        });

        if (!session) {
            res.status(404).json({
                success: false,
                message: "Session not found"
            });
            return;
        }

        // Invalidate session
        session.IsActive = false;
        await session.save();

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'FORCE_LOGOUT',
            EntityType: 'Session',
            EntityID: session.SessionID,
            Details: `Force logged out session for user: ${(session as any).user?.Email}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Session terminated successfully"
        });
    } catch (error: any) {
        console.error("Error force logging out session:", error);
        res.status(500).json({
            success: false,
            message: "Failed to terminate session",
            error: error.message
        });
    }
};

/**
 * Force logout all sessions for a specific user
 */
export const forceLogoutUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const currentUser = (req as any).user;

        // Cannot force logout yourself
        if (parseInt(userId as string) === currentUser.UserID) {
            res.status(403).json({
                success: false,
                message: "You cannot force logout yourself"
            });
            return;
        }

        const user = await User.findByPk(parseInt(userId as string));
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Invalidate all sessions for this user
        const result = await ActiveSession.update(
            { IsActive: false },
            {
                where: {
                    UserID: userId,
                    IsActive: true
                }
            }
        );

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'FORCE_LOGOUT_USER',
            EntityType: 'User',
            EntityID: user.UserID,
            Details: `Force logged out all sessions for user: ${user.Email}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: `All sessions terminated for ${user.Email}`,
            sessionsTerminated: result[0]
        });
    } catch (error: any) {
        console.error("Error force logging out user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to terminate user sessions",
            error: error.message
        });
    }
};

/**
 * Invalidate all tokens (emergency action)
 */
export const invalidateAllTokens = async (req: Request, res: Response): Promise<void> => {
    try {
        const currentUser = (req as any).user;

        // Invalidate ALL active sessions except current user
        const result = await ActiveSession.update(
            { IsActive: false },
            {
                where: {
                    UserID: {
                        [Op.ne]: currentUser.UserID
                    },
                    IsActive: true
                }
            }
        );

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'INVALIDATE_ALL_TOKENS',
            EntityType: 'System',
            EntityID: 0,
            Details: `Emergency: Invalidated all tokens system-wide`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "All tokens invalidated successfully",
            sessionsTerminated: result[0]
        });
    } catch (error: any) {
        console.error("Error invalidating all tokens:", error);
        res.status(500).json({
            success: false,
            message: "Failed to invalidate tokens",
            error: error.message
        });
    }
};

/**
 * Get session statistics
 */
export const getSessionStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const totalActive = await ActiveSession.count({
            where: {
                IsActive: true,
                ExpiresAt: {
                    [Op.gt]: new Date()
                }
            }
        });

        const byRole = await ActiveSession.findAll({
            where: {
                IsActive: true,
                ExpiresAt: {
                    [Op.gt]: new Date()
                }
            },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['Role']
                }
            ],
            attributes: []
        });

        // Count by role
        const roleStats = byRole.reduce((acc: any, session: any) => {
            const role = session.user?.Role || 'unknown';
            acc[role] = (acc[role] || 0) + 1;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                totalActive,
                byRole: roleStats
            }
        });
    } catch (error: any) {
        console.error("Error fetching session stats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch session statistics",
            error: error.message
        });
    }
};
