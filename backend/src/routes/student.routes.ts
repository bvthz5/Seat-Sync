import express from 'express';
import multer from 'multer';
import { getAllStudents, importStudents, createStudent, getCreateOptions, updateStudent, deleteStudent, exportStudents } from '../controllers/student.controller.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Multer setup for file upload (memory storage is fine for parsing immediately)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.mimetype === "application/vnd.ms-excel") {
            cb(null, true);
        } else {
            cb(new Error("Only Excel files are allowed"));
        }
    }
});

// Routes
router.get('/export', AuthMiddleware.verifyAccessToken, exportStudents);
router.get('/', AuthMiddleware.verifyAccessToken, getAllStudents);
router.post('/', AuthMiddleware.verifyAccessToken, createStudent);
router.put('/:id', AuthMiddleware.verifyAccessToken, updateStudent);
router.delete('/:id', AuthMiddleware.verifyAccessToken, deleteStudent);
router.get('/meta/create-options', AuthMiddleware.verifyAccessToken, getCreateOptions);
router.post('/import', AuthMiddleware.verifyAccessToken, upload.single('file'), importStudents);

export default router;
