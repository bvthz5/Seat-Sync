import { Router } from 'express';
import multer from 'multer';
import {
    getAllInternalStudents,
    getInternalFilterOptions,
    importInternalStudents,
    getStudentsForInternalExam,
    removeStudentFromInternalExam,
    clearStudentsFromInternalExam,
    removeDepartmentFromInternalExam,
    getInternalExamDetail,
    deleteInternalStudent,
    updateInternalStudent,
    deleteAllInternalStudents,
    getInternalStudentStats,
    createInternalStudent,
    exportInternalStudentCredentials,
    syncInternalSemesters,
    autoMapStudentsForInternalExam,
    bulkAutoMapStudentsForSeries,
    clearSemesterStudentMappings,
    removeDepartmentsFromSeries,
    getSeriesSemesterDepartments,
    getInternalExamReconciliation,
    getInternalSeriesReconciliation,
    createInternalSubjectEnrollment,
    importSubjectEligibility,
    getExamReconciliation,
    getInternalStudentBatches,
} from '../controllers/internalStudent.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Internal Student CRUD ──
router.get('/students', getAllInternalStudents);
router.get('/students/batches', getInternalStudentBatches);
router.post('/students', createInternalStudent);
router.put('/students/:id', updateInternalStudent);
router.get('/students/stats', getInternalStudentStats);
router.get('/students/filter-options', getInternalFilterOptions);
router.get('/students/export-credentials', exportInternalStudentCredentials);
router.post('/students/sync-semesters', syncInternalSemesters);
router.delete('/students/:id', deleteInternalStudent);
router.delete('/students', deleteAllInternalStudents);

// ── Student Import & Subject Eligibility ──
router.post('/students/import', upload.single('file'), importInternalStudents);
router.post('/students/subject-eligibility/import', upload.single('file'), importSubjectEligibility);
router.post('/students/subject-enrollments', createInternalSubjectEnrollment);

// ── Exam Detail + Mapped Students + Reconciliation ──
router.get('/exams/:examId/detail', getInternalExamDetail);
router.get('/exams/:examId/students', getStudentsForInternalExam);
router.get('/exams/:examId/reconciliation', getInternalExamReconciliation);
router.get('/series/:seriesId/reconciliation', getInternalSeriesReconciliation);
router.post('/exams/:examId/students/auto-map', autoMapStudentsForInternalExam);
router.post('/series/:seriesId/auto-map-all', bulkAutoMapStudentsForSeries);
router.get('/series/:seriesId/semester-departments', getSeriesSemesterDepartments);
router.delete('/series/:seriesId/clear-mappings', clearSemesterStudentMappings);
router.delete('/series/:seriesId/departments/:deptCode', removeDepartmentsFromSeries);
router.delete('/exams/:examId/students/:studentId', removeStudentFromInternalExam);
router.delete('/exams/:examId/students', clearStudentsFromInternalExam);
router.delete('/exams/:examId/departments/:deptCode', removeDepartmentFromInternalExam);

export default router;
