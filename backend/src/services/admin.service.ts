import { User, ActivityLog, ActiveSession, Notification, PasswordReset, Invigilator, InvigilatorAssignment, InvigilatorAvailability, InvigilatorSubject } from "../models/index.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { emailService } from "./email.service.js";

export interface CreatorContext {
    email: string;
    userId?: number;
    ip?: string;
    userAgent?: string;
}

export class AdminService {
    /**
     * Get dashboard summary stats
     */
    static async getDashboardStats() {
        const totalAdmins = await User.count({ where: { Role: 'exam_admin' } });
        const activeAdmins = await User.count({
            where: {
                Role: 'exam_admin',
                IsActive: true
            }
        });
        const rootAdmins = await User.count({
            where: {
                Role: 'exam_admin',
                IsRootAdmin: true
            }
        });

        return {
            totalAdmins,
            activeAdmins,
            rootAdmins
        };
    }

    /**
     * Get list of admins with pagination, filtering and sorting
     */
    static async getAdmins(query: any) {
        const {
            page = 1,
            limit = 10,
            search = "",
            status,
            role,
            sortBy = "CreatedAt",
            sortOrder = "DESC"
        } = query;

        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: any = { Role: 'exam_admin' };

        // Search
        if (search) {
            whereClause[Op.or] = [
                { Email: { [Op.like]: `%${search}%` } },
                { FullName: { [Op.like]: `%${search}%` } }
            ];
        }

        // Filters
        if (status) {
            whereClause.IsActive = status === 'active';
        }

        if (role) {
            whereClause.IsRootAdmin = role === 'root';
        }

        // Query
        const { count, rows } = await User.findAndCountAll({
            where: whereClause,
            attributes: { exclude: ['PasswordHash'] }, // Security
            limit: Number(limit),
            offset: Number(offset),
            order: [[sortBy, sortOrder]]
        });

        return {
            admins: rows,
            total: count,
            totalPages: Math.ceil(count / Number(limit)),
            currentPage: Number(page)
        };
    }

    /**
     * Create a new Exam Admin
     */
    /**
     * Create a new Exam Admin
     */
    static async createAdmin(data: { email: string; fullName: string }, context: CreatorContext) {
        const { email, fullName } = data;

        // 1. Validate Email Domain
        const domainRegex = /@([a-zA-Z0-9-]+\.)*sjcetpalai\.ac\.in$/;
        if (!domainRegex.test(email)) {
            throw new Error("Email must end with @sjcetpalai.ac.in or its subdomains");
        }

        // 2. Check Duplicates
        const existingUser = await User.findOne({ where: { Email: email } });
        if (existingUser) {
            throw new Error("User with this email already exists");
        }

        // 3. Generate Password
        const password = this.generateSecurePassword();
        const hashedPassword = await bcrypt.hash(password, 12);

        // 4. Create User
        const newUser = await User.create({
            Email: email,
            FullName: fullName,
            PasswordHash: hashedPassword,
            Role: 'exam_admin',
            IsRootAdmin: false,
            IsActive: true,
            CreatedAt: new Date()
        });

        // 5. Send Email
        try {
            await emailService.sendAdminCreatedEmail(email, fullName, email, password);
        } catch (emailError: any) {
            console.warn(`[AdminService] Failed to send creation email to ${email}:`, emailError.message);
        }

        // 6. Log Activity
        await this.logActivity(context, "Create Admin", `Created admin account for ${email}`, newUser.UserID);

        return newUser;
    }

    /**
     * Reset Admin Password
     */
    static async resetPassword(adminId: number, context: CreatorContext) {
        const admin = await User.findByPk(adminId);
        if (!admin || admin.Role !== 'exam_admin') {
            throw new Error("Admin not found");
        }

        // Generate new password
        const password = this.generateSecurePassword();
        const hashedPassword = await bcrypt.hash(password, 12);

        await admin.update({
            PasswordHash: hashedPassword,
            IsPasswordChanged: false
        });

        // Invalidate Sessions
        await ActiveSession.update(
            { IsActive: false },
            { where: { UserID: adminId } }
        );

        // Send Email
        // Re-using the admin created email template or a simplified one containing the new password.
        // For now, let's use the same one as it conveys credentials clearly.
        try {
            await emailService.sendAdminCreatedEmail(admin.Email || "", admin.FullName || "Admin", admin.Email || "", password);
        } catch (emailError: any) {
            console.warn(`[AdminService] Failed to send reset password email to ${admin.Email}:`, emailError.message);
        }

        // Log
        await this.logActivity(context, "Reset Password", `Reset password for admin ${admin.Email}`, adminId);
    }

    /**
     * Toggle Admin Status (Disable/Enable)
     */
    static async toggleStatus(adminId: number, isActive: boolean, context: CreatorContext, creator: User) {
        const admin = await User.findByPk(adminId);
        if (!admin || admin.Role !== 'exam_admin') {
            throw new Error("Admin not found");
        }

        // Validation
        if (admin.IsRootAdmin) {
            throw new Error("Cannot change status of Root Admin");
        }
        if (admin.UserID === creator.UserID) {
            throw new Error("Cannot disable yourself");
        }

        // Update
        await admin.update({ IsActive: isActive });

        // If disabling, invalidate sessions
        if (!isActive) {
            await ActiveSession.update(
                { IsActive: false },
                { where: { UserID: adminId } }
            );
        }

        // Log
        const action = isActive ? "Enable Admin" : "Disable Admin";
        await this.logActivity(context, action, `${action} ${admin.Email}`, adminId);
    }

