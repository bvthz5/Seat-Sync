import { Router } from "express";
import { updateFaculty, deleteFaculty, createFaculty, importFaculties, uploadFacultyImage } from "../controllers/faculty.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// Protect all routes
router.use((req, res, next) => AuthMiddleware.requireRootAuth(req, res, next));

/**
 * @swagger
 * /api/faculties:
 *   post:
 *     summary: Create a new faculty member
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - FacultyName
 *               - Email
 *               - DepartmentID
 *             properties:
 *               FacultyName:
 *                 type: string
 *               Email:
 *                 type: string
 *               DepartmentID:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Faculty created
 */
router.post("/", createFaculty);

/**
 * @swagger
 * /api/faculties/import:
 *   post:
 *     summary: Import faculty members from Excel/CSV
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Import complete
 */
router.post("/import", importFaculties);

/**
 * @swagger
 * /api/faculties/upload:
 *   post:
 *     summary: Upload faculty profile image
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 */
router.post("/upload", upload.single("image"), uploadFacultyImage);

/**
 * @swagger
 * /api/faculties/{id}:
 *   put:
 *     summary: Update faculty member
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Faculty updated
 */
router.put("/:id", updateFaculty);

/**
 * @swagger
 * /api/faculties/{id}:
 *   delete:
 *     summary: Delete faculty member
 *     tags: [Faculty]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Faculty deleted
 */
router.delete("/:id", deleteFaculty);

export default router;
