import { Request, Response } from "express";
import { User, Invigilator, Faculty, InvigilatorAssignment, Exam } from "../models/index.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import { sequelize } from "../config/database.js";

/**
 * Invigilator Controller
 */

export const getAllInvigilators = async (req: Request, res: Response) => {
    try {
        // Fetch all faculties
        const faculties = await Faculty.findAll();
        console.log("Fetched Faculties count:", faculties.length);
        if (faculties.length > 0) {
<<<<<<< Updated upstream
            console.log("Sample Faculty:", faculties[0]?.toJSON());
=======
            console.log("Sample Faculty:", faculties[0].toJSON());
>>>>>>> Stashed changes
        }

        const today = new Date().toISOString().split('T')[0];

        // Fetch all assignments to calculate total exams count and on-duty status
        let allAssignments: any[] = [];
        try {
            allAssignments = await InvigilatorAssignment.findAll({
                include: [{
                    model: Exam,
                    attributes: ["ExamID", "ExamDate"]
                }]
            });
        } catch (assignmentError) {
            console.warn("Could not fetch invigilator assignments (may be empty):", assignmentError);
        }

        // Map faculties to invigilator format
        const formattedInvigilators = faculties.map(faculty => {
            const facultyData = faculty.toJSON();

            // FacultyID maps to InvigilatorID in assignments
            const facultyAssignments = allAssignments.filter(a => a.InvigilatorID === faculty.FacultyID);

            return {
                InvigilatorID: faculty.FacultyID,
                FacultyID: faculty.FacultyID,
                Name: faculty.Name,
                Designation: faculty.Designation,
                ProfileImageURL: faculty.ProfileImageURL,
                isEligible: faculty.IsEligible,
                isFlagged: false,
                Department: (facultyData as any).Department,
                totalExams: facultyAssignments.length,
                isOnDuty: facultyAssignments.some(a => {
                    if (!a.Exam) return false;
                    const examDate = typeof a.Exam.ExamDate === 'string'
                        ? a.Exam.ExamDate
                        : (a.Exam.ExamDate as Date).toISOString().split('T')[0];
                    return examDate === today;
                })
            };
        });

        res.json(formattedInvigilators);
    } catch (error: any) {
        console.error("==================== GET ALL INVIGILATORS ERROR ====================");
        console.error(error);
        if (error.original) console.error("ORIGINAL:", error.original);
        console.error("=====================================================================");
        res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleInvigilatorFlag = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const invigilator = await Invigilator.findByPk(id as string);

        if (!invigilator) {
            return res.status(404).json({ message: "Invigilator not found" });
        }

        invigilator.IsFlagged = !invigilator.IsFlagged;
        await invigilator.save();

        res.json({
            message: `Invigilator ${invigilator.IsFlagged ? 'flagged' : 'unflagged'} successfully`,
            isFlagged: invigilator.IsFlagged
        });
    } catch (error: any) {
        console.error("Error toggling flag:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const toggleInvigilatorEligibility = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const faculty = await Faculty.findByPk(id as string);

        if (!faculty) {
            return res.status(404).json({ message: "Faculty not found" });
        }

        faculty.IsEligible = !faculty.IsEligible;
        await faculty.save();

        res.json({
            message: `Faculty marked as ${faculty.IsEligible ? 'eligible' : 'ineligible'} successfully`,
            isEligible: faculty.IsEligible
        });
    } catch (error: any) {
        console.error("Error toggling eligibility:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const createInvigilator = async (req: Request, res: Response) => {
    try {
        const { FacultyID, Name, Department, Designation } = req.body;

        if (!FacultyID || !Name || !Department) {
            return res.status(400).json({ message: "Staff Code, Name, and Department are required" });
        }

        const staffCodeStr = String(FacultyID).trim();

        // Check for duplicate by StaffCode
        const existing = await Faculty.findOne({ where: { StaffCode: staffCodeStr } });
        if (existing) {
            return res.status(409).json({ message: `Staff Code ${staffCodeStr} already exists` });
        }

        const faculty = await Faculty.create({
            StaffCode: staffCodeStr,
            Name: String(Name).trim(),
            Department: String(Department).trim(),
            Designation: Designation ? String(Designation).trim() : "Faculty",
            IsEligible: true,
        });

        res.status(201).json({
            message: "Invigilator added successfully",
            faculty: faculty.toJSON(),
        });
    } catch (error: any) {
        console.error("Error creating invigilator:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: "Staff Code already exists" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteInvigilator = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // The frontend sends FacultyID (aliased as InvigilatorID in getAllInvigilators)
        const faculty = await Faculty.findByPk(id as string);

        if (!faculty) {
            return res.status(404).json({ message: "Invigilator not found" });
        }

        // Delete the faculty record
        await faculty.destroy();

        res.json({ message: "Invigilator deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting invigilator:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getInvigilatorStats = async (req: Request, res: Response) => {
    try {
        const total = await Faculty.count();
        const eligible = await Faculty.count({
            where: { IsEligible: true }
        });
        const active = eligible; // For faculties, active = eligible

        const today = new Date().toISOString().split('T')[0];
        let onDuty = 0;
        try {
            const onDutyAssignments = await InvigilatorAssignment.findAll({
                include: [{
                    model: Exam,
                    where: {
                        ExamDate: today
                    }
                }]
            });
            onDuty = new Set(onDutyAssignments.map(a => a.InvigilatorID)).size;
        } catch (e) {
            console.warn("Could not calculate onDuty stats:", e);
        }

        const flagged = await Faculty.count({
            where: { IsEligible: false }
        });

        res.json({
            total,
            active,
            eligible,
            onDuty,
            flagged
        });
    } catch (error: any) {
        console.error("Error fetching stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Bulk import invigilators (Faculty records) from parsed Excel data.
 * Expected body: { rows: [{ FacultyID, Name, Department, Designation? }] }
 */
export const bulkImportInvigilators = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: "No rows provided" });
        }

        const created: number[] = [];
        const skipped: { row: number; reason: string }[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const { FacultyID, Name, Department: deptValue, Designation } = row;

            try {
                // Defensive check - ensure values are strings
                const deptStr = deptValue ? String(deptValue).trim() : "";
                const nameStr = Name ? String(Name).trim() : "";
                const desigStr = Designation ? String(Designation).trim() : "Faculty";
<<<<<<< Updated upstream
                const staffCodeStr = FacultyID ? String(FacultyID).trim() : "";

                if (!nameStr || !deptStr || !staffCodeStr) {
                    skipped.push({ row: i + 2, reason: `Invalid data: Name=${nameStr}, Dept=${deptStr}, StaffCode=${FacultyID}` });
                    continue;
                }

                // Check for duplicate StaffCode
                const existing = await Faculty.findOne({ where: { StaffCode: staffCodeStr }, transaction: t });
                if (existing) {
                    skipped.push({ row: i + 2, reason: `StaffCode ${staffCodeStr} already exists` });
=======
                const facultyIDNum = Number(FacultyID);

                if (!nameStr || !deptStr || isNaN(facultyIDNum)) {
                    skipped.push({ row: i + 2, reason: `Invalid data: Name=${nameStr}, Dept=${deptStr}, ID=${FacultyID}` });
                    continue;
                }

                // Check for duplicate FacultyID
                const existing = await Faculty.findByPk(facultyIDNum, { transaction: t });
                if (existing) {
                    skipped.push({ row: i + 2, reason: `FacultyID ${facultyIDNum} already exists` });
>>>>>>> Stashed changes
                    continue;
                }

                await Faculty.create({
<<<<<<< Updated upstream
                    StaffCode: staffCodeStr,
=======
                    FacultyID: facultyIDNum,
>>>>>>> Stashed changes
                    Name: nameStr,
                    Designation: desigStr,
                    Department: deptStr,
                    IsEligible: true,
                }, { transaction: t });

                created.push(i + 2);
            } catch (rowError: any) {
                console.error(`Row ${i + 2} failed:`, rowError);
                skipped.push({ row: i + 2, reason: `Database error: ${rowError.message}` });
            }
        }

        await t.commit();
        res.status(201).json({
            message: `Import complete: ${created.length} created, ${skipped.length} skipped.`,
            created: created.length,
            skipped,
        });
    } catch (error: any) {
        await t.rollback();
        console.error("Error bulk importing invigilators:", error);
        // Add more detail to the error response
        const message = error.errors ? error.errors.map((e: any) => e.message).join(", ") : error.message;
        res.status(500).json({ message: "Internal server error", detail: message });
    }
};
<<<<<<< Updated upstream
/**
 * Clear all faculty records (to be called before a fresh bulk import)
 */
export const clearAllFaculties = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        // Delete assignments referencing faculty first to avoid FK violations
        await InvigilatorAssignment.destroy({ where: {}, transaction: t });
        const deleted = await Faculty.destroy({ where: {}, transaction: t });
        await t.commit();
        res.json({ message: `Cleared ${deleted} faculty record(s) successfully.`, deleted });
    } catch (error: any) {
        await t.rollback();
        console.error("Error clearing faculties:", error);
        res.status(500).json({ message: "Internal server error", detail: error.message });
    }
};
=======
>>>>>>> Stashed changes