    /**
     * Delete Admin
     */
    static async deleteAdmin(adminId: number, context: CreatorContext, creator: User) {
        const admin = await User.findByPk(adminId);
        if (!admin || admin.Role !== 'exam_admin') {
            throw new Error("Admin not found");
        }

        // Validation
        if (admin.IsRootAdmin) {
            throw new Error("Cannot delete Root Admin");
        }
        if (admin.UserID === creator.UserID) {
            throw new Error("Cannot delete yourself");
        }

        // TODO: Check if assigned to active exam (Assuming table relation check or custom logic needed)
        // For now, we rely on DB constraints or future implementation. 
        // If there are foreign keys, deletion might fail, which is good.

        // Delete dependencies first (Hard delete)

        // 1. Active Sessions
        await ActiveSession.destroy({
            where: { UserID: adminId }
        });

        // 2. Activity Logs (Audit trail is lost, but required for hard delete if FK is restrictive)
        await ActivityLog.destroy({
            where: { UserID: adminId }
        });

        // 3. Notifications sent by this admin
        await Notification.destroy({
            where: { SentBy: adminId }
        });

        // 4. Password Resets
        await PasswordReset.destroy({
            where: { UserID: adminId }
        });

        // 5. Cleanup details if the user was somehow linked as an Invigilator (legacy or hybrid roles)
        const invigilator = await Invigilator.findOne({ where: { UserID: adminId } });
        if (invigilator) {
            // Delete Invigilator Dependencies
            await InvigilatorAssignment.destroy({ where: { InvigilatorID: invigilator.InvigilatorID } });
            await InvigilatorAvailability.destroy({ where: { InvigilatorID: invigilator.InvigilatorID } });
            await InvigilatorSubject.destroy({ where: { InvigilatorID: invigilator.InvigilatorID } });

            // Delete Invigilator Profile
            await invigilator.destroy();
        }

        // 6. Delete User
        await admin.destroy();

        // Log - we do not link EntityID because the entity is deleted
        await this.logActivity(context, "Delete Admin", `Deleted admin ${admin.Email} (ID: ${adminId})`);
    }

    /**
     * Get Admin Activity
     */
    /**
     * Get Admin Activity with Filters and Pagination
     */
    static async getAdminActivity(adminId: number, query: any) {
        const {
            page = 1,
            limit = 10,
            search,
            type, // 'Login', 'Exam', 'Seating', 'Student', 'Reports'
            startDate,
            endDate
        } = query;

        const offset = (Number(page) - 1) * Number(limit);
        const whereClause: any = { UserID: adminId };

        // Filter by Action Type
        if (type) {
            // Map generic types to specific Action strings if needed, or assume Action matches type
            // e.g. type='Login' -> Action IN ['Login Success', 'Login Failure', 'Logout']
            if (type === 'Login') {
                whereClause.Action = { [Op.or]: ['Login Success', 'Login Failure', 'Logout', 'Password Reset'] };
            } else if (type === 'Exam') {
                whereClause.Action = { [Op.like]: '%Exam%' };
            } else if (type === 'Seating') {
                whereClause.Action = { [Op.like]: '%Seating%' };
            } else if (type === 'Student') {
                whereClause.Action = { [Op.like]: '%Student%' };
            } else {
                whereClause.Action = { [Op.like]: `%${type}%` };
            }
        }

        // Filter by Date Range
        if (startDate || endDate) {
            whereClause.Timestamp = {};
            if (startDate) whereClause.Timestamp[Op.gte] = new Date(startDate);
            if (endDate) whereClause.Timestamp[Op.lte] = new Date(endDate);
        }

        // Search in Details
        if (search) {
            whereClause[Op.or] = [
                { Action: { [Op.like]: `%${search}%` } },
                { Details: { [Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await ActivityLog.findAndCountAll({
            where: whereClause,
            order: [['Timestamp', 'DESC']],
            limit: Number(limit),
            offset: Number(offset)
        });

        return {
            logs: rows,
            total: count,
            totalPages: Math.ceil(count / Number(limit)),
            currentPage: Number(page)
        };
    }

    // --- Helpers ---

    private static generateSecurePassword(): string {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";

        // Ensure at least one of each required type
        password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(Math.floor(Math.random() * 26));
        password += "abcdefghijklmnopqrstuvwxyz".charAt(Math.floor(Math.random() * 26));
        password += "0123456789".charAt(Math.floor(Math.random() * 10));
        password += "!@#$%^&*".charAt(Math.floor(Math.random() * 8));

        // Fill the rest
        for (let i = 4; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }

        // Shuffle
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    }

    public static async logActivity(context: CreatorContext, action: string, details: string, targetId?: number) {
        // Need to find UserID from email for the log
        const user = await User.findOne({ where: { Email: context.email } });
        if (user) {
            const logPayload: any = {
                UserID: user.UserID,
                Action: action,
                Details: details,
                EntityType: 'User',
                Timestamp: new Date(),
                IPAddress: context.ip,
                UserAgent: context.userAgent
            };

            if (targetId !== undefined) {
                logPayload.EntityID = targetId;
            }

            try {
                await ActivityLog.create(logPayload);
            } catch (logError: any) {
                console.warn("[AdminService] Failed to create ActivityLog:", logError.message);
                // Non-blocking: don't throw
            }
        }
    }
}
