import express from "express";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import {
    getStudentDashboard,
    getStudentExams,
    getStudentHistory,
    getStudentNotifications,
    getStudentSeating,
} from "../controllers/student.portal.controller.js";

const router = express.Router();

router.use(AuthMiddleware.verifyAccessToken);
router.use(AuthMiddleware.requireStudent);

router.get("/dashboard", getStudentDashboard);
router.get("/exams", getStudentExams);
router.get("/seating", getStudentSeating);
router.get("/notifications", getStudentNotifications);
router.get("/history", getStudentHistory);

export default router;