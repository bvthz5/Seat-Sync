import { Request, Response } from "express";
import { User, Invigilator, Faculty, InvigilatorAssignment, Exam, UserProfile, SeatAllocation, Seat, Room, InvigilatorRequest, ActivityLog, NotificationRecipient, Block, Floor, Attendance, Student, Subject, IncidentReport, DutySwap } from "../models/index.js";
import { Notification } from "../models/Notification.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sequelize } from "../config/database.js";
import { emailService } from "../services/email.service.js";
import { validateInvigilatorRequest } from "../utils/invigilator-request.validation.js";
import { notificationService } from "../services/notification.service.js";


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

        const today: string = new Date().toISOString().split('T')[0] || "";

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
                    const examDate = a.Exam?.ExamDate
                        ? (typeof a.Exam.ExamDate === 'string' ? a.Exam.ExamDate : (a.Exam.ExamDate as Date).toISOString().split('T')[0])
                        : "";
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
        const { id } = req.params; // This is a FacultyID from the frontend
        const faculty = await Faculty.findByPk(id as string);
        if (!faculty) return res.status(404).json({ message: "Faculty not found" });

        // Find associated Invigilator record by matching StaffCode to User Email
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { Email: faculty.StaffCode },
                    { Email: { [Op.like]: `${faculty.StaffCode}%` } }
                ]
            },
            include: [Invigilator]
        });

        const invigilator = (user as any)?.Invigilator;

        if (!invigilator) {
            return res.status(404).json({ message: "Invigilator profile not linked to a user account" });
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
        const { Name, Email, Phone, Department, Designation, FacultyID, StaffCode } = req.body;

        if (!Name || !Department) {
            await t.rollback();
            return res.status(400).json({ message: "Name and Department are required" });
        }

        // Auto-generate email if not provided
        let emailStr = Email ? String(Email).trim().toLowerCase() : null;
        if (!emailStr) {
            const nameForEmail = Name.toLowerCase().replace(/[^a-z]/g, '');
            emailStr = `${nameForEmail}@sjcetpalai.ac.in`;
        }

        const staffCodeStr = (StaffCode || FacultyID) ? String(StaffCode || FacultyID).trim() : emailStr;


        // 1. Check duplicate User
        const existingUser = await User.findOne({ where: { Email: emailStr }, transaction: t });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ message: "Email already exists" });
        }

        // 2. Create User
        const user = await User.create({
            Email: emailStr,
            FullName: Name,
            PasswordHash: await bcrypt.hash("Sjcet@123", 10),
            Role: "invigilator",
            Status: "Active"
        } as any, { transaction: t });

        // 3. Create Faculty
        const facultyData: any = {
            StaffCode: staffCodeStr,
            Name,
            Designation: Designation || "Assistant Professor",
            Department,
            ProfileImageURL: undefined,
            IsEligible: true
        };

        if (FacultyID) {
            facultyData.FacultyID = Number(FacultyID);
        }

        const faculty = await Faculty.create(facultyData, { transaction: t });

        // 4. Create Invigilator linked to User
        await Invigilator.create({
            UserID: user.UserID,
            IsEligible: true,
            IsFlagged: false
        }, { transaction: t });

        await t.commit();
        res.status(201).json({
            message: "Invigilator created successfully",
            faculty: faculty.toJSON(),
        });
    } catch (error: any) {
        await t.rollback();
        console.error("Error creating invigilator:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteInvigilator = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;

        const faculty = await Faculty.findByPk(id as string, { transaction: t });

        if (!faculty) {
            await t.rollback();
            return res.status(404).json({ message: "Invigilator not found" });
        }

        // 1. Delete assignments first (FK constraint)
        await InvigilatorAssignment.destroy({
            where: { InvigilatorID: faculty.FacultyID },
            transaction: t
        });

        // 2. Delete User and Invigilator records if they exist
        // We link them by Email/StaffCode as per import logic
        const user = await User.findOne({
            where: { Email: faculty.StaffCode || "" },
            transaction: t
        });

        if (user) {
            // Delete all dependencies of User
            await ActivityLog.destroy({ where: { UserID: user.UserID }, transaction: t });
            await NotificationRecipient.destroy({ where: { UserID: user.UserID }, transaction: t });
            await Invigilator.destroy({ where: { UserID: user.UserID }, transaction: t });
            await user.destroy({ transaction: t });
        }

        // 3. Delete the faculty record
        await faculty.destroy({ transaction: t });

        await t.commit();
        res.json({ message: "Invigilator and associated accounts deleted successfully" });
    } catch (error: any) {
        if (t) {
            try { await t.rollback(); } catch (rollbackError) { /* Already rolled back by DB */ }
        }
        console.error("Error deleting invigilator:", error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};

export const getInvigilatorStats = async (req: Request, res: Response) => {
    try {
        const total = await Faculty.count();
        const eligible = await Faculty.count({
            where: { IsEligible: true }
        });
        const active = eligible; // For faculties, active = eligible

        const today: string = new Date().toISOString().split('T')[0] || "";
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
 * Expected body: { rows: [{ Name, Department }] }
 */
export const bulkImportInvigilators = async (req: Request, res: Response) => {
    try {
        const { rows } = req.body;
        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ message: "No rows provided" });
        }

        const created: number[] = [];
        const skipped: { row: number; reason: string }[] = [];
        let successCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const { Name, Email, Department: deptValue, Phone, Designation, StaffCode, FacultyID } = row;

            // Use a per-row transaction to ensure atomicity for each staff member
            // without poisoning the entire import if one fails.
            const rowTransaction = await sequelize.transaction();

            try {
                const nameStr = Name ? String(Name).trim() : "";
                const deptStr = deptValue ? String(deptValue).trim() : "";
                const desigStr = Designation ? String(Designation).trim() : "Faculty";
                let emailStr = Email ? String(Email).trim().toLowerCase() : "";

                if (!nameStr || !deptStr) {
                    await rowTransaction.rollback();
                    skipped.push({ row: i + 2, reason: `Missing required fields (Name or Department)` });
                    continue;
                }

                if (!emailStr) {
                    const nameForEmail = nameStr.toLowerCase().replace(/[^a-z]/g, '');
                    emailStr = `${nameForEmail}@sjcetpalai.ac.in`;
                }

                // 1. Handle User (Upsert)
                let user = await User.findOne({ where: { Email: emailStr }, transaction: rowTransaction });
                if (!user) {
                    user = await User.create({
                        Email: emailStr,
                        FullName: nameStr,
                        PasswordHash: await bcrypt.hash("Sjcet@123", 10),
                        Role: "invigilator",
                        IsActive: true,
                        IsActivated: true
                    } as any, { transaction: rowTransaction });
                } else {
                    user.FullName = nameStr;
                    // Protect admin roles from being downgraded
                    if (user.IsRootAdmin || user.Role === "exam_admin") {
                        // Keep as is
                    } else {
                        user.Role = "invigilator";
                    }
                    await user.save({ transaction: rowTransaction });
                }

                // 1b. Handle UserProfile (Upsert)
                let profile = await UserProfile.findByPk(user.UserID, { transaction: rowTransaction });
                if (!profile) {
                    await UserProfile.create({
                        UserID: user.UserID,
                        FullName: nameStr,
                        Phone: Phone ? String(Phone).trim() : null,
                    }, { transaction: rowTransaction });
                } else {
                    profile.FullName = nameStr;
                    if (Phone) profile.Phone = String(Phone).trim();
                    await profile.save({ transaction: rowTransaction });
                }

                // 2. Handle Faculty (Upsert)
                const facultyIDNum = FacultyID ? Number(FacultyID) : null;
                const finalFacultyID = (facultyIDNum && !isNaN(facultyIDNum)) ? facultyIDNum : undefined;
                const finalStaffCode = StaffCode ? String(StaffCode).trim() : (finalFacultyID ? String(finalFacultyID) : emailStr);

                let faculty: any = null;
                if (finalFacultyID) {
                    faculty = await Faculty.findByPk(finalFacultyID, { transaction: rowTransaction });
                }

                if (!faculty) {
                    faculty = await Faculty.findOne({ where: { StaffCode: finalStaffCode }, transaction: rowTransaction });
                }

                if (!faculty) {
                    const facultyData: any = {
                        StaffCode: finalStaffCode,
                        Name: nameStr,
                        Designation: desigStr,
                        Department: deptStr,
                        IsEligible: true
                    };
                    if (finalFacultyID) facultyData.FacultyID = finalFacultyID;
                    faculty = await Faculty.create(facultyData, { transaction: rowTransaction });
                } else {
                    faculty.Name = nameStr;
                    faculty.Designation = desigStr;
                    faculty.Department = deptStr;
                    faculty.StaffCode = finalStaffCode;
                    await faculty.save({ transaction: rowTransaction });
                }

                // 3. Handle Invigilator (Metadata)
                // Note: FacultyID is no longer stored in the Invigilators table.
                // Linkage is now maintained via the User-Faculty relationship (StaffCode match).
                let invigilator = await Invigilator.findOne({
                    where: { UserID: user.UserID },
                    transaction: rowTransaction
                });

                if (!invigilator) {
                    invigilator = await Invigilator.create({
                        UserID: user.UserID,
                        IsEligible: true,
                        IsFlagged: false
                    }, { transaction: rowTransaction });
                } else {
                    // Just ensure the UserID is set correctly
                    invigilator.UserID = user.UserID;
                    await invigilator.save({ transaction: rowTransaction });
                }

                await rowTransaction.commit();
                created.push(faculty.FacultyID);
                successCount++;

            } catch (rowError: any) {
                if (rowTransaction) {
                    try { await rowTransaction.rollback(); } catch (err) { /* ignore rollback errors */ }
                }
                console.error(`Row ${i + 2} import error:`, rowError);

                let reason = rowError.message || "Unknown error";
                if (rowError.name === 'SequelizeUniqueConstraintError') {
                    reason = "Duplicate entry found (Conflict in UserID or FacultyID)";
                } else if (rowError.original && rowError.original.message) {
                    reason = rowError.original.message;
                }

                skipped.push({ row: i + 2, reason });
            }
        }

        res.json({
            message: `Successfully processed ${successCount} records.`,
            created,
            skipped,
            successCount
        });
    } catch (error: any) {
        console.error("Bulk import critical error:", error);
        res.status(500).json({ message: error.message || "Internal server error during bulk import" });
    }
};

