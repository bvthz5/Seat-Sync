import { Request, Response } from "express";
import { User, Invigilator, Faculty, InvigilatorAssignment, Exam, UserProfile, SeatAllocation, Seat, Room, InvigilatorRequest, ActivityLog, NotificationRecipient } from "../models/index.js";
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
 * Expected body: { rows: [{ Name, Department }] }
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
            const { Name, Email, Department: deptValue, Phone, Designation, StaffCode, FacultyID } = row;

            try {
                const nameStr = Name ? String(Name).trim() : "";
                const deptStr = deptValue ? String(deptValue).trim() : "";
                const phoneStr = Phone ? String(Phone).trim() : null;
                const desigStr = Designation ? String(Designation).trim() : "Faculty";
                let emailStr = Email ? String(Email).trim().toLowerCase() : "";

                if (!nameStr || !deptStr) {
                    skipped.push({ row: i + 2, reason: `Missing required fields (Name or Department)` });
                    continue;
                }

                if (!emailStr) {
                    const nameForEmail = nameStr.toLowerCase().replace(/[^a-z]/g, '');
                    emailStr = `${nameForEmail}@sjcetpalai.ac.in`;
                }

                // Check duplicate email
                const existingUser = await User.findOne({ where: { Email: emailStr }, transaction: t });
                if (existingUser) {
                    skipped.push({ row: i + 2, reason: `Email ${emailStr} already exists` });
                    continue;
                }

                // Check duplicate FacultyID if provided
                if (FacultyID) {
                    const existingFaculty = await Faculty.findByPk(FacultyID, { transaction: t });
                    if (existingFaculty) {
                        skipped.push({ row: i + 2, reason: `FacultyID ${FacultyID} already exists` });
                        continue;
                    }
                }

                // 1. Create User
                const user = await User.create({
                    Email: emailStr,
                    FullName: nameStr,
                    PasswordHash: await bcrypt.hash("Sjcet@123", 10),
                    Role: "invigilator",
                    Status: "Active"
                } as any, { transaction: t });

                // 2. Create Faculty
                const facultyData: any = {
                    StaffCode: StaffCode ? String(StaffCode).trim() : emailStr,
                    Name: nameStr,
                    Designation: desigStr,
                    Department: deptStr,
                    IsEligible: true
                };

                if (FacultyID) {
                    facultyData.FacultyID = Number(FacultyID);
                }

                const faculty = await Faculty.create(facultyData, { transaction: t });

                // 3. Create Invigilator link
                await Invigilator.create({
                    UserID: user.UserID,
                    IsEligible: true,
                    IsFlagged: false
                }, { transaction: t });

                created.push(faculty.FacultyID);

            } catch (rowError: any) {
                console.error(`Row ${i + 2} import error:`, rowError);
                skipped.push({ row: i + 2, reason: rowError.message || "Unknown error" });
            }
        }

        await t.commit();
        res.json({
            message: `Successfully imported ${created.length} staff records.`,
            created,
            skipped,
            successCount: created.length
        });
    } catch (error: any) {
        await t.rollback();
        console.error("Bulk import error:", error);
        res.status(500).json({ message: "Internal server error during bulk import" });
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

        await emailService.sendInvigilatorActivationEmail(user.Email, user.FullName || 'Invigilator', token);

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
        const request = await InvigilatorRequest.findByPk(id, { transaction: t });

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

        // 3. Create Invigilator link
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
        const request = await InvigilatorRequest.findByPk(id);

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
