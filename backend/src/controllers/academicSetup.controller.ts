import { Request, Response } from "express";
import { AcademicYear, Department, Program, Semester, Subject, ActivityLog } from "../models/index.js";
import { Op } from "sequelize";

/**
 * Academic Setup Controller
 * Root Admin Only - Manages academic structure
 */

// ==================== ACADEMIC YEARS ====================

export const getAllAcademicYears = async (req: Request, res: Response): Promise<void> => {
    try {
        const years = await AcademicYear.findAll({
            order: [['StartDate', 'DESC']]
        });

        res.status(200).json({
            success: true,
            data: years
        });
    } catch (error: any) {
        console.error("Error fetching academic years:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch academic years",
            error: error.message
        });
    }
};

export const createAcademicYear = async (req: Request, res: Response): Promise<void> => {
    try {
        const { YearName, StartDate, EndDate, IsCurrent } = req.body;
        const currentUser = (req as any).user;

        // Validation
        if (!YearName || !StartDate || !EndDate) {
            res.status(400).json({
                success: false,
                message: "YearName, StartDate, and EndDate are required"
            });
            return;
        }

        // If setting as current, unset all others
        if (IsCurrent) {
            await AcademicYear.update(
                { IsCurrent: false },
                { where: { IsCurrent: true } }
            );
        }

        const year = await AcademicYear.create({
            YearName,
            StartDate,
            EndDate,
            IsCurrent: IsCurrent || false,
            IsActive: true
        });

        // Log activity (non-blocking - don't fail if logging fails)
        try {
            await ActivityLog.create({
                UserID: currentUser.UserID,
                Action: 'CREATE_ACADEMIC_YEAR',
                EntityType: 'AcademicYear',
                EntityID: year.AcademicYearID,
                Details: `Created academic year: ${YearName}`,
                IPAddress: req.ip || 'unknown',
                UserAgent: req.get('user-agent') || 'unknown'
            });
        } catch (logError: any) {
            console.warn("Failed to log activity:", logError.message);
            // Don't fail the request if logging fails
        }

        res.status(201).json({
            success: true,
            message: "Academic year created successfully",
            data: year
        });
    } catch (error: any) {
        console.error("Error creating academic year:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create academic year",
            error: error.message,
            details: error.errors ? error.errors.map((e: any) => e.message) : undefined
        });
    }
};

export const setCurrentAcademicYear = async (req: Request, res: Response): Promise<void> => {
    try {
        const { yearId } = req.params;
        const currentUser = (req as any).user;

        // Unset all current years
        await AcademicYear.update(
            { IsCurrent: false },
            { where: { IsCurrent: true } }
        );

        // Set new current year
        const year = await AcademicYear.findByPk(parseInt(yearId as string));
        if (!year) {
            res.status(404).json({
                success: false,
                message: "Academic year not found"
            });
            return;
        }

        year.IsCurrent = true;
        await year.save();

        // Log activity (non-blocking)
        try {
            await ActivityLog.create({
                UserID: currentUser.UserID,
                Action: 'SET_CURRENT_YEAR',
                EntityType: 'AcademicYear',
                EntityID: year.AcademicYearID,
                Details: `Set current academic year: ${year.YearName}`,
                IPAddress: req.ip || 'unknown',
                UserAgent: req.get('user-agent') || 'unknown'
            });
        } catch (logError: any) {
            console.warn("Failed to log activity:", logError.message);
        }

        res.status(200).json({
            success: true,
            message: "Current academic year updated",
            data: year
        });
    } catch (error: any) {
        console.error("Error setting current year:", error);
        res.status(500).json({
            success: false,
            message: "Failed to set current year",
            error: error.message
        });
    }
};

export const deleteAcademicYear = async (req: Request, res: Response): Promise<void> => {
    try {
        const { yearId } = req.params;
        const currentUser = (req as any).user;

        const year = await AcademicYear.findByPk(parseInt(yearId as string));
        if (!year) {
            res.status(404).json({
                success: false,
                message: "Academic year not found"
            });
            return;
        }

        if (year.IsCurrent) {
            res.status(400).json({
                success: false,
                message: "Cannot delete the current active academic year. Please set another year as current first."
            });
            return;
        }

        // Check for dependencies (optional but good practice)
        // For now, we will just attempt to delete. If FK constraints fail, the catch block handles it.
        await year.destroy();

        // Log activity (non-blocking)
        try {
            await ActivityLog.create({
                UserID: currentUser.UserID,
                Action: 'DELETE_ACADEMIC_YEAR',
                EntityType: 'AcademicYear',
                EntityID: year.AcademicYearID,
                Details: `Deleted academic year: ${year.YearName}`,
                IPAddress: req.ip || 'unknown',
                UserAgent: req.get('user-agent') || 'unknown'
            });
        } catch (logError: any) {
            console.warn("Failed to log activity:", logError.message);
        }

        res.status(200).json({
            success: true,
            message: "Academic year deleted successfully"
        });
    } catch (error: any) {
        console.error("Error deleting academic year:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete academic year. It may referenced by other records.",
            error: error.message
        });
    }
};

// ==================== DEPARTMENTS ====================

export const getAllDepartments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { academicYearId } = req.query;
        const whereClause: any = {};

        if (academicYearId) {
            whereClause.AcademicYearID = academicYearId;
        }

        const departments = await Department.findAll({
            where: whereClause,
            order: [['DepartmentName', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: departments
        });
    } catch (error: any) {
        console.error("Error fetching departments:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch departments",
            error: error.message
        });
    }
};

