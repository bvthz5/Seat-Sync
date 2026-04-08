import { Router } from "express";
import { getAllInvigilators, createInvigilator, deleteInvigilator, getInvigilatorStats, toggleInvigilatorFlag, toggleInvigilatorEligibility, bulkImportInvigilators, clearAllFaculties } from "../controllers/invigilator.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

// Protect all routes - only accessible by Root Admin
router.use((req, res, next) => AuthMiddleware.requireRootAuth(req, res, next));

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
router.delete("/clear-all", clearAllFaculties);
router.delete("/:id", deleteInvigilator);

export default router;
