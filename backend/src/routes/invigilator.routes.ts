import { Router } from "express";
import { 
    getAllInvigilators, createInvigilator, deleteInvigilator, getInvigilatorStats, 
    toggleInvigilatorFlag, toggleInvigilatorEligibility, bulkImportInvigilators, clearAllFaculties,
    activateInvigilator, verifyInvigilatorActivationToken, resendInvigilatorActivationLink, requestInvigilatorAccess, getInvigilatorRequests, 
    approveInvigilatorRequest, rejectInvigilatorRequest, getInvigilatorLoadStats, autoAssignInvigilators,
    saveInvigilatorAssignments, getInvigilatorAssignments, getInvigilatorDashboardData, getAssignmentDetails, saveAttendance, reportIncident, requestSwap,
    getAllSwaps, getAvailableInvigilatorsForSwap, approveSwap, rejectSwap
} from "../controllers/invigilator.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = Router();

// ==========================================
// INVIGILATOR PORTAL ROUTES (High Priority)
// ==========================================
// Dashboard and duty details for logged-in invigilators
router.get("/dashboard", AuthMiddleware.authenticated, getInvigilatorDashboardData);
router.get("/assignments/:id", AuthMiddleware.authenticated, getAssignmentDetails);
router.post("/attendance/save", AuthMiddleware.authenticated, saveAttendance);
router.post("/incident/report", AuthMiddleware.authenticated, reportIncident);
router.post("/swap/request", AuthMiddleware.authenticated, requestSwap);

// Limiters
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
// Protect all below routes - accessible only by Exam Admin or Root Admin
router.use(AuthMiddleware.requireAuth);

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

// Admin Swap Management
router.get("/swaps", getAllSwaps);
router.get("/swaps/:id/available", getAvailableInvigilatorsForSwap);
router.post("/swaps/:id/approve", approveSwap);
router.post("/swaps/:id/reject", rejectSwap);

export default router;