export const createDepartment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { DepartmentName, DepartmentCode, AcademicYearID } = req.body;
        const currentUser = (req as any).user;

        if (!DepartmentName || !DepartmentCode || !AcademicYearID) {
            res.status(400).json({
                success: false,
                message: "DepartmentName, DepartmentCode, and AcademicYearID are required"
            });
            return;
        }

        const department = await Department.create({
            DepartmentName,
            DepartmentCode,
            AcademicYearID
        });

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'CREATE_DEPARTMENT',
            EntityType: 'Department',
            EntityID: department.DepartmentID,
            Details: `Created department: ${DepartmentName}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(201).json({
            success: true,
            message: "Department created successfully",
            data: department
        });
    } catch (error: any) {
        console.error("Error creating department:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create department",
            error: error.message
        });
    }
};

// ==================== PROGRAMS ====================

export const getAllPrograms = async (req: Request, res: Response): Promise<void> => {
    try {
        const { departmentId, academicYearId } = req.query;
        const whereClause: any = {};

        if (departmentId) whereClause.DepartmentID = departmentId;
        if (academicYearId) whereClause.AcademicYearID = academicYearId;

        const programs = await Program.findAll({
            where: whereClause,
            order: [['ProgramName', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: programs
        });
    } catch (error: any) {
        console.error("Error fetching programs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch programs",
            error: error.message
        });
    }
};

export const createProgram = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ProgramName, ProgramCode, DurationYears, DepartmentID, AcademicYearID } = req.body;
        const currentUser = (req as any).user;

        if (!ProgramName || !ProgramCode || !DepartmentID || !AcademicYearID) {
            res.status(400).json({
                success: false,
                message: "ProgramName, ProgramCode, DepartmentID, and AcademicYearID are required"
            });
            return;
        }

        const program = await Program.create({
            ProgramName,
            ProgramCode,
            DurationYears: DurationYears || 4,
            DepartmentID,
            AcademicYearID
        });

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'CREATE_PROGRAM',
            EntityType: 'Program',
            EntityID: program.ProgramID,
            Details: `Created program: ${ProgramName}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(201).json({
            success: true,
            message: "Program created successfully",
            data: program
        });
    } catch (error: any) {
        console.error("Error creating program:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create program",
            error: error.message
        });
    }
};

// ==================== SEMESTERS ====================

export const getAllSemesters = async (req: Request, res: Response): Promise<void> => {
    try {
        const { programId, academicYearId } = req.query;
        const whereClause: any = {};

        if (programId) whereClause.ProgramID = programId;
        if (academicYearId) whereClause.AcademicYearID = academicYearId;

        const semesters = await Semester.findAll({
            where: whereClause,
            order: [['SemesterNumber', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: semesters
        });
    } catch (error: any) {
        console.error("Error fetching semesters:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch semesters",
            error: error.message
        });
    }
};

export const createSemester = async (req: Request, res: Response): Promise<void> => {
    try {
        const { SemesterNumber, SemesterName, ProgramID, AcademicYearID } = req.body;
        const currentUser = (req as any).user;

        if (!SemesterNumber || !SemesterName || !ProgramID || !AcademicYearID) {
            res.status(400).json({
                success: false,
                message: "SemesterNumber, SemesterName, ProgramID, and AcademicYearID are required"
            });
            return;
        }

        const semester = await Semester.create({
            SemesterNumber,
            SemesterName,
            ProgramID,
            AcademicYearID
        });

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'CREATE_SEMESTER',
            EntityType: 'Semester',
            EntityID: semester.SemesterID,
            Details: `Created semester: ${SemesterName}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(201).json({
            success: true,
            message: "Semester created successfully",
            data: semester
        });
    } catch (error: any) {
        console.error("Error creating semester:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create semester",
            error: error.message
        });
    }
};

// ==================== SUBJECTS ====================

export const getAllSubjects = async (req: Request, res: Response): Promise<void> => {
    try {
        const { semesterId, programId, academicYearId } = req.query;
        const whereClause: any = {};

        if (semesterId) whereClause.SemesterID = semesterId;
        if (programId) whereClause.ProgramID = programId;
        if (academicYearId) whereClause.AcademicYearID = academicYearId;

        const subjects = await Subject.findAll({
            where: whereClause,
            order: [['SubjectName', 'ASC']]
        });

        res.status(200).json({
            success: true,
            data: subjects
        });
    } catch (error: any) {
        console.error("Error fetching subjects:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch subjects",
            error: error.message
        });
    }
};

export const createSubject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { SubjectCode, SubjectName, DepartmentID, SemesterID, ProgramID, AcademicYearID, Credits } = req.body;
        const currentUser = (req as any).user;

        if (!SubjectCode || !SubjectName || !DepartmentID || !SemesterID || !ProgramID || !AcademicYearID) {
            res.status(400).json({
                success: false,
                message: "SubjectCode, SubjectName, DepartmentID, SemesterID, ProgramID, and AcademicYearID are required"
            });
            return;
        }

        const subject = await Subject.create({
            SubjectCode,
            SubjectName,
            DepartmentID,
            SemesterID
        });

        // Log activity
        await ActivityLog.create({
            UserID: currentUser.UserID,
            Action: 'CREATE_SUBJECT',
            EntityType: 'Subject',
            EntityID: subject.SubjectID,
            Details: `Created subject: ${SubjectName}`,
            IPAddress: req.ip || 'unknown',
            UserAgent: req.get('user-agent') || 'unknown'
        });

        res.status(201).json({
            success: true,
            message: "Subject created successfully",
            data: subject
        });
    } catch (error: any) {
        console.error("Error creating subject:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create subject",
            error: error.message
        });
    }
};
