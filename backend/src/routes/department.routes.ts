import express from "express";
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getDepartmentById,
    importDepartments,
    importUnifiedDepartmentsPrograms,
    exportUnifiedDepartmentProgramTemplate,
    exportDepartmentTemplate,
    deleteAllDepartments,
} from "../controllers/department.controller.js";
import { AuthMiddleware } from "../middlewares/auth.middleware.js";
import multer from "multer";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management
 */

const upload = multer({ storage: multer.memoryStorage() });

router.get("/", AuthMiddleware.verifyAccessToken, getDepartments);

router.post("/", AuthMiddleware.requireRootAuth, createDepartment);

router.delete("/delete-all", AuthMiddleware.requireRootAuth, deleteAllDepartments);

router.post("/import", AuthMiddleware.requireRootAuth, upload.single('file'), importDepartments);

router.post("/import-unified", AuthMiddleware.requireRootAuth, upload.single('file'), importUnifiedDepartmentsPrograms);

router.get("/template-unified", AuthMiddleware.verifyAccessToken, exportUnifiedDepartmentProgramTemplate);

router.get("/template", AuthMiddleware.verifyAccessToken, exportDepartmentTemplate);

router.get("/:id", AuthMiddleware.verifyAccessToken, getDepartmentById);

router.put("/:id", AuthMiddleware.requireRootAuth, updateDepartment);

router.delete("/:id", AuthMiddleware.requireRootAuth, deleteDepartment);

export default router;
