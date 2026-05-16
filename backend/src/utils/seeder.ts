import { User } from "../models/User.js";
import { AuthService } from "../services/auth.service.js";

const DEFAULT_ADMIN_EMAIL = "root.seatsync@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

export async function seedExamsAdmin() {
    try {
        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: {
                Email: DEFAULT_ADMIN_EMAIL
            }
        });

        if (existingAdmin) {
            console.log(`[Seeder] Admin user ${DEFAULT_ADMIN_EMAIL} already exists. Resetting lockout and syncing credentials.`);

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

        console.log(`[Seeder] Creating root admin user: ${DEFAULT_ADMIN_EMAIL}...`);

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
