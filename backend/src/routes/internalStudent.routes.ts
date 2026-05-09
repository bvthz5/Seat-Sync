import { Router } from 'express';
import multer from 'multer';
import {
    getAllInternalStudents,
    getInternalFilterOptions,
    importInternalStudents,
    getStudentsForInternalExam,
    removeStudentFromInternalExam,
    clearStudentsFromInternalExam,
    getInternalExamDetail,
    deleteInternalStudent,
    deleteAllInternalStudents,
    getInternalStudentStats,
    createInternalStudent,
    exportInternalStudentCredentials,
    syncInternalSemesters,
} from '../controllers/internalStudent.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Internal Student CRUD ──
router.get('/students', getAllInternalStudents);
router.post('/students', createInternalStudent);
router.get('/students/stats', getInternalStudentStats);
router.get('/students/filter-options', getInternalFilterOptions);
router.get('/students/export-credentials', exportInternalStudentCredentials);
router.post('/students/sync-semesters', syncInternalSemesters);
router.delete('/students/:id', deleteInternalStudent);
router.delete('/students', deleteAllInternalStudents);

// ── Student Import (maps to specific exam) ──
router.post('/students/import', upload.single('file'), importInternalStudents);

// ── Exam Detail + Mapped Students ──
router.get('/exams/:examId/detail', getInternalExamDetail);
router.get('/exams/:examId/students', getStudentsForInternalExam);
router.delete('/exams/:examId/students/:studentId', removeStudentFromInternalExam);
router.delete('/exams/:examId/students', clearStudentsFromInternalExam);

export default router;
