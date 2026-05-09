import { Router } from 'express';
import { internalSeatingController } from '../../controllers/internal/internalSeating.controller.js';

const router = Router();

router.get('/halls', internalSeatingController.getHalls);
router.get('/exam-dates', internalSeatingController.getExamDates);
router.get('/exams', internalSeatingController.getExams);
router.get('/halls/:hallId/layout', internalSeatingController.getHallLayout);
router.post('/generate', internalSeatingController.generateAllocation);
router.post('/save', internalSeatingController.saveAllocation);
router.delete('/allocation/:examDate/:session/:hallId', internalSeatingController.clearAllocation);

export default router;
