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
                sameSite: "strict",
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
            const refreshToken = req.cookies.refreshToken;
            console.log("[Auth] Refresh request cookies:", JSON.stringify(req.cookies));
            console.log("[Auth] Received refreshToken:", refreshToken);

            if (!refreshToken) {
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
                sameSite: "strict",
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
                sameSite: "strict",
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
}