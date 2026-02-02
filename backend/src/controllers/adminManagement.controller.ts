import { Request, Response } from "express";
import { AdminService } from "../services/admin.service.js";
import { User } from "../models/User.js";

/**
 * Get all exam admins (Dashboard list)
 */
export const getAllAdmins = async (req: Request, res: Response) => {
    try {
        // The service returns { admins, total, ... } structure for pagination
        // But the previous controller might have returned just a list.
        // The prompt asks for pagination, so the services return structure is correct.
        // We might need to handle query params here
        const result = await AdminService.getAdmins(req.query);

        // Also get dashboard stats if it's the main dashboard load? 
        // Or create a separate endpoint for stats. 
        // The routes file doesn't have a stats endpoint yet!
        // I should add getDashboardStats endpoint to routes and controller.

        res.status(200).json({
            success: true,
            data: result
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Get Dashboard Stats
 */
export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const stats = await AdminService.getDashboardStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * Create a new exam admin
 */
export const createAdmin = async (req: Request, res: Response) => {
    try {
        const { Email, FullName } = req.body; // Logic expected snake_case or camel? Prompt uses "Email", "Full Name" in table. Code usually camelCase or matching DB.
        // Previous controller used PascalCase 'Email'. Request body usually follows frontend.
        // Let's assume frontend sends { Email, FullName } to match DB or { email, fullName }.
        // I'll check what I used in validaton.

        // Handling both for safety
        const email = Email || req.body.email;
        const fullName = FullName || req.body.fullName;


        if (!email || !fullName) {
            res.status(400).json({ success: false, message: "Email and Full Name are required" });
            return;
        }

        const creatorEmail = (req.user as any)?.Email!;
        const newAdmin = await AdminService.createAdmin({ email, fullName }, creatorEmail);

        res.status(201).json({
            success: true,
            message: "Admin created successfully",
            data: {
                UserID: newAdmin.UserID,
                Email: newAdmin.Email,
                FullName: newAdmin.FullName,
                Role: newAdmin.Role,
                IsActive: newAdmin.IsActive,
                CreatedAt: newAdmin.CreatedAt
            }
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Reset admin password
 */
export const resetAdminPassword = async (req: Request, res: Response) => {
    try {
        const adminId = Number(req.params.adminId); // route param is adminId
        const creatorEmail = (req.user as any)?.Email!;

        await AdminService.resetPassword(adminId, creatorEmail);

        res.status(200).json({
            success: true,
            message: "Password reset successfully. New credentials sent via email."
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Toggle admin status
 */
export const toggleAdminStatus = async (req: Request, res: Response) => {
    try {
        const adminId = Number(req.params.adminId);
        // We need 'isActive' from body.
        // Previous controller just toggled it.
        // Ideally strict setting is better. The prompt implies "Disable Admin" button, so probably explicit state.
        // But if I want to keep compatibility or "toggle", I can check.
        // The service uses explicit 'isActive'.
        // Let's support explicit.

        const { isActive } = req.body;

        // If isActive is undefined, we might need to fetch current state and toggle? 
        // Simplest is to require isActive or implement toggle logic here.
        // Let's implement toggle logic if isActive is missing, or fetch to toggle.
        // But service `toggleStatus` takes `isActive`.

        const creator = await User.findByPk((req.user as any)?.UserID);
        if (!creator) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        let targetState = isActive;
        if (targetState === undefined) {
            const admin = await User.findByPk(adminId);
            if (!admin) throw new Error("Admin not found");
            targetState = !admin.IsActive;
        }

        await AdminService.toggleStatus(adminId, targetState, creator);

        res.status(200).json({
            success: true,
            message: `Admin ${targetState ? 'enabled' : 'disabled'} successfully`,
            data: { IsActive: targetState }
        });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Delete admin
 */
export const deleteAdmin = async (req: Request, res: Response) => {
    try {
        const adminId = Number(req.params.adminId);
        const creator = await User.findByPk((req.user as any)?.UserID);
        if (!creator) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        await AdminService.deleteAdmin(adminId, creator);

        res.status(200).json({ success: true, message: "Admin deleted successfully" });
    } catch (error: any) {
        res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Get admin activity
 */
export const getAdminActivity = async (req: Request, res: Response) => {
    try {
        const adminId = Number(req.params.adminId);
        const logs = await AdminService.getAdminActivity(adminId);
        res.status(200).json({
            success: true,
            data: logs
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