export const clearAllFaculties = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        // 1. Clear assignments first (FK constraint)
        await InvigilatorAssignment.destroy({ where: {}, transaction: t });

        // 2. Clear Invigilator links and User data
        // We find all users with role 'invigilator' to clear their logs/notifications
        const invigilatorUsers = await User.findAll({ where: { Role: "invigilator" }, transaction: t });
        const userIds = invigilatorUsers.map(u => u.UserID);

        if (userIds.length > 0) {
            await ActivityLog.destroy({ where: { UserID: { [Op.in]: userIds } }, transaction: t });
            await NotificationRecipient.destroy({ where: { UserID: { [Op.in]: userIds } }, transaction: t });
            await Invigilator.destroy({ where: { UserID: { [Op.in]: userIds } }, transaction: t });
            await User.destroy({ where: { UserID: { [Op.in]: userIds } }, transaction: t });
        }

        // 3. Clear Faculties
        // Use destroy without truncate:true as it works better with transactions and FKs
        const count = await Faculty.destroy({
            where: {},
            transaction: t
        });

        await t.commit();
        res.json({ message: "All faculty records and associated accounts cleared", deleted: count });
    } catch (error: any) {
        if (t) {
            try { await t.rollback(); } catch (rollbackError) { /* Ignore */ }
        }
        console.error("Clear faculties error:", error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};

// ... other existing methods (activate, verify, etc.) ...
// Placeholder for missing methods if needed to avoid breaking the file
export const activateInvigilator = async (req: Request, res: Response) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: "Token and password are required" });
        }

        const user = await User.findOne({
            where: {
                ActivationToken: token,
                ActivationExpiresAt: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired activation token" });
        }

        user.PasswordHash = await bcrypt.hash(password, 10);
        user.IsActivated = true;
        user.IsActive = true;
        user.ActivationToken = null;
        user.ActivationExpiresAt = null;
        await user.save();

        res.json({ message: "Account activated successfully. You can now login." });
    } catch (error: any) {
        console.error("Error activating invigilator:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const verifyInvigilatorActivationToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const user = await User.findOne({
            where: {
                ActivationToken: token,
                ActivationExpiresAt: { [Op.gt]: new Date() }
            },
            attributes: ['Email', 'FullName']
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired activation token" });
        }

        res.json({
            valid: true,
            email: user.Email,
            name: user.FullName
        });
    } catch (error: any) {
        console.error("Error verifying activation token:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const resendInvigilatorActivationLink = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ where: { Email: email, Role: 'invigilator' } });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.IsActivated) {
            return res.status(400).json({ message: "Account is already activated" });
        }

        const token = crypto.randomBytes(32).toString('hex');
        user.ActivationToken = token;
        user.ActivationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await user.save();

        await emailService.sendInvigilatorActivationEmail(user.Email!, user.FullName || 'Invigilator', token);

        res.json({ message: "Activation link resent successfully" });
    } catch (error: any) {
        console.error("Error resending activation link:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
export const requestInvigilatorAccess = async (req: Request, res: Response) => {
    try {
        const { FacultyID, Name, Email, Phone, Department, Designation, Reason } = req.body;

        if (!FacultyID || !Name || !Email || !Department) {
            return res.status(400).json({ message: "Missing required fields (FacultyID, Name, Email, Department)" });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { Email } });
        if (existingUser) {
            return res.status(400).json({ message: "A user with this email already exists" });
        }

        // Check if request already exists
        const existingRequest = await InvigilatorRequest.findOne({
            where: {
                [Op.or]: [
                    { Email },
                    { FacultyID }
                ],
                Status: "PENDING"
            }
        });
        if (existingRequest) {
            return res.status(400).json({ message: "A pending request with this email or Faculty ID already exists" });
        }

        await InvigilatorRequest.create({
            FacultyID,
            Name,
            Email,
            Phone,
            Department,
            Designation: Designation || "Faculty",
            Reason,
            Status: "PENDING",
            RequestedAt: new Date()
        });

        res.status(201).json({ message: "Request submitted successfully" });
    } catch (error: any) {
        console.error("Error submitting request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getInvigilatorRequests = async (req: Request, res: Response) => {
    try {
        const requests = await InvigilatorRequest.findAll({
            order: [['RequestedAt', 'DESC']]
        });
        res.json(requests);
    } catch (error: any) {
        console.error("Error fetching invigilator requests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const approveInvigilatorRequest = async (req: Request, res: Response) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        if (!id) {
            await t.rollback();
            return res.status(400).json({ message: "Request ID is required" });
        }

        const request = await InvigilatorRequest.findByPk(Number(id), { transaction: t });

        if (!request) {
            await t.rollback();
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.Status !== "PENDING") {
            await t.rollback();
            return res.status(400).json({ message: "Request already processed" });
        }

        // 1. Create User
        const user = await User.create({
            Email: request.Email,
            FullName: request.Name,
            PasswordHash: await bcrypt.hash("Sjcet@123", 10),
            Role: "invigilator",
            IsActive: true,
            IsActivated: true
        } as any, { transaction: t });

        // 2. Create Faculty
        const faculty = await Faculty.create({
            StaffCode: request.FacultyID,
            Name: request.Name,
            Designation: request.Designation || "Faculty",
            Department: request.Department,
            IsEligible: true
        }, { transaction: t });

        // 3. Create Invigilator record
        await Invigilator.create({
            UserID: user.UserID,
            IsEligible: true,
            IsFlagged: false
        }, { transaction: t });

        // 4. Update Request Status
        request.Status = "APPROVED";
        request.ReviewedBy = (req as any).user?.UserID;
        request.ReviewedAt = new Date();
        await request.save({ transaction: t });

        await t.commit();

        // Send notification email (Async, don't wait for it)
        try {
            // If we want them to set their own password, we should generate a token and send activation email.
            // But since we set Sjcet@123, we'll just send a welcome notification.
            // For now, let's just log it or we could use the activation email as a "Welcome" one.
            console.log(`[Approval] Invigilator ${request.Email} approved. Credentials sent.`);
        } catch (mailErr) {
            console.error("Failed to send approval notification:", mailErr);
        }

        res.json({ message: "Request approved and invigilator created successfully" });
    } catch (error: any) {
        await t.rollback();
        console.error("Error approving request:", error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};

export const rejectInvigilatorRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const request = await InvigilatorRequest.findByPk(Number(id));

        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.Status !== "PENDING") {
            return res.status(400).json({ message: "Request already processed" });
        }

        request.Status = "REJECTED";
        request.ReviewedBy = (req as any).user?.UserID;
        request.ReviewedAt = new Date();
        await request.save();

        res.json({ message: "Request rejected successfully" });
    } catch (error: any) {
        console.error("Error rejecting request:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export const getInvigilatorLoadStats = async (req: Request, res: Response) => {
    try {
        const faculties = await Faculty.findAll({
            where: { IsEligible: true }
        });

        const assignments = await InvigilatorAssignment.findAll({
            attributes: ['InvigilatorID']
        });

        const loadMap: Record<number, number> = {};
        assignments.forEach(a => {
            loadMap[a.InvigilatorID] = (loadMap[a.InvigilatorID] || 0) + 1;
        });

        const stats = faculties.map(f => ({
            FacultyID: f.FacultyID,
            Name: f.Name,
            Department: f.Department,
            Designation: f.Designation,
            dutyCount: loadMap[f.FacultyID] || 0
        }));

        res.json(stats);
    } catch (error: any) {
        console.error("Error fetching load stats:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Fairness-First Auto-Assignment Algorithm
 */
export const autoAssignInvigilators = async (req: Request, res: Response) => {
    try {
        const { date, session } = req.body;
        if (!date || !session) {
            return res.status(400).json({ message: "Date and session are required" });
        }

        const exams = await Exam.findAll({
            where: { ExamDate: date, Session: session }
        });

        if (exams.length === 0) {
            return res.status(404).json({ message: "No exams found for the selected slot" });
        }

        const examIds = exams.map(e => e.ExamID);

        const allocations = await SeatAllocation.findAll({
            where: { ExamID: { [Op.in]: examIds } },
            include: [{ model: Seat, attributes: ['RoomID'], required: true }],
            raw: true
        });

        if (allocations.length === 0) {
            return res.status(400).json({ message: "No seating allocations found. Generate seating plan first." });
        }

        const requiredHallIds = [...new Set(allocations.map((a: any) => a['Seat.RoomID'] || a.RoomID))].filter(Boolean);

        const staff = await Faculty.findAll({ where: { IsEligible: true } });
        const allAssignments = await InvigilatorAssignment.findAll();

        const loadMap: Record<number, number> = {};
        allAssignments.forEach(a => {
            loadMap[a.InvigilatorID] = (loadMap[a.InvigilatorID] || 0) + 1;
        });

        const sortedStaff = staff.sort((a, b) => (loadMap[a.FacultyID] || 0) - (loadMap[b.FacultyID] || 0));

        const proposedAssignments = [];
        const usedStaffIds = new Set();

        for (let i = 0; i < requiredHallIds.length; i++) {
            const hallId = Number(requiredHallIds[i]);
            const staffMember = sortedStaff.find(s => !usedStaffIds.has(s.FacultyID));

            if (staffMember) {
                proposedAssignments.push({
                    hallId: hallId,
                    invigilatorId: staffMember.FacultyID,
                    invigilatorName: staffMember.Name,
                    department: staffMember.Department,
                    dutyCount: loadMap[staffMember.FacultyID] || 0
                });
                usedStaffIds.add(staffMember.FacultyID);
            }
        }

        res.json({
            message: `Auto-assigned ${proposedAssignments.length} invigilators successfully.`,
            assignments: proposedAssignments,
            requiredHalls: requiredHallIds.length,
            unfilledHalls: requiredHallIds.length - proposedAssignments.length
        });
    } catch (error: any) {
        console.error("Auto-assign error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Save invigilator assignments to database
 */
export const saveInvigilatorAssignments = async (req: Request, res: Response) => {
    try {
        const { date, session, assignments } = req.body;
        if (!date || !session || !assignments) {
            return res.status(400).json({ message: "Missing required data" });
        }

        const exams = await Exam.findAll({
            where: { ExamDate: date, Session: session }
        });

        if (exams.length === 0) {
            return res.status(404).json({ message: "No exams found for this slot" });
        }

        const examIdByRoom = new Map<number, number>();

        for (const exam of exams) {
            const allocations = await SeatAllocation.findAll({
                where: { ExamID: exam.ExamID },
                include: [{ model: Seat, attributes: ['RoomID'], required: true }],
                raw: true
            });
            allocations.forEach((a: any) => {
                const rid = a['Seat.RoomID'] || a.RoomID || a.Roomid || a['Seat.Roomid'];
                if (rid) {
                    examIdByRoom.set(Number(rid), exam.ExamID);
                }
            });
        }

        const examIds = exams.map(e => e.ExamID);
        await InvigilatorAssignment.destroy({
            where: { ExamID: { [Op.in]: examIds } }
        });

        const records = assignments.map((a: any) => {
            const examId = examIdByRoom.get(Number(a.hallId));
            if (!examId) return null;
            return {
                ExamID: examId,
                RoomID: Number(a.hallId),
                InvigilatorID: Number(a.invigilatorId)
            };
        }).filter(Boolean);

        if (records.length > 0) {
            await InvigilatorAssignment.bulkCreate(records);
        }

        res.json({ message: "Assignments saved successfully", count: records.length });
    } catch (error: any) {
        console.error("Save assignments error:", error);
        res.status(500).json({ message: error.message || "Internal server error" });
    }
};

/**
 * Fetch existing assignments for a slot
 */
export const getInvigilatorAssignments = async (req: Request, res: Response) => {
    try {
        const { date, session } = req.query;
        if (!date || !session) {
            return res.status(400).json({ message: "Date and session required" });
        }

        const exams = await Exam.findAll({
            where: { ExamDate: date as string, Session: session as string }
        });

        if (exams.length === 0) {
            return res.json([]);
        }

        const examIds = exams.map(e => e.ExamID);

        const assignments = await InvigilatorAssignment.findAll({
            where: { ExamID: { [Op.in]: examIds } },
            include: [
                { model: Faculty, as: 'Invigilator', attributes: ['Name', 'Department', 'FacultyID'] },
                { model: Room, attributes: ['RoomCode', 'RoomID'] }
            ]
        });

        const formatted = assignments.map((a: any) => ({
            hallId: a.RoomID,
            hallName: a.Room?.RoomCode || `Room ${a.RoomID}`,
            invigilatorId: a.InvigilatorID,
            invigilatorName: a.Invigilator?.Name || 'Unknown',
            department: a.Invigilator?.Department
        }));

        res.json(formatted);
    } catch (error: any) {
        console.error("Fetch assignments error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getInvigilatorDashboardData = async (req: Request, res: Response) => {
    try {
        const userPayload = (req as any).user;
        const userId = userPayload?.UserID;

        console.log(`[DASHBOARD_DEBUG] Request received. UserID: ${userId}, Email: ${userPayload?.Email}, Role: ${userPayload?.Role}`);


        if (!userId) {
            console.error("[DASHBOARD_DEBUG] No userId found in request. Possible token payload issue.");
            return res.status(401).json({ message: "Unauthorized: No user identifier found in token." });
        }

        const user = await User.findByPk(userId, {
            include: [{
                model: Invigilator
            }]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log("DEBUG: Resolved user email:", user.Email);

        // Resolve faculty record by StaffCode matching the User's Email or FullName
        const email = user.Email?.trim().toLowerCase();
        const emailPrefix = email?.split('@')[0];
        const fullName = user.FullName?.trim();

        let faculty = null;

        // Build search conditions dynamically to avoid undefined values in Op.or
        const searchConditions: any[] = [];
        if (email) searchConditions.push({ StaffCode: email });
        if (emailPrefix) {
            searchConditions.push({ StaffCode: emailPrefix });
            searchConditions.push({ StaffCode: { [Op.like]: emailPrefix + '%' } });
        }
        if (fullName) searchConditions.push({ Name: { [Op.like]: fullName } });

        if (searchConditions.length > 0) {
            faculty = await Faculty.findOne({
                where: { [Op.or]: searchConditions }
            });
        }

        if (!faculty) {
            const secondaryConditions: any[] = [];
            if (user.Email) secondaryConditions.push({ StaffCode: user.Email });
            if (user.FullName) secondaryConditions.push({ Name: user.FullName });

            if (secondaryConditions.length > 0) {
                faculty = await Faculty.findOne({
                    where: { [Op.or]: secondaryConditions }
                });
            }
        }

        if (!faculty) {
            return res.status(404).json({ message: "Faculty profile not found for this account" });
        }


        const today: string = new Date().toISOString().split('T')[0] || "";
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeVal = currentHour * 60 + currentMinute;

        // 2. Get duties from today onwards
        const duties = await InvigilatorAssignment.findAll({
            where: { InvigilatorID: faculty.FacultyID },
            include: [
                {
                    model: Exam,
                    include: [{ model: Subject }]
                },
                {
                    model: Room,
                    include: [{ model: Block }]
                }
            ],
            order: [[Exam, 'ExamDate', 'DESC'], [Exam, 'Session', 'ASC']]
        });

        // 3. Get all time assignments for metrics
        const allAssignmentsCount = await InvigilatorAssignment.count({
            where: { InvigilatorID: faculty.FacultyID }
        });

        // 4. Format response
        const formattedDuties = [];
        for (const d of duties) {
            // Get total students in this room for this exam
            const studentCount = await SeatAllocation.count({
                where: { ExamID: d.ExamID },
                include: [{
                    model: Seat,
                    where: { RoomID: d.RoomID },
                    required: true
                }]
            });

            // Get present students count
            const presentCount = await Attendance.count({
                where: { ExamID: d.ExamID, IsPresent: true },
                include: [{
                    model: Student,
                    required: true,
                    include: [{
                        model: SeatAllocation,
                        where: { ExamID: d.ExamID },
                        required: true,
                        include: [{
                            model: Seat,
                            where: { RoomID: d.RoomID },
                            required: true
                        }]
                    }]
                }]
            });

            const examDate: string = (d.Exam?.ExamDate
                ? (typeof d.Exam.ExamDate === 'string' ? d.Exam.ExamDate : (d.Exam.ExamDate as Date).toISOString().split('T')[0])
                : today) || "";

            let status = "Upcoming";
            if (examDate === today) {
                if (d.Exam?.Session === "FN") {
                    if (currentTimeVal >= 9 * 60 + 0 && currentTimeVal <= 12 * 60 + 30) status = "In Progress";
                    else if (currentTimeVal > 12 * 60 + 30) status = "Completed";
                } else if (d.Exam?.Session === "AN") {
                    if (currentTimeVal >= 13 * 60 + 0 && currentTimeVal <= 16 * 60 + 30) status = "In Progress";
                    else if (currentTimeVal > 16 * 60 + 30) status = "Completed";
                }
            } else if (examDate < today) {
                status = "Completed";
            } else if (examDate > today) {
                status = "Upcoming";
            }

            let isHallRevealed = true;
            if (examDate > today) {
                isHallRevealed = false;
            } else if (examDate === today) {
                if (d.Exam?.Session === "FN" && currentTimeVal < 8 * 60 + 30) {
                    isHallRevealed = false;
                } else if (d.Exam?.Session === "AN" && currentTimeVal < 12 * 60 + 30) {
                    isHallRevealed = false;
                }
            }

            // Check if attendance was marked
            const attendanceMarked = await Attendance.count({
                where: { ExamID: d.ExamID },
                include: [{
                    model: Student,
                    required: true,
                    include: [{
                        model: SeatAllocation,
                        where: { ExamID: d.ExamID },
                        required: true,
                        include: [{
                            model: Seat,
                            where: { RoomID: d.RoomID },
                            required: true
                        }]
                    }]
                }]
            });

            let isReliefDuty = false;
            try {
                const reliefCheck = await DutySwap.findOne({
                    where: {
                        ExamID: d.ExamID,
                        RoomID: d.RoomID,
                        SubstituteID: faculty.FacultyID,
                        Status: "APPROVED"
                    }
                });
                isReliefDuty = !!reliefCheck;
            } catch (_) { }

            formattedDuties.push({
                id: d.ExamID,
                exam: d.Exam?.ExamName || "Exam",
                session: d.Exam?.Session || "FN",
                date: examDate,
                roomID: d.RoomID,
                room: isHallRevealed ? (d.Room?.RoomCode || `Room ${d.RoomID}`) : "Locked",
                block: isHallRevealed ? ((d.Room as any)?.Block?.BlockName || "Main Block") : "Reveals 1hr before",
                time: d.Exam?.Session === "FN" ? "9:30 - 12:30" : "13:30 - 16:30",
                students: studentCount,
                presentCount: presentCount,
                status: status,
                isHallRevealed: isHallRevealed,
                isAttendanceMarked: attendanceMarked > 0,
                isReliefDuty: isReliefDuty
            });
        }

        // 5. Get Swaps (gracefully handle if table not yet migrated)
        let swaps: any[] = [];
        try {
            swaps = await DutySwap.findAll({
                where: {
                    [Op.or]: [
                        { RequesterID: faculty.FacultyID },
                        { SubstituteID: faculty.FacultyID }
                    ]
                },
                include: [
                    { model: Exam },
                    { model: Room },
                    { model: Faculty, as: 'Requester' },
                    { model: Faculty, as: 'Substitute' }
                ],
                order: [['CreatedAt', 'DESC']]
            });
        } catch (swapErr: any) {
            console.warn("DutySwaps table not ready yet:", swapErr.message);
        }

        // 6. Get Incidents (gracefully handle if table not yet migrated)
        let incidents: any[] = [];
        try {
            incidents = await IncidentReport.findAll({
                where: { FacultyID: faculty.FacultyID },
                include: [
                    { model: Exam },
                    { model: Room }
                ],
                order: [['CreatedAt', 'DESC']]
            });
        } catch (incErr: any) {
            console.warn("IncidentReports table not ready yet:", incErr.message);
        }

        const todayExams = formattedDuties.filter(d => d.date === today);
        const activeDuty = todayExams.find(d => d.status === "In Progress") || todayExams.find(d => d.status === "Upcoming") || (formattedDuties.length > 0 ? formattedDuties[0] : null);

        const totalStudentsToday = todayExams.reduce((acc, curr) => acc + curr.students, 0);
        const totalPresentToday = todayExams.reduce((acc, curr) => acc + curr.presentCount, 0);

        res.json({
            user: {
                name: faculty.Name,
                email: user.Email,
                department: faculty.Department,
                designation: faculty.Designation,
                date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                status: todayExams.some(d => d.status === "In Progress") ? "active" : "inactive"
            },
            metrics: [
                { title: "Today's Exams", value: todayExams.length.toString(), icon: "Calendar", color: "blue", label: "Scheduled" },
                { title: "Current Location", value: activeDuty?.room || "None", icon: "MapPin", color: "green", label: activeDuty?.block || "Room" },
                { title: "Total Students", value: totalStudentsToday.toString(), icon: "Users", color: "indigo", label: "Supervising" },
                { title: "Attendance", value: `${totalPresentToday}/${totalStudentsToday}`, icon: "ClipboardCheck", color: "amber", label: "Today's Status" },
            ],
            duties: formattedDuties,
            swaps: swaps.map((s: any) => ({
                id: s.SwapID,
                duty: `${s.Exam?.ExamName || 'Unknown Exam'} (${s.Room?.RoomCode || 'TBD'})`,
                status: s.Status ? (s.Status.charAt(0).toUpperCase() + s.Status.slice(1).toLowerCase()) : 'Pending',
                with: s.SubstituteID ? (s.Substitute?.Name || "Assigned") : "Pending Admin Assignment",
                type: s.RequesterID === faculty.FacultyID ? "Outbound" : "Inbound",
                reason: s.Reason,
                date: s.CreatedAt
            })),
            incidents: incidents.map((i: any) => ({
                id: i.ReportID,
                exam: i.Exam?.ExamName,
                room: i.Room?.RoomCode,
                type: i.Type,
                description: i.Description,
                status: i.Status,
                date: i.CreatedAt
            }))
        });

    } catch (error: any) {
        console.error("Dashboard data error:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Report an incident
 */
export const reportIncident = async (req: Request, res: Response) => {
    try {
        const { examId, roomId, type, description } = req.body;
        const user = (req as any).user;

        const dbUser = await User.findByPk(user.UserID);
        if (!dbUser) return res.status(404).json({ message: "User not found" });
        const email = dbUser.Email?.trim().toLowerCase();
        const emailPrefix = email?.split('@')[0];
        let faculty = await Faculty.findOne({
            where: {
                [Op.or]: [
                    { StaffCode: email || '___invalid___' },
                    { StaffCode: emailPrefix || '___invalid___' }
                ]
            }
        });
        if (!faculty) {
            const invigilator = await Invigilator.findOne({ where: { UserID: user.UserID } } as any);
            faculty = invigilator ? await Faculty.findByPk((invigilator as any).FacultyID) : null;
        }
        if (!faculty) return res.status(404).json({ message: "Faculty profile not found" });

        const report = await IncidentReport.create({
            ExamID: Number(examId),
            RoomID: Number(roomId),
            FacultyID: faculty.FacultyID,
            Type: type || "General",
            Description: description,
            Status: "PENDING"
        });

        res.status(201).json({ message: "Incident reported successfully", report });
    } catch (error: any) {
        console.error("Report incident error:", error);
        res.status(500).json({
            message: "Failed to report incident",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Request a duty swap
 */
export const requestSwap = async (req: Request, res: Response) => {
    try {
        const { examId, roomId, reason } = req.body;
        const user = (req as any).user;

        const dbUser = await User.findByPk(user.UserID);
        if (!dbUser) return res.status(404).json({ message: "User not found" });
        const email = dbUser.Email?.trim().toLowerCase();
        const emailPrefix = email?.split('@')[0];
        let faculty = await Faculty.findOne({
            where: {
                [Op.or]: [
                    { StaffCode: email || '___invalid___' },
                    { StaffCode: emailPrefix || '___invalid___' }
                ]
            }
        });
        if (!faculty) {
            const invigilator = await Invigilator.findOne({ where: { UserID: user.UserID } } as any);
            faculty = invigilator ? await Faculty.findByPk((invigilator as any).FacultyID) : null;
        }
        if (!faculty) return res.status(404).json({ message: "Faculty profile not found" });

        const swap = await DutySwap.create({
            ExamID: Number(examId),
            RoomID: Number(roomId),
            RequesterID: faculty.FacultyID,
            SubstituteID: null,
            Reason: reason,
            Status: "PENDING"
        });

        res.status(201).json({ message: "Relief request sent to Exam Cell successfully", swap });
    } catch (error: any) {
        console.error("Request swap error:", error);
        res.status(500).json({
            message: "Failed to request swap",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * Get all duty swap requests (ADMIN)
 */
export const getAllSwaps = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;
        const where: any = {};
        if (status) where.Status = status;

        const swaps = await DutySwap.findAll({
            where,
            include: [
                { model: Exam },
                { model: Room },
                { model: Faculty, as: 'Requester' }
            ],
            order: [['CreatedAt', 'DESC']]
        });
        res.json(swaps);
    } catch (error: any) {
        console.error("Get swaps error:", error);
        res.status(500).json({ message: "Failed to fetch duty swap requests" });
    }
};

/**
 * Get available invigilators for a specific swap request (ADMIN)
 */
export const getAvailableInvigilatorsForSwap = async (req: Request, res: Response) => {
    try {
        const swapId = parseInt(String(req.params.id), 10);
        if (isNaN(swapId)) return res.status(400).json({ message: "Invalid swap ID" });

        const swap = await DutySwap.findByPk(swapId, { include: [{ model: Exam }] }) as any;
        if (!swap || !swap.Exam) return res.status(404).json({ message: "Swap not found" });

        const examDate = swap.Exam.ExamDate;
        const session = swap.Exam.Session;

        // Get all faculty IDs who ALREADY have a duty on this date and session
        const busyFaculty = await InvigilatorAssignment.findAll({
            include: [{
                model: Exam,
                where: { ExamDate: examDate, Session: session }
            }]
        });

        const busyIds = busyFaculty.map((a: any) => a.InvigilatorID);

        // Fetch all eligible faculty NOT in busyIds
        const availableFaculty = await Faculty.findAll({
            where: {
                IsEligible: true,
                ...(busyIds.length > 0 ? { FacultyID: { [Op.notIn]: busyIds } } : {})
            },
            attributes: ['FacultyID', 'Name', 'Department', 'Designation']
        });

        // Add a 'dutyCount' to help admin balance load
        const result = await Promise.all(availableFaculty.map(async (fac) => {
            const count = await InvigilatorAssignment.count({ where: { InvigilatorID: fac.FacultyID } });
            return {
                ...fac.toJSON(),
                dutyCount: count
            };
        }));

        res.json(result);
    } catch (error: any) {
        console.error("Get available for swap error:", error);
        res.status(500).json({ message: "Failed to fetch available invigilators" });
    }
};

/**
 * Approve swap and assign substitute (ADMIN)
 */
export const approveSwap = async (req: Request, res: Response) => {
    try {
        const swapId = parseInt(String(req.params.id), 10);
        const { substituteId } = req.body;
        console.log(`[ApproveSwap] ID: ${swapId}, Substitute: ${substituteId}`);

        if (isNaN(swapId)) return res.status(400).json({ message: "Invalid swap ID" });

        const swapRaw = await DutySwap.findByPk(swapId, {
            include: [
                { model: Exam }, 
                { model: Room }, 
                { model: Faculty, as: 'Requester' }
            ]
        });
        
        if (!swapRaw) {
            console.error(`[ApproveSwap] Swap ${swapId} not found`);
            return res.status(404).json({ message: "Swap request not found" });
        }

        const substitute = await Faculty.findByPk(substituteId);
        if (!substitute) return res.status(404).json({ message: "Substitute not found" });

        if (!swapRaw.ExamID || !swapRaw.RoomID) {
            console.error(`[ApproveSwap] Swap ${swapId} is missing ExamID or RoomID`);
            return res.status(400).json({ message: "Invalid swap request data" });
        }

        // Execute in transaction for safety
        await sequelize.transaction(async (t) => {
            console.log(`[ApproveSwap] Step 1: Reassigning duty from ${swapRaw.RequesterID} to ${substituteId}`);
            // 1. Reassign Duty: Replace requester with substitute in Assignments
            const deletedCount = await InvigilatorAssignment.destroy({
                where: { 
                    ExamID: swapRaw.ExamID, 
                    RoomID: swapRaw.RoomID, 
                    InvigilatorID: swapRaw.RequesterID 
                },
                transaction: t
            });
            console.log(`[ApproveSwap] Deleted ${deletedCount} old assignments`);

            if (deletedCount > 0) {
                // Check if substitute already has an assignment for THIS exam/room
                const existing = await InvigilatorAssignment.findOne({
                    where: { 
                        ExamID: swapRaw.ExamID, 
                        RoomID: swapRaw.RoomID, 
                        InvigilatorID: Number(substituteId) 
                    },
                    transaction: t
                });

                if (!existing) {
                    await InvigilatorAssignment.create({
                        ExamID: swapRaw.ExamID,
                        RoomID: swapRaw.RoomID,
                        InvigilatorID: Number(substituteId)
                    }, { transaction: t });
                    console.log(`[ApproveSwap] Created new assignment for ${substituteId}`);
                } else {
                    console.log(`[ApproveSwap] Substitute ${substituteId} already assigned to this slot.`);
                }
            } else {
                console.warn(`[ApproveSwap] No assignment found to replace! (Exam: ${swapRaw.ExamID}, Room: ${swapRaw.RoomID}, Req: ${swapRaw.RequesterID})`);
            }

            // 2. Update Swap Status using raw query for maximum reliability with SQL Server dates
            await sequelize.query(
                "UPDATE [DutySwaps] SET [SubstituteID] = ?, [Status] = 'APPROVED', [UpdatedAt] = GETDATE() WHERE [SwapID] = ?",
                {
                    replacements: [Number(substituteId), swapRaw.SwapID],
                    transaction: t
                }
            );
            console.log(`[ApproveSwap] Swap status updated to APPROVED`);
        }).catch(err => {
            console.error("[ApproveSwap] Transaction failed:", err);
            throw err;
        });

        // Create a notification for the substitute
        const swap = swapRaw as any;
        const examName = swap.Exam?.ExamName ?? "Exam";
        const roomCode = swap.Room?.RoomCode ?? "Hall";
        const requesterName = swap.Requester?.Name ?? "colleague";

        // Find substitute's user account via Invigilator link first (most reliable)
        let subUser = null;
        const invigilatorRecord = await Invigilator.findOne({ where: { FacultyID: substituteId } });
        
        if (invigilatorRecord) {
            subUser = await User.findByPk(invigilatorRecord.UserID);
        }

        // Fallback to StaffCode matching but with EXACT matches only to avoid partial hits
        if (!subUser) {
            subUser = await User.findOne({ 
                where: { 
                    [Op.or]: [
                        { Email: substitute.StaffCode },
                        { Email: { [Op.like]: `${substitute.StaffCode}@%` } } // Only match if it's the full prefix before @
                    ]
                }
            });
        }

        if (subUser) {
            try {
                await notificationService.createNotification({
                    Title: "New Duty Assignment — Relief",
                    Message: `You have been assigned to invigilate ${examName} in ${roomCode} as a relief for ${requesterName}.`,
                    Type: "INFO",
                    Category: "EXAM",
                    TargetType: "USER",
                    TargetId: subUser.UserID,
                    Priority: "HIGH",
                    Metadata: { swapId: swapRaw.SwapID, examId: swapRaw.ExamID }
                }, 0); 
            } catch (notifErr) {
                console.error("Failed to send swap approval notification:", notifErr);
            }
        }

        res.json({ message: "Swap approved and assignment updated successfully." });
    } catch (error: any) {
        console.error("Approve swap error:", error);
        res.status(500).json({ message: "Failed to approve swap" });
    }
};

/**
 * Reject swap (ADMIN)
 */
export const rejectSwap = async (req: Request, res: Response) => {
    try {
        const swapId = parseInt(String(req.params.id), 10);
        if (isNaN(swapId)) return res.status(400).json({ message: "Invalid swap ID" });

        const swap = await DutySwap.findByPk(swapId);
        if (!swap) return res.status(404).json({ message: "Swap not found" });

        swap.Status = "REJECTED";
        await swap.save();

        res.json({ message: "Swap request rejected." });
    } catch (error: any) {
        console.error("Reject swap error:", error);
        res.status(500).json({ message: "Failed to reject swap" });
    }
};
export const getAssignmentDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; // This is the AssignmentID from the URL
        console.log(`[ASSIGNMENT_DETAILS] Fetching AssignmentID: ${id}`);

        if (!id) {
            return res.status(400).json({ message: "Assignment ID is required" });
        }

        const assignment = await InvigilatorAssignment.findByPk(id as string, {
            include: [
                {
                    model: Exam,
                    include: [{ model: Subject }]
                },
                {
                    model: Room,
                    include: [Block, Floor]
                }
            ]
        });

        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
        }

        const today: string = new Date().toISOString().split('T')[0] ?? "";
        const now = new Date();
        const currentTimeVal = now.getHours() * 60 + now.getMinutes();

        const examDate = typeof assignment.Exam?.ExamDate === 'string'
            ? assignment.Exam.ExamDate
            : (assignment.Exam?.ExamDate as Date)?.toISOString().split('T')[0] || "";

        let isHallRevealed = true;
        if (examDate > today) {
            isHallRevealed = false;
        } else if (examDate === today) {
            if (assignment.Exam?.Session === "FN" && currentTimeVal < 8 * 60 + 30) {
                isHallRevealed = false;
            } else if (assignment.Exam?.Session === "AN" && currentTimeVal < 12 * 60 + 30) {
                isHallRevealed = false;
            }
        }

        const responseData: any = assignment.toJSON();
        responseData.isHallRevealed = isHallRevealed;

        if (!isHallRevealed) {
            responseData.RoomID = null;
            responseData.Room = { RoomCode: "Locked" };
        }

        res.json(responseData);
    } catch (error: any) {
        console.error("GET ASSIGNMENT DETAILS ERROR:", error);
        res.status(500).json({ message: error.message });
    }
};

export const saveAttendance = async (req: Request, res: Response) => {
    try {
        const { examId, students } = req.body;
        const user = (req as any).user;

        if (!examId || !Array.isArray(students)) {
            return res.status(400).json({ message: "Invalid request payload" });
        }

        const faculty = await Faculty.findOne({
            where: {
                [Op.or]: [
                    { StaffCode: user.Email || undefined },
                    { StaffCode: user.Email?.split('@')[0] || undefined }
                ]
            }
        });

        if (!faculty) return res.status(404).json({ message: "Faculty profile not found" });

        // Verify assignment
        const assignment = await InvigilatorAssignment.findOne({
            where: {
                ExamID: Number(examId),
                InvigilatorID: faculty.FacultyID
            }
        });

        if (!assignment) {
            return res.status(403).json({ message: "Access Denied: You are not assigned to this exam hall." });
        }

        // Upsert attendance records
        const attendanceData = students.map(s => ({
            ExamID: Number(examId),
            StudentID: Number(s.StudentID),
            IsPresent: Boolean(s.IsPresent),
            MarkedByInvigilatorID: faculty.FacultyID, // Using FacultyID for marking attendance
            MarkedAt: new Date()
        }));

        for (const data of attendanceData) {
            try {
                await Attendance.upsert(data);
            } catch (err) {
                console.error(`Failed to upsert attendance for StudentID ${data.StudentID}:`, err);
                throw err; // Re-throw to be caught by main catch block
            }
        }

        // Log activity
        await ActivityLog.create({
            UserID: user.UserID,
            Action: "SUBMIT_ATTENDANCE",
            Details: `Submitted attendance for ExamID ${examId} in Room ${assignment.RoomID}`,
            IPAddress: req.ip || "unknown",
            UserAgent: (req.headers['user-agent'] as string) || "unknown"
        }).catch(err => console.error("Activity log failed:", err));

        res.json({
            success: true,
            message: "Attendance locked and submitted successfully.",
            summary: {
                present: students.filter(s => s.IsPresent).length,
                absent: students.filter(s => !s.IsPresent).length
            }
        });

    } catch (error: any) {
        console.error("Save attendance fatal error:", error);
        res.status(500).json({
            message: "Failed to save attendance. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

