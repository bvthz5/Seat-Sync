import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { verifyRefreshToken } from "../utils/jwt.js";
import type { LoginRequest, RefreshResponse } from "../interfaces/auth.interfaces.js";

export class AuthController {
    /**
     * POST /api/auth/login
     * Login with email and password
     */
    static async login(req: Request, res: Response): Promise<void> {
        try {
            const { email, password }: LoginRequest = req.body;

            // Validate input
            if (!email || !password) {
                res.status(400).json({
                    error: "Email and password are required",
                });
                return;
            }

            // Authenticate user
            const result = await AuthService.login({ email, password });

            // Set refresh token as HttpOnly cookie
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/api/auth/refresh",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.status(200).json(result);
        } catch (error: any) {
            console.error("Login error:", error.message);
            res.status(401).json({
                error: "Authentication failed",
                message: error.message,
            });
        }
    }

    /**
     * POST /api/auth/refresh
     * Refresh access token using refresh token from cookie
     */
    static async refresh(req: Request, res: Response): Promise<void> {
        try {
            console.log("Refresh request cookies:", req.cookies); // Debugging
            const refreshToken = req.cookies.refreshToken;

            if (!refreshToken) {
                console.log("No refresh token found in cookies");
                res.status(401).json({
                    error: "Refresh token not found",
                });
                return;
            }

            // Refresh tokens
            const { accessToken, refreshToken: newRefreshToken } = await AuthService.refresh(refreshToken);

            // Rotate refresh token cookie
            res.cookie("refreshToken", newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/api/auth/refresh",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            res.status(200).json({ accessToken });
        } catch (error: any) {
            console.error("Refresh error:", error.message);
            res.status(401).json({
                error: "Token refresh failed",
                message: error.message,
            });
        }
    }

    /**
     * POST /api/auth/logout
     * Logout user by clearing refresh token cookie
     */
    static async logout(req: Request, res: Response): Promise<void> {
        try {
            // Clear refresh token cookie
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/api/auth/refresh",
            });

            res.status(200).json({
                message: "Logged out successfully",
            });
        } catch (error: any) {
            console.error("Logout error:", error.message);
            res.status(500).json({
                error: "Logout failed",
                message: error.message,
            });
        }
    }

    /**
     * POST /api/auth/forgot-password
     */
    static async forgotPassword(req: Request, res: Response): Promise<void> {
        try {
            const { email } = req.body;

            if (!email) {
                res.status(400).json({ error: "Email is required" });
                return;
            }

            await AuthService.forgotPassword(email);

            // Always return success to prevent email enumeration
            res.json({ message: "If an account exists, a reset link has been sent." });
        } catch (error: any) {
            console.error("Forgot password error:", error.message);
            res.status(500).json({ error: error.message || "Internal server error" });
        }
    }

    /**
     * POST /api/auth/reset-password
     */
    static async resetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                res.status(400).json({ error: "Token and new password are required" });
                return;
            }

            if (newPassword.length < 6) {
                res.status(400).json({ error: "Password must be at least 6 characters" });
                return;
            }

            await AuthService.resetPassword(token, newPassword);

            res.json({ message: "Password reset successful" });
        } catch (error: any) {
            console.error("Reset password error:", error.message);
            res.status(400).json({ error: error.message });
        }
    }

    /**
     * POST /api/auth/change-password
     */
    static async changePassword(req: Request, res: Response): Promise<void> {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user?.UserID;

            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!currentPassword || !newPassword) {
                res.status(400).json({ error: "Current and new password are required" });
                return;
            }

            if (newPassword.length < 6) {
                res.status(400).json({ error: "Password must be at least 6 characters" });
                return;
            }

            await AuthService.changePassword(userId, currentPassword, newPassword);

            res.json({ message: "Password changed successfully" });
        } catch (error: any) {
            console.error("Change password error:", error.message);
            res.status(400).json({ error: error.message });
        }
    }
}