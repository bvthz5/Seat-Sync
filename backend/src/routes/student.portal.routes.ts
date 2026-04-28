import express from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import {
    getStudentDashboard,
    getStudentExams,
    getStudentUpcomingExams,
    getStudentHistory,
    getStudentNotifications,
    getStudentSeating,
    getSeatLayout,
    getStudentProfile,
    updateStudentProfile,
    uploadStudentAvatar,
} from "../controllers/student.portal.controller.js";

const router = express.Router();

router.use(AuthMiddleware.verifyAccessToken);
router.use(AuthMiddleware.requireStudent);

router.get("/dashboard", getStudentDashboard);
router.get("/exams/upcoming", getStudentUpcomingExams);
router.get("/exams/history", getStudentHistory);
router.get("/exams", getStudentExams);
router.get("/seating", getStudentSeating);
router.get("/seating/:examId", getStudentSeating);
router.get("/seating/layout/:examId", getSeatLayout);
router.get("/notifications", getStudentNotifications);
router.get("/history", getStudentHistory);

// Profile Management
router.get("/profile", getStudentProfile);
router.put("/profile", updateStudentProfile);
router.post("/profile/avatar", uploadStudentAvatar);

export default router;