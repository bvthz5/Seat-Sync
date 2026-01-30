import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User, ActivityLog, ActiveSession } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Admin Management Controller
 * Root Admin Only - Manages exam admin accounts
 */

/**
 * Get all exam admins
 */
export const getAllAdmins = async (req: Request, res: Response): Promise<void> => {
    try {
        const admins = await User.findAll({
            where: {
                Role: 'exam_admin'
            },
            attributes: ['UserID', 'Email', 'FullName', 'IsRootAdmin', 'IsActive', 'CreatedAt'],
            order: [['CreatedAt', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: admins
        });
    } catch (error: any) {
        console.error("Error fetching admins:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch admins",
            error: error.message
        });
    }
};

/**
 * Create a new exam admin
 */
export const createAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { Email, FullName, Password, IsRootAdmin } = req.body;
        const currentUser = (req as any).user;

        // Validation
        if (!Email || !Password) {
            res.status(400).json({
                success: false,
                message: "Email and Password are required"
            });
            return;
        }

        // Check if email already exists
        const existingUser = await User.findOne({ where: { Email } });
        if (existingUser) {
            res.status(409).json({
                success: false,
                message: "Email already exists"
            });
            return;
        }

        // Hash password
        const PasswordHash = await bcrypt.hash(Password, 10);

        // Create admin
        const newAdmin = await User.create({
            Email,
            FullName: FullName || null,
            PasswordHash,
            Role: 'exam_admin',
            IsRootAdmin: IsRootAdmin || false,
            IsActive: true
        });

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'CREATE_ADMIN',
            EntityType: 'User',
            EntityID: newAdmin.UserID,
            Details: `Created new admin: ${Email}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: {
                UserID: newAdmin.UserID,
                Email: newAdmin.Email,
                FullName: newAdmin.FullName,
                IsRootAdmin: newAdmin.IsRootAdmin,
                IsActive: newAdmin.IsActive
            }
        });
    } catch (error: any) {
        console.error("Error creating admin:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create admin",
            error: error.message
        });
    }
};

/**
 * Toggle admin active status
 */
export const toggleAdminStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId } = req.params;
        const currentUser = (req as any).user;

        // Cannot disable yourself
        if (parseInt(adminId as string) === currentUser.UserID) {
            res.status(403).json({
                success: false,
                message: "You cannot disable your own account"
            });
            return;
        }

        const admin = await User.findByPk(parseInt(adminId as string));
        if (!admin || admin.Role !== 'exam_admin') {
            res.status(404).json({
                success: false,
                message: "Admin not found"
            });
            return;
        }

        // Toggle status
        admin.IsActive = !admin.IsActive;
        await admin.save();

        // If disabling, invalidate all sessions
        if (!admin.IsActive) {
            await ActiveSession.update(
                { IsActive: false },
                { where: { UserID: admin.UserID } }
            );
        }

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: admin.IsActive ? 'ENABLE_ADMIN' : 'DISABLE_ADMIN',
            EntityType: 'User',
            EntityID: admin.UserID,
            Details: `${admin.IsActive ? 'Enabled' : 'Disabled'} admin: ${admin.Email}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: `Admin ${admin.IsActive ? 'enabled' : 'disabled'} successfully`,
            data: {
                UserID: admin.UserID,
                IsActive: admin.IsActive
            }
        });
    } catch (error: any) {
        console.error("Error toggling admin status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to toggle admin status",
            error: error.message
        });
    }
};

/**
 * Reset admin password
 */
export const resetAdminPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId } = req.params;
        const { newPassword } = req.body;
        const currentUser = (req as any).user;

        if (!newPassword || newPassword.length < 8) {
            res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
            return;
        }

        const admin = await User.findByPk(parseInt(adminId as string));
        if (!admin || admin.Role !== 'exam_admin') {
            res.status(404).json({
                success: false,
                message: "Admin not found"
            });
            return;
        }

        // Hash new password
        const PasswordHash = await bcrypt.hash(newPassword, 10);
        admin.PasswordHash = PasswordHash;
        await admin.save();

        // Invalidate all sessions for this admin
        await ActiveSession.update(
            { IsActive: false },
            { where: { UserID: admin.UserID } }
        );

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'RESET_ADMIN_PASSWORD',
            EntityType: 'User',
            EntityID: admin.UserID,
            Details: `Reset password for admin: ${admin.Email}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Password reset successfully. All sessions invalidated."
        });
    } catch (error: any) {
        console.error("Error resetting admin password:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reset password",
            error: error.message
        });
    }
};

/**
 * Get admin activity logs
 */
export const getAdminActivity = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId } = req.params;
        const { limit = 50 } = req.query;

        const logs = await ActivityLog.findAll({
            where: { UserID: parseInt(adminId as string) },
            order: [['Timestamp', 'DESC']],
            limit: parseInt(limit as string)
        });

        res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error: any) {
        console.error("Error fetching admin activity:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch activity logs",
            error: error.message
        });
    }
};

/**
 * Delete admin (soft delete - just disable)
 */
export const deleteAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { adminId } = req.params;
        const currentUser = (req as any).user;

        // Cannot delete yourself
        if (parseInt(adminId as string) === currentUser.UserID) {
            res.status(403).json({
                success: false,
                message: "You cannot delete your own account"
            });
            return;
        }

        const admin = await User.findByPk(parseInt(adminId as string));
        if (!admin || admin.Role !== 'exam_admin') {
            res.status(404).json({
                success: false,
                message: "Admin not found"
            });
            return;
        }

        // Soft delete - just disable
        admin.IsActive = false;
        await admin.save();

        // Invalidate all sessions
        await ActiveSession.update(
            { IsActive: false },
            { where: { UserID: admin.UserID } }
        );

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'DELETE_ADMIN',
            EntityType: 'User',
            EntityID: admin.UserID,
            Details: `Deleted admin: ${admin.Email}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(200).json({
            success: true,
            message: "Admin deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting admin:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete admin",
            error: error.message
        });
    }
};
