import { Router } from "express";
import { 
    getAllInvigilators, createInvigilator, deleteInvigilator, getInvigilatorStats, 
    toggleInvigilatorFlag, toggleInvigilatorEligibility, bulkImportInvigilators, clearAllFaculties,
    activateInvigilator, verifyInvigilatorActivationToken, resendInvigilatorActivationLink, requestInvigilatorAccess, getInvigilatorRequests, 
    approveInvigilatorRequest, rejectInvigilatorRequest, getInvigilatorLoadStats, autoAssignInvigilators,
    saveInvigilatorAssignments, getInvigilatorAssignments
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
// Protect all below routes - accessible by Exam Admin
router.use((req, res, next) => AuthMiddleware.requireAuth(req, res, next));


/**
 * @swagger
 * tags:
 *   name: Invigilator
 *   description: Invigilator management (Root Admin only)
 */

router.get("/", getAllInvigilators);
router.get("/stats", getInvigilatorStats);
router.post("/", createInvigilator);
router.post("/bulk-import", bulkImportInvigilators);
router.patch("/:id/toggle-flag", toggleInvigilatorFlag);
router.patch("/:id/toggle-eligibility", toggleInvigilatorEligibility);
router.get("/requests", getInvigilatorRequests);
router.post("/requests/:id/approve", approveInvigilatorRequest);
router.post("/requests/:id/reject", rejectInvigilatorRequest);
router.get("/load-stats", getInvigilatorLoadStats);
router.post("/auto-assign", autoAssignInvigilators);
router.post("/save-assignments", saveInvigilatorAssignments);
router.get("/assignments", getInvigilatorAssignments);
router.delete("/clear-all", clearAllFaculties);
router.delete("/:id", deleteInvigilator);

export default router;
