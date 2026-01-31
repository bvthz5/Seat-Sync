import { Router } from "express";
import { updateFaculty, deleteFaculty, createFaculty, importFaculties, uploadFacultyImage } from "../controllers/faculty.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// Protect all routes
router.use((req, res, next) => AuthMiddleware.requireRootAuth(req, res, next));

router.post("/", createFaculty);
router.post("/import", importFaculties);
router.post("/upload", upload.single("image"), uploadFacultyImage);
router.put("/:id", updateFaculty);
router.delete("/:id", deleteFaculty);

export default router;
