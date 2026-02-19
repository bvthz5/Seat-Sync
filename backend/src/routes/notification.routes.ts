import { Router } from "express";
import {
    createNotification,
    deleteNotification,
    getAllNotificationsAdmin,
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    getUserStats
} from "../controllers/notification.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// --- Public / User Routes (Authenticated) ---
router.use(AuthMiddleware.requireAuth); // All routes need login

router.get("/my", getMyNotifications);
router.get("/stats", getUserStats);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllAsRead);

// --- Admin Routes ---
// Note: router.use applies to subsequent routes. 
// We want /my and /stats accessible by all, but creation/deletion by admin.
// However, currently we are sending notifications via this API which should be admin only.

router.get("/admin/all", AuthMiddleware.requireRootAuth, getAllNotificationsAdmin);
router.post("/", AuthMiddleware.requireRootAuth, createNotification); // Create broadcast
router.delete("/:id", AuthMiddleware.requireRootAuth, deleteNotification);

export default router;
