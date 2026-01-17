import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import type { JWTPayload } from "../interfaces/auth.interfaces.js";

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export class AuthMiddleware {
    /**
     * Verify access token and attach user to request
     */
    static verifyAccessToken(req: Request, res: Response, next: NextFunction): void {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                res.status(401).json({
                    error: "Access token required",
                });
                return;
            }

            const token = authHeader.substring(7); // Remove "Bearer " prefix
            const payload = verifyAccessToken(token);

            // Attach user to request
            req.user = payload;

            next();
        } catch (error: any) {
            console.error("Token verification error:", error.message);
            res.status(401).json({
                error: "Invalid or expired access token",
                message: error.message,
            });
        }
    }

    /**
     * Guard for exam_admin role
     */
    static requireExamAdmin(req: Request, res: Response, next: NextFunction): void {
        if (!req.user) {
            res.status(401).json({
                error: "Authentication required",
            });
            return;
        }

        if (req.user.Role !== "exam_admin") {
            res.status(403).json({
                error: "Access denied. Exam admin role required",
            });
            return;
        }

        next();
    }

    /**
     * Guard for root admin (IsRootAdmin = true)
     */
    static requireRootAdmin(req: Request, res: Response, next: NextFunction): void {
        if (!req.user) {
            res.status(401).json({
                error: "Authentication required",
            });
            return;
        }

        if (!req.user.IsRootAdmin) {
            res.status(403).json({
                error: "Access denied. Root admin privileges required",
            });
            return;
        }

        next();
    }

    /**
     * Combined middleware for authenticated exam admin
     */
    static requireAuth(req: Request, res: Response, next: NextFunction): void {
        AuthMiddleware.verifyAccessToken(req, res, (err?: any) => {
            if (err) return;
            AuthMiddleware.requireExamAdmin(req, res, next);
        });
    }

    /**
     * Combined middleware for authenticated root admin
     */
    static requireRootAuth(req: Request, res: Response, next: NextFunction): void {
        AuthMiddleware.verifyAccessToken(req, res, (err?: any) => {
            if (err) return;
            AuthMiddleware.requireRootAdmin(req, res, next);
        });
    }
}