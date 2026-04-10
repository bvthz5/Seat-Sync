import { Request, Response } from "express";
import { User, Invigilator, Faculty, InvigilatorAssignment, Exam, UserProfile } from "../models/index.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sequelize } from "../config/database.js";
import { emailService } from "../services/email.service.js";
import { validateInvigilatorRequest } from "../utils/invigilator-request.validation.js";

const ACTIVATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const createActivationToken = () => ({
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
});

const isActivationTokenExpired = (expiresAt: Date | null | undefined) => {
    if (!expiresAt) return true;
    return new Date(expiresAt).getTime() <= Date.now();
};

/**
 * Invigilator Controller
 */

export const getAllInvigilators = async (req: Request, res: Response) => {
    try {
        // Fetch all faculties
        const faculties = await Faculty.findAll();
        console.log("Fetched Faculties count:", faculties.length);
        if (faculties.length > 0) {
            console.log("Sample Faculty:", faculties[0]?.toJSON());
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
    const t = await sequelize.transaction();
    try {
        const { FacultyID, Name, Email, Phone, Department, Designation } = req.body;

        if (!FacultyID || !Email || !Name || !Department) {
            await t.rollback();
            return res.status(400).json({ message: "Faculty ID, Name, Email, and Department are required" });
        }

        const emailStr = String(Email).trim().toLowerCase();
        
        // 1. Check duplicate User
        const existingUser = await User.findOne({ where: { Email: emailStr }, transaction: t });
        if (existingUser) {
            await t.rollback();
            return res.status(409).json({ message: `Email ${emailStr} is already registered` });
        }

        // 2. Create User
        const { token: activationToken, expiresAt: activationExpiresAt } = createActivationToken();
        const dummyPassword = await bcrypt.hash(crypto.randomBytes(8).toString('hex'), 10);

        const newUser = await User.create({
            Email: emailStr,
            PasswordHash: dummyPassword,
            Role: "invigilator",
            IsActive: true,
            IsActivated: false,
            ActivationToken: activationToken,
            ActivationExpiresAt: activationExpiresAt
        }, { transaction: t });

        // 3. Create UserProfile
        await UserProfile.create({
            UserID: newUser.UserID,
            FullName: Name,
            Phone: Phone || null
        }, { transaction: t });

        // 4. Create Faculty for legacy assignments
        const faculty = await Faculty.create({
            StaffCode: String(FacultyID).trim(), 
            Name: Name,
            Designation: Designation || "Faculty",
            Department: Department,
            IsEligible: true,
        }, { transaction: t });

        // 5. Create actual Invigilator binding
        await Invigilator.create({
            UserID: newUser.UserID,
            IsEligible: true,
            IsFlagged: false
        }, { transaction: t });

        await t.commit();

        // 6. Send Activation Email securely
        emailService.sendInvigilatorActivationEmail(emailStr, Name, activationToken).catch(err => {
            console.error("Failed sending activation email to", emailStr, err.message);
        });

        res.status(201).json({
            message: "Invigilator created and activation email sent successfully",
            faculty: faculty.toJSON(),
        });
    } catch (error: any) {
        await t.rollback();
        console.error("Error creating invigilator:", error);
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
            const { FacultyID, Name, Email, Department: deptValue, Phone, Designation } = row;

            try {
                const facIdStr = FacultyID ? String(FacultyID).trim() : "";
                const nameStr = Name ? String(Name).trim() : "";
                const emailStr = Email ? String(Email).trim().toLowerCase() : "";
                const deptStr = deptValue ? String(deptValue).trim() : "";
                const phoneStr = Phone ? String(Phone).trim() : null;
                const desigStr = Designation ? String(Designation).trim() : "Faculty";

                if (!facIdStr || !nameStr || !emailStr || !deptStr) {
                    skipped.push({ row: i + 2, reason: `Missing required fields (FacultyID, Name, Email, or Department)` });
                    continue;
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailStr)) {
                    skipped.push({ row: i + 2, reason: `Invalid email format: ${emailStr}` });
                    continue;
                }

                // Check duplicate
                const existing = await User.findOne({ where: { Email: emailStr }, transaction: t });
                if (existing) {
                    skipped.push({ row: i + 2, reason: `Email ${emailStr} already exists` });
                    continue;
                }

                // Create User
                const { token: activationToken, expiresAt: activationExpiresAt } = createActivationToken();
                const dummyPassword = await bcrypt.hash(crypto.randomBytes(8).toString('hex'), 10);

                const newUser = await User.create({
                    Email: emailStr,
                    PasswordHash: dummyPassword,
                    Role: "invigilator",
                    IsActive: true,
                    IsActivated: false,
                    ActivationToken: activationToken,
                    ActivationExpiresAt: activationExpiresAt
                }, { transaction: t });

                await UserProfile.create({
                    UserID: newUser.UserID,
                    FullName: nameStr,
                    Phone: phoneStr || null
                }, { transaction: t });

                await Faculty.create({
                    StaffCode: facIdStr,
                    Name: nameStr,
                    Designation: desigStr,
                    Department: deptStr,
                    IsEligible: true,
                }, { transaction: t });

                await Invigilator.create({
                    UserID: newUser.UserID,
                    IsEligible: true,
                    IsFlagged: false
                }, { transaction: t });

                created.push(i + 2);
                
                // Fire and forget email queue
                emailService.sendInvigilatorActivationEmail(emailStr, nameStr, activationToken).catch(err => {
                    console.error("Failed to send bulk email to", emailStr, err.message);
                });

            } catch (rowError: any) {
                console.error(`Row ${i + 2} failed:`, rowError);
                skipped.push({ row: i + 2, reason: `Error: ${rowError.message}` });
            }
        }

        await t.commit();
        res.status(201).json({
            message: `Import complete: ${created.length} created, ${skipped.length} skipped.`,
            successCount: created.length,
            failedRows: skipped.length,
            duplicateEntries: skipped.filter(s => s.reason.includes('already exists')).length,
            created,
            skipped,
        });
    } catch (error: any) {
        await t.rollback();
        console.error("Error bulk importing invigilators:", error);
        const message = error.errors ? error.errors.map((e: any) => e.message).join(", ") : error.message;
        res.status(500).json({ message: "Internal server error", detail: message });
    }
};

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

