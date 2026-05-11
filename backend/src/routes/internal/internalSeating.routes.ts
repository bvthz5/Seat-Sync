import { Router } from 'express';
import { internalSeatingController } from '../../controllers/internal/internalSeating.controller.js';

const router = Router();

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
router.delete('/allocations/all', internalSeatingController.clearAllAllocations);
router.delete('/allocation/:examDate/:session/:hallId', internalSeatingController.clearAllocation);

export default router;
