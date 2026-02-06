import express from 'express';
import { getAllSeries, createSeries, updateSeries, deleteSeries } from '../controllers/series.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: ExamSeries
 *   description: Exam series management endpoints
 */

router.get('/', AuthMiddleware.verifyAccessToken, getAllSeries);
router.post('/', AuthMiddleware.verifyAccessToken, createSeries);
router.put('/:seriesId', AuthMiddleware.verifyAccessToken, updateSeries);
router.delete('/:seriesId', AuthMiddleware.verifyAccessToken, deleteSeries);

export default router;
