import { Router } from 'express';
import { internalReportsController } from '../../controllers/internal/internalReports.controller.js';

const router = Router();

router.get('/room-wise', internalReportsController.getRoomWiseSeating);
router.get('/consolidated', internalReportsController.getConsolidatedSeating);

export default router;
