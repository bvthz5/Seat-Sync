import { User } from "../models/User.js";
import { sequelize } from "../config/database.js";
import { AuthService } from "../services/auth.service.js";

const DEFAULT_ADMIN_EMAIL = "root.seatsync@gmail.com"
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

async function seedAdmin() {
    try {
        // Connect to database
        await sequelize.authenticate();
        console.log("Database connection established successfully.");

        // Sync models (optional, usually handled by migrations or server startup)
        // await User.sync({ alter: true });

        // Check if admin already exists
        const existingAdmin = await User.findOne({
            where: {
                Email: DEFAULT_ADMIN_EMAIL
            }
        });

        if (existingAdmin) {
            console.log(`Admin user ${DEFAULT_ADMIN_EMAIL} already exists.`);

            // Optional: Update to ensure they have root privileges if existing
            if (!existingAdmin.IsRootAdmin || !existingAdmin.IsActive || existingAdmin.Role !== 'exam_admin') {
                console.log("Updating existing admin privileges...");
                await existingAdmin.update({
                    IsRootAdmin: true,
                    IsActive: true,
                    Role: 'exam_admin'
                });
                console.log("Admin privileges updated.");
            }

            return;
        }

        console.log(`Creating root admin user: ${DEFAULT_ADMIN_EMAIL}...`);

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

        console.log("Root Admin created successfully!");
        console.log("------------------------------------------------");
        console.log(`Email:    ${DEFAULT_ADMIN_EMAIL}`);
        console.log("------------------------------------------------");

    } catch (error: any) {
        console.error("Error seeding admin:", error.message);
    } finally {
        // Close connection
        await sequelize.close();
    }
}

seedAdmin();
