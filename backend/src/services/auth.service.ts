import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { generateRandomToken, hashToken } from "../utils/hash.js";
import { PasswordReset } from "../models/PasswordReset.model.js";
import { Op } from "sequelize";
import { emailService } from "./email.service.js";
import type { LoginRequest, LoginResponse, JWTPayload } from "../interfaces/auth.interfaces.js";

interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export class AuthService {
    private static normalizePortalRole(role: string): "exam_admin" | "invigilator" | "student" {
        if (role === "root_admin" || role === "admin") return "exam_admin";
        return role as "exam_admin" | "invigilator" | "student";
    }
    /**
     * Validate admin credentials and generate tokens
     */
    static async login(credentials: LoginRequest): Promise<LoginResponse> {
        const { email, password, role } = credentials;
        const whereClause: any = {
            Email: email,
            IsActive: true,
        };
        if (role) {
            whereClause.Role = role;
        } else {
            // Admin portal login: support legacy admin role values as well.
            whereClause.Role = { [Op.in]: ["exam_admin", "root_admin", "admin"] };
        }

        // Find user by email
        const user = await User.findOne({ where: whereClause });

        if (!user) {
            throw new Error("Invalid credentials or account is inactive");
        }

        // Check for account lockout
        if (user.AccountLockedUntil && user.AccountLockedUntil > new Date()) {
            const remainingMinutes = Math.ceil((user.AccountLockedUntil.getTime() - Date.now()) / 60000);
            throw new Error(`Account locked. Too many failed attempts. Please try again in ${remainingMinutes} minutes.`);
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
        if (!isPasswordValid) {
            // Increment failed attempts
            const failedAttempts = (user.FailedLoginAttempts || 0) + 1;
            let lockUntil = user.AccountLockedUntil;
            
            if (failedAttempts >= 5) {
                lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
            }
            
            await user.update({ 
                FailedLoginAttempts: failedAttempts,
                AccountLockedUntil: lockUntil
            });

            throw new Error("Invalid credentials");
        }

        // Reset failed attempts on successful login
        if (user.FailedLoginAttempts > 0 || user.AccountLockedUntil) {
            await user.update({ 
                FailedLoginAttempts: 0,
                AccountLockedUntil: null
            });
        }

        const normalizedRole = this.normalizePortalRole(user.Role as string);

        // Generate tokens
        const payload: JWTPayload = {
            UserID: user.UserID,
            Email: user.Email,
            Role: normalizedRole,
            IsRootAdmin: user.IsRootAdmin,
            IsPasswordChanged: user.IsPasswordChanged,
        };

        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken({ UserID: user.UserID });

        return {
            accessToken,
            refreshToken,
            user: {
                UserID: user.UserID,
                Email: user.Email,
                Role: normalizedRole,
                IsRootAdmin: user.IsRootAdmin,
                IsPasswordChanged: user.IsPasswordChanged,
            },
        };
    }

    /**
     * Refresh access token using refresh token
     */
    static async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        // Verify refresh token
        const payload = verifyRefreshToken(refreshToken);

        // Find user
        const user = await User.findByPk(payload.UserID);
        if (!user || !user.IsActive) {
            throw new Error("Invalid refresh token or user is inactive");
        }

        // Strict role check for refresh: admin/root admin/invigilator only
        if (!['exam_admin', 'root_admin', 'admin', 'invigilator'].includes(user.Role as string)) {
            throw new Error("Invalid role for this portal");
        }

        const normalizedRole = this.normalizePortalRole(user.Role as string);

        // Generate new access token
        const accessPayload: JWTPayload = {
            UserID: user.UserID,
            Email: user.Email,
            Role: normalizedRole,
            IsRootAdmin: user.IsRootAdmin,
            IsPasswordChanged: user.IsPasswordChanged,
        };

        const newAccessToken = signAccessToken(accessPayload);



        // Optionally rotate refresh token (generate new one)
        const newRefreshToken = signRefreshToken({ UserID: user.UserID });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    }

    /**
     * Logout (invalidate refresh token)
     * In a stateless JWT system, logout is primarily handled on the client side
     * by clearing tokens. Server-side invalidation would require a token blacklist.
     */
    static async logout(): Promise<void> {
        // In a stateless system, we don't need to do anything server-side
        // The client should clear the refresh token cookie
        return Promise.resolve();
    }

    /**
     * Hash a password for storage
     */
    static async hashPassword(password: string): Promise<string> {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }

    /**
     * Handle Forgot Password Request
     */
    static async forgotPassword(email: string): Promise<void> {
        // 1. Find user
        const user = await User.findOne({
            where: {
                Email: email,
                Role: 'exam_admin',
                IsActive: true
            }
        });

        if (!user) {
            // Security: Silent failure (don't reveal if email exists)
            // In a real app, perhaps wait a similar amount of time as a success case
            return;
        }

        // 2. Generate Reset Token
        const resetToken = generateRandomToken(32);
        const tokenHash = hashToken(resetToken);

        // 3. Save to DB
        // Expire in 15 minutes
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await PasswordReset.create({
            UserID: user.UserID,
            TokenHash: tokenHash,
            ExpiresAt: expiresAt,
            UsedAt: null, // Explicitly null
        });

        // 4. Send Email
        const resetLink = `http://localhost:5173/admin/reset-password?token=${resetToken}`;

        try {
            await emailService.sendPasswordResetEmail(email, resetLink);
            console.log(`[AuthService] Password Reset Email Sent to ${email}`);
        } catch (error) {
            console.error(`[AuthService] Failed to send email to ${email}`);
            // Note: We might want to remove the token from DB if email fails, 
            // but for security against enumeration, we usually proceed silently or handle it.
        }
    }

    /**
     * Handle Reset Password
     */
    static async resetPassword(token: string, newPassword: string): Promise<void> {
        const tokenHash = hashToken(token);

        // 1. Find valid token
        const resetRecord = await PasswordReset.findOne({
            where: {
                TokenHash: tokenHash,
                UsedAt: null,
                ExpiresAt: {
                    [Op.gt]: new Date() // Must be in future
                }
            },
            include: [{ model: User }]
        });

        if (!resetRecord) {
            throw new Error("Invalid or expired password reset token");
        }

        const user = await User.findByPk(resetRecord.UserID);
        if (!user) {
            throw new Error("User associated with token not found");
        }

        // 2. Hash new password
        const passwordHash = await this.hashPassword(newPassword);

        // 3. Update User Password
        await user.update({
            PasswordHash: passwordHash,
            IsPasswordChanged: true
        });

        // 4. Mark token as used
        await resetRecord.update({
            UsedAt: new Date()
        });
    }

    /**
     * Change Password (Logged In)
     */
    static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error("User not found");
        }

        // 1. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.PasswordHash);
        if (!isMatch) {
            throw new Error("Incorrect current password");
        }

        // 2. Hash new password
        const passwordHash = await this.hashPassword(newPassword);

        // 3. Update DB
        await user.update({
            PasswordHash: passwordHash,
            IsPasswordChanged: true
        });
    }
}
