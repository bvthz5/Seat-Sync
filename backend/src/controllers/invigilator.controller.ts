import { Request, Response } from "express";
import { User, Invigilator, Faculty, Department, InvigilatorAssignment, Exam } from "../models/index.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";

/**
 * Invigilator Controller
 */

export const getAllInvigilators = async (req: Request, res: Response) => {
    try {
        // Fetch all faculties with their departments
        const faculties = await Faculty.findAll({
            include: [
                {
                    model: Department,
                    attributes: ["DepartmentID", "DepartmentCode", "DepartmentName"],
                }
            ]
        });

        const today = new Date().toISOString().split('T')[0];

        // Fetch all assignments to calculate total exams count and on-duty status
        const allAssignments = await InvigilatorAssignment.findAll({
            include: [{
                model: Exam,
                attributes: ["ExamID", "ExamDate"]
            }]
        });

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
        console.error("Error fetching invigilators:", error);
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
        const { FullName, Email, Password, Designation, DepartmentID } = req.body;

        if (!FullName || !Email || !Password) {
            return res.status(400).json({ message: "FullName, Email, and Password are required" });
        }

        // 1. Create User
        const passwordHash = await bcrypt.hash(Password, 10);
        const user = await User.create({
            Email,
            FullName,
            PasswordHash: passwordHash,
            Role: "invigilator",
            IsActive: true
        });

        // 2. Create Invigilator
        const invigilator = await Invigilator.create({
            UserID: user.UserID
        });

        // 3. Optional: If DepartmentID is provided, find or create Faculty record?
        // For now, let's just keep it simple.

        res.status(201).json({
            message: "Invigilator created successfully",
            invigilator: {
                ...invigilator.toJSON(),
                User: {
                    UserID: user.UserID,
                    Email: user.Email,
                    FullName: user.FullName,
                    Role: user.Role
                }
            }
        });
    } catch (error: any) {
        console.error("Error creating invigilator:", error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteInvigilator = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const invigilator = await Invigilator.findByPk(id as string);

        if (!invigilator) {
            return res.status(404).json({ message: "Invigilator not found" });
        }

        const userId = invigilator.UserID;

        // Delete Invigilator record
        await invigilator.destroy();

        // Optionally delete User or just change role?
        // Let's delete for now as per "Invigilator Management" context
        await User.destroy({ where: { UserID: userId } });

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
        const onDutyAssignments = await InvigilatorAssignment.findAll({
            include: [{
                model: Exam,
                where: {
                    ExamDate: today
                }
            }]
        });
        const onDuty = new Set(onDutyAssignments.map(a => a.InvigilatorID)).size;

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
