import { Router } from 'express';
import { getDashboardSummary, getLiveRoomUtilization, getLiveExams, getDepartmentStats } from '../controllers/dashboard.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(AuthMiddleware.requireAuth);

router.get('/summary', getDashboardSummary);
router.get('/rooms', getLiveRoomUtilization);
router.get('/live-exams', getLiveExams);
router.get('/departments', getDepartmentStats);

export default router;
