import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply Root Admin protection to all routes
router.use(AuthMiddleware.requireRootAuth);

// Dashboard
router.get("/stats", AdminController.getDashboardStats);

// User Management
router.get("/users", AdminController.getAdmins);
router.post("/users", AdminController.createAdmin);

// Specific User Actions
router.post("/users/:id/reset-password", AdminController.resetPassword);
router.put("/users/:id/status", AdminController.updateStatus);
router.delete("/users/:id", AdminController.deleteAdmin);
router.get("/users/:id/activity", AdminController.getActivity);

export default router;
