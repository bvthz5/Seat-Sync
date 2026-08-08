import { User } from "../models/User.js";
import { AuthService } from "../services/auth.service.js";

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function seedExamsAdmin() {
    try {
        if (!DEFAULT_ADMIN_EMAIL || !DEFAULT_ADMIN_PASSWORD) {
            console.error("[Seeder] ADMIN_EMAIL or ADMIN_PASSWORD is not set in environment variables. Skipping admin seeder.");
            return;
        }

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: {
                Email: DEFAULT_ADMIN_EMAIL
            }
        });

        if (existingAdmin) {
            console.log(`[Seeder] Admin user already exists. Resetting lockout and syncing credentials.`);

            const passwordHash = await AuthService.hashPassword(DEFAULT_ADMIN_PASSWORD);

            // Ensure permissions are correct and reset lockout/failed attempts
            await existingAdmin.update({
                IsRootAdmin: true,
                IsActive: true,
                Role: 'exam_admin',
                PasswordHash: passwordHash, // Forced sync for the root admin
                FailedLoginAttempts: 0,
                AccountLockedUntil: null
            });
            return;
        }

        console.log(`[Seeder] Creating root admin user...`);

        // Hash password
        const passwordHash = await AuthService.hashPassword(DEFAULT_ADMIN_PASSWORD);

        // Create user
        await User.create({
            Email: DEFAULT_ADMIN_EMAIL,
            PasswordHash: passwordHash,
            Role: "exam_admin",
            IsRootAdmin: true,
            IsActive: true,
        });

        console.log("[Seeder] Root Admin created successfully!");
    } catch (error: any) {
        console.error("[Seeder] Error seeding admin:", error.message);
    }
}

export async function seedTestUsers() {
    try {
        console.log(`[Seeder] Creating test users for E2E testing...`);

        // Need to import models
        const { Student } = await import("../models/Student.js");
        const { Invigilator } = await import("../models/Invigilator.js");
        const { Faculty } = await import("../models/Faculty.js");

        // ── STUDENT ──────────────────────────────────────────────────────────
        const studentEmail = "student@sjcetpalai.ac.in";
        const existingStudent = await User.findOne({ where: { Email: studentEmail } });
        if (!existingStudent) {
            const studentPasswordHash = await AuthService.hashPassword("Student@123");
            const user = await User.create({
                Email: studentEmail,
                FullName: "Test Student",
                PasswordHash: studentPasswordHash,
                Role: "student",
                IsRootAdmin: false,
                IsActive: true,
                IsActivated: true,
                IsPasswordChanged: true,
            });
            await Student.create({
                UserID: user.UserID,
                RegisterNumber: "TESTMCA001",
                FullName: "Test Student",
                BatchYear: new Date().getFullYear(),
                Status: "ACTIVE",
            } as any);
            console.log("[Seeder] Test Student created successfully!");
        } else {
            console.log("[Seeder] Test Student already exists, skipping.");
        }

        // ── INVIGILATOR ──────────────────────────────────────────────────────
        // The invigilator dashboard controller resolves the faculty profile by
        // looking up the Faculty table using StaffCode = user email. We must
        // ensure a Faculty row exists with StaffCode matching the email.
        const invigilatorEmail = "invigilator@sjcetpalai.ac.in";
        const existingInvigilator = await User.findOne({ where: { Email: invigilatorEmail } });
        if (!existingInvigilator) {
            const invigilatorPasswordHash = await AuthService.hashPassword("Invigilator@123");
            const user = await User.create({
                Email: invigilatorEmail,
                FullName: "Test Invigilator",
                PasswordHash: invigilatorPasswordHash,
                Role: "invigilator",
                IsRootAdmin: false,
                IsActive: true,
                IsActivated: true,
                IsPasswordChanged: true,
            });
            // Create Invigilator record linked to User
            await Invigilator.create({
                UserID: user.UserID,
                Email: invigilatorEmail,
                Name: "Test Invigilator",
            } as any);
            // Create Faculty record so the invigilator dashboard lookup succeeds.
            // The controller searches Faculty.StaffCode by the user's email.
            const existingFaculty = await Faculty.findOne({ where: { StaffCode: invigilatorEmail } });
            if (!existingFaculty) {
                await Faculty.create({
                    StaffCode: invigilatorEmail,
                    Name: "Test Invigilator",
                    Designation: "Lecturer",
                    Department: "MCA",
                    IsEligible: true,
                });
            }
            console.log("[Seeder] Test Invigilator created successfully!");
        } else {
            // Ensure Faculty row exists even if the User row was created in a prior run
            const existingFaculty = await Faculty.findOne({ where: { StaffCode: invigilatorEmail } });
            if (!existingFaculty) {
                await Faculty.create({
                    StaffCode: invigilatorEmail,
                    Name: "Test Invigilator",
                    Designation: "Lecturer",
                    Department: "MCA",
                    IsEligible: true,
                });
                console.log("[Seeder] Faculty profile added for existing invigilator user.");
            } else {
                console.log("[Seeder] Test Invigilator already exists with Faculty profile, skipping.");
            }
        }
    } catch (error: any) {
        console.error("[Seeder] Error seeding test users:", error.message);
    }
}
