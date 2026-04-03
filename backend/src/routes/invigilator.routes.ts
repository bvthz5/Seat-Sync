import { Router } from "express";
import { 
    getAllInvigilators, createInvigilator, deleteInvigilator, getInvigilatorStats, 
    toggleInvigilatorFlag, toggleInvigilatorEligibility, bulkImportInvigilators, clearAllFaculties,
    activateInvigilator, verifyInvigilatorActivationToken, resendInvigilatorActivationLink, requestInvigilatorAccess, getInvigilatorRequests, 
    approveInvigilatorRequest, rejectInvigilatorRequest
} from "../controllers/invigilator.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many activation-link checks. Please try again later." },
});

const activateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many activation attempts. Please try again later." },
});

const resendLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many activation requests. Please try again later." },
});

// ==========================================
// PUBLIC ROUTES
// ==========================================

router.get("/activate/verify", verifyLimiter, verifyInvigilatorActivationToken);
router.post("/activate", activateLimiter, activateInvigilator);
router.post("/activate/resend", resendLimiter, resendInvigilatorActivationLink);
router.post("/request", requestInvigilatorAccess);

// ==========================================
// PROTECTED ADMIN ROUTES
// ==========================================
// Protect all below routes - only accessible by Root Admin
router.use((req, res, next) => AuthMiddleware.requireRootAuth(req, res, next));


/**
 * @swagger
 * tags:
 *   name: Invigilator
 *   description: Invigilator management (Root Admin only)
 */

/**
 * @swagger
 * /api/invigilators:
 *   get:
 *     summary: Get all invigilators
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invigilators
 *       500:
 *         description: Server error
 */
router.get("/", getAllInvigilators);

/**
 * @swagger
 * /api/invigilators/stats:
 *   get:
 *     summary: Get invigilator statistics
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invigilator stats
 */
router.get("/stats", getInvigilatorStats);

/**
 * @swagger
 * /api/invigilators:
 *   post:
 *     summary: Create a new invigilator
 *     tags: [Invigilator]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - FullName
 *               - Email
 *               - Password
 *             properties:
 *               FullName:
 *                 type: string
 *               Email:
 *                 type: string
 *               Password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created successfully
 *       400:
 *         description: Missing fields
 *       409:
 *         description: Email already exists
 */
router.post("/", createInvigilator);
router.post("/bulk-import", bulkImportInvigilators);

/**
 * @swagger
 * /api/invigilators/{id}/toggle-flag:
 *   patch:
 *     summary: Toggle flagged status of an invigilator
 *     tags: [Invigilator]
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
 *         description: Toggle successful
 *       404:
 *         description: Not found
 */
router.patch("/:id/toggle-flag", toggleInvigilatorFlag);

/**
 * @swagger
 * /api/invigilators/{id}/toggle-eligibility:
 *   patch:
 *     summary: Toggle eligibility status of an invigilator
 *     tags: [Invigilator]
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
 *         description: Toggle successful
 *       404:
 *         description: Not found
 */
router.patch("/:id/toggle-eligibility", toggleInvigilatorEligibility);

/**
 * @swagger
 * /api/invigilators/{id}:
 *   delete:
 *     summary: Delete an invigilator
 *     tags: [Invigilator]
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
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
router.get("/requests", getInvigilatorRequests);
router.post("/requests/:id/approve", approveInvigilatorRequest);
router.post("/requests/:id/reject", rejectInvigilatorRequest);

router.delete("/clear-all", clearAllFaculties);
router.delete("/:id", deleteInvigilator);

export default router;
