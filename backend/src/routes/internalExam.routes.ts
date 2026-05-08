import express from 'express';
import { InternalExamController } from '../controllers/internalExam.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/import-timetable', AuthMiddleware.verifyAccessToken, upload.single('file'), InternalExamController.importTimetable);

export default router;
