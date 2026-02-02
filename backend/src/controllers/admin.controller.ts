import { Request, Response } from "express";
import { AdminService } from "../services/admin.service.js";
import { User } from "../models/User.js";

export class AdminController {
    static async getDashboardStats(req: Request, res: Response) {
        try {
            const stats = await AdminService.getDashboardStats();
            res.json(stats);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async getAdmins(req: Request, res: Response) {
        try {
            const result = await AdminService.getAdmins(req.query);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    static async createAdmin(req: Request, res: Response) {
        try {
            const { email, fullName } = req.body;
            if (!email || !fullName) {
                res.status(400).json({ error: "Email and Full Name are required" });
                return;
            }

            const creatorEmail = req.user?.Email!;
            const newAdmin = await AdminService.createAdmin({ email, fullName }, creatorEmail);

            res.status(201).json({
                message: "Admin created successfully",
                admin: {
                    id: newAdmin.UserID,
                    email: newAdmin.Email,
                    fullName: newAdmin.FullName,
                    role: newAdmin.Role,
                    status: newAdmin.IsActive ? 'Active' : 'Disabled',
                    createdAt: newAdmin.CreatedAt
                }
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async resetPassword(req: Request, res: Response) {
        try {
            const adminId = Number(req.params.id);
            const creatorEmail = req.user?.Email!;

            await AdminService.resetPassword(adminId, creatorEmail);

            res.json({ message: "Password reset successfully. New credentials sent via email." });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async updateStatus(req: Request, res: Response) {
        try {
            const adminId = Number(req.params.id);
            const { isActive } = req.body;

            if (typeof isActive !== 'boolean') {
                res.status(400).json({ error: "isActive status is required" });
                return;
            }

            // Need full user object for checking self/root constraints
            const creator = await User.findByPk(req.user?.UserID);
            if (!creator) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            await AdminService.toggleStatus(adminId, isActive, creator);

            res.json({ message: `Admin ${isActive ? 'enabled' : 'disabled'} successfully` });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async deleteAdmin(req: Request, res: Response) {
        try {
            const adminId = Number(req.params.id);

            const creator = await User.findByPk(req.user?.UserID);
            if (!creator) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            await AdminService.deleteAdmin(adminId, creator);

            res.json({ message: "Admin deleted successfully" });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async getActivity(req: Request, res: Response) {
        try {
            const adminId = Number(req.params.id);
            const logs = await AdminService.getAdminActivity(adminId);
            res.json(logs);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
