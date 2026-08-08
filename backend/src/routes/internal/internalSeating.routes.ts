import { Router } from 'express';
import { internalSeatingController } from '../../controllers/internal/internalSeating.controller.js';
import { AuthMiddleware } from '../../middlewares/auth.middleware.js';

const router = Router();

// Protect all internal seating routes
router.use(AuthMiddleware.requireAuth);

router.get('/halls', internalSeatingController.getHalls);
router.get('/exam-dates', internalSeatingController.getExamDates);
router.get('/sessions', internalSeatingController.getSessions);
router.get('/exams', internalSeatingController.getExams);
router.get('/summary', internalSeatingController.getSummary);
router.get('/halls/:hallId/layout', internalSeatingController.getHallLayout);
router.post('/generate', internalSeatingController.generateAllocation);
router.post('/auto-register', internalSeatingController.autoRegisterStudents);
router.post('/save', internalSeatingController.saveAllocation);
router.post('/slot', internalSeatingController.quickAddSlot);
router.get('/exams/:examId/students', internalSeatingController.getExamStudents);
router.get('/registered-students', internalSeatingController.getRegisteredStudents);
router.delete('/allocations/all', internalSeatingController.clearAllAllocations);
router.delete('/allocation/:examDate/:session/:hallId', internalSeatingController.clearAllocation);

export default router;
