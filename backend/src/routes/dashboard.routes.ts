import { Router } from 'express';
import { getDashboardSummary, getLiveRoomUtilization, getLiveExams, getDepartmentStats, getReports, getActiveSessionIntelligence } from '../controllers/dashboard.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(AuthMiddleware.requireAuth);

router.get('/summary', getDashboardSummary);
router.get('/rooms', getLiveRoomUtilization);
router.get('/live-exams', getLiveExams);
router.get('/departments', getDepartmentStats);
router.get('/reports', getReports);
router.get('/session-intelligence', getActiveSessionIntelligence);

export default router;