export const verifyInvigilatorActivationToken = async (req: Request, res: Response) => {
    try {
        const token = String(req.query.token || '').trim();

        if (!token) {
            return res.status(400).json({ valid: false, message: "Activation token is required" });
        }

        const user = await User.findOne({
            where: {
                ActivationToken: token,
                Role: "invigilator",
                IsActivated: false,
            },
        });

        if (!user) {
            return res.status(200).json({ valid: false, message: "Invalid activation link" });
        }

        if (isActivationTokenExpired(user.ActivationExpiresAt)) {
            return res.status(200).json({ valid: false, message: "Activation link has expired" });
        }

        return res.status(200).json({ valid: true, message: "Activation link is valid" });
    } catch (error: any) {
        console.error("Error verifying activation token:", error);
        res.status(500).json({ valid: false, message: "Internal server error" });
    }
};

export const activateInvigilator = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            await t.rollback();
            return res.status(400).json({ message: "Token and password are required" });
        }

        const user = await User.findOne({ 
            where: { 
                ActivationToken: token,
                Role: "invigilator",
                IsActivated: false
            },
            transaction: t 
        });

        if (!user) {
            await t.rollback();
            return res.status(400).json({ message: "Invalid or already used activation token" });
        }

        if (isActivationTokenExpired(user.ActivationExpiresAt)) {
            await t.rollback();
            return res.status(400).json({ message: "Activation link has expired. Please request a new one." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        user.PasswordHash = hashedPassword;
        user.IsActivated = true;
        user.ActivationToken = null;
        user.ActivationExpiresAt = null;
        user.IsPasswordChanged = true;
        
        await user.save({ transaction: t });

        await t.commit();
        res.status(200).json({ message: "Account activated successfully. You can now login." });
    } catch (error: any) {
        await t.rollback();
        console.error("Error activating invigilator:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const resendInvigilatorActivationLink = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { email } = req.body;
        const emailStr = String(email || '').trim().toLowerCase();

        if (!emailStr) {
            await t.rollback();
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({
            where: {
                Email: emailStr,
                Role: "invigilator",
                IsActivated: false,
            },
            transaction: t,
        });

        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: "No pending invigilator account found for this email" });
        }

        const { token, expiresAt } = createActivationToken();
        user.ActivationToken = token;
        user.ActivationExpiresAt = expiresAt;
        await user.save({ transaction: t });

        const profile = await UserProfile.findOne({ where: { UserID: user.UserID }, transaction: t });
        const name = profile?.FullName || user.FullName || "Invigilator";

        await t.commit();

        emailService.sendInvigilatorActivationEmail(emailStr, name, token).catch(err => {
            console.error("Failed resending activation email to", emailStr, err.message);
        });

        return res.json({ message: "A fresh activation link has been sent to your email" });
    } catch (error: any) {
        await t.rollback();
        console.error("Error resending activation link:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const requestInvigilatorAccess = async (req: Request, res: Response) => {
    try {
        const { FacultyID, Name, Email, Phone, Department, Designation, Reason } = req.body;
        
        // Run comprehensive validation on all fields
        const validation = validateInvigilatorRequest({
            FacultyID,
            Name,
            Email,
            Phone,
            Department,
            Designation,
            Reason
        });

        // If validation failed, return all errors
        if (!validation.isValid) {
            res.status(400).json({ 
                error: "Validation failed",
                validationErrors: validation.errors 
            });
            return;
        }

        const { InvigilatorRequest } = await import("../models/index.js");

        // Check for duplicate Faculty ID in pending/approved requests
        const existingRequest = await InvigilatorRequest.findOne({
            where: { 
                FacultyID: FacultyID.trim().toUpperCase(),
                Status: { [Op.in]: ["PENDING", "APPROVED"] }
            }
        });

        if (existingRequest) {
            res.status(400).json({ 
                error: "Validation failed",
                validationErrors: { 
                    FacultyID: "This Faculty ID already has an active or pending request" 
                } 
            });
            return;
        }

        // Check for duplicate email in pending/approved requests
        const existingEmail = await InvigilatorRequest.findOne({
            where: { 
                Email: Email.toLowerCase(),
                Status: { [Op.in]: ["PENDING", "APPROVED"] }
            }
        });

        if (existingEmail) {
            res.status(400).json({ 
                error: "Validation failed",
                validationErrors: { 
                    Email: "This email already has an active or pending request" 
                } 
            });
            return;
        }

        await InvigilatorRequest.create({
            FacultyID: FacultyID.trim().toUpperCase(),
            Name: Name.trim(),
            Email: Email.toLowerCase(),
            Phone: Phone ? Phone.trim() : null,
            Department,
            Designation: Designation ? Designation.trim() : null,
            Reason: Reason ? Reason.trim() : null,
            Status: "PENDING"
        });

        res.status(201).json({ message: "Request submitted successfully. Waiting for admin approval." });
    } catch (error: any) {
        console.error("Error in access request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getInvigilatorRequests = async (req: Request, res: Response) => {
    try {
        const { InvigilatorRequest } = await import("../models/index.js");
        const requests = await InvigilatorRequest.findAll({
            order: [['RequestedAt', 'DESC']]
        });
        res.json(requests);
    } catch (error: any) {
        console.error("Error fetching requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const approveInvigilatorRequest = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { InvigilatorRequest } = await import("../models/index.js");
        
        const request = await InvigilatorRequest.findByPk(id as string, { transaction: t });
        if (!request || request.Status !== "PENDING") {
            await t.rollback();
            return res.status(404).json({ message: "Valid pending request not found" });
        }

        const emailStr = request.Email.toLowerCase();
        const existingUser = await User.findOne({ where: { Email: emailStr }, transaction: t });
        if (existingUser) {
            await t.rollback();
            return res.status(409).json({ message: "A user with this email already exists" });
        }

        const { token: activationToken, expiresAt: activationExpiresAt } = createActivationToken();
        const dummyPassword = await bcrypt.hash(crypto.randomBytes(8).toString('hex'), 10);

        const newUser = await User.create({
            Email: emailStr,
            PasswordHash: dummyPassword,
            Role: "invigilator",
            IsActive: true,
            IsActivated: false,
            ActivationToken: activationToken,
            ActivationExpiresAt: activationExpiresAt
        }, { transaction: t });

        await UserProfile.create({
            UserID: newUser.UserID,
            FullName: request.Name,
            Phone: request.Phone || null
        }, { transaction: t });

        await Faculty.create({
            StaffCode: request.FacultyID,
            Name: request.Name,
            Designation: request.Designation || "Faculty",
            Department: request.Department,
            IsEligible: true,
        }, { transaction: t });

        await Invigilator.create({
            UserID: newUser.UserID,
            IsEligible: true,
            IsFlagged: false
        }, { transaction: t });

        request.Status = "APPROVED";
        request.ReviewedBy = (req as any).user?.UserID || null;
        request.ReviewedAt = new Date();
        await request.save({ transaction: t });

        await t.commit();

        emailService.sendInvigilatorActivationEmail(emailStr, request.Name, activationToken).catch(err => {
            console.error("Failed sending approval email to", emailStr, err.message);
        });

        res.json({ message: "Request approved successfully. Activation email sent." });
    } catch (error: any) {
        await t.rollback();
        console.error("Error approving request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const rejectInvigilatorRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { InvigilatorRequest } = await import("../models/index.js");
        
        const request = await InvigilatorRequest.findByPk(id as string);
        if (!request || request.Status !== "PENDING") {
            return res.status(404).json({ message: "Valid pending request not found" });
        }

        request.Status = "REJECTED";
        request.ReviewedBy = (req as any).user?.UserID || null;
        request.ReviewedAt = new Date();
        await request.save();

        res.json({ message: "Request rejected successfully." });
    } catch (error: any) {
        console.error("Error rejecting request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
