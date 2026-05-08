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
                console.error(`[Auth] Missing or invalid Authorization header on ${req.method} ${req.url}`);
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
            console.error(`[Auth] Token verification failed for ${req.method} ${req.url}. Reason:`, error.message);
            res.status(401).json({
                error: "Invalid or expired access token",
                message: error.message,
            });
        }
    }

    /**
     * Combined middleware for ANY authenticated user
     */
    static authenticated(req: Request, res: Response, next: NextFunction): void {
        AuthMiddleware.verifyAccessToken(req, res, next);
    }

    /**
     * Guard for exam_admin role or root admin
     */
    static requireExamAdmin(req: Request, res: Response, next: NextFunction): void {
        if (!req.user) {
            res.status(401).json({
                error: "Authentication required",
            });
            return;
        }

        if (req.user.Role !== "exam_admin" && !req.user.IsRootAdmin) {
            res.status(403).json({
                error: "Access denied. Exam admin or root admin role required",
                details: `Required: exam_admin, Current: ${req.user.Role}`
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
        AuthMiddleware.verifyAccessToken(req, res, () => {
            // After successful verification, check for admin role
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

    /**
     * Guard for authenticated student
     */
    static requireStudent(req: Request, res: Response, next: NextFunction): void {
        if (!req.user) {
            res.status(401).json({
                error: "Authentication required",
            });
            return;
        }

        if (req.user.Role !== "student") {
            res.status(403).json({
                error: "Access denied. Student role required",
            });
            return;
        }

        next();
    }

    /**
     * Guard for authenticated invigilator
     */
    static requireInvigilator(req: Request, res: Response, next: NextFunction): void {
        if (!req.user) {
            res.status(401).json({ error: "Authentication required" });
            return;
        }

        if (req.user.Role !== "invigilator") {
            res.status(403).json({ error: "Access denied. Invigilator role required" });
            return;
        }

        next();
    }
}